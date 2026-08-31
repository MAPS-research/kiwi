import { Injectable, Logger } from '@nestjs/common';
import { ClassAnalyticsService } from '../../analytics/class-analytics.service';
import { DatabaseService } from '../database/database.service';
import { McpClientService } from '../mcp/mcp-client.service';
import { McpConnectionManagerService } from '../mcp/mcp-connection-manager.service';
import { McpOAuthService } from '../mcp/mcp-oauth.service';
import {
  Tool,
  ToolDefinition,
  ToolSource,
  ToolExecutionContext,
  ToolExecutionResult,
} from './tool.interface';
import { CLIENT_TOOL_NAMES } from './client-tools';

/**
 * Tool Registry Service
 *
 * Central registry for all tools available to the LLM in chat sessions.
 * Manages both built-in tools (RAG, Code Interpreter) and MCP tools.
 *
 * Responsibilities:
 * - Load tools based on class configuration
 * - Filter tools by chat type (pdf vs codegen)
 * - Handle tool enable/disable per class
 * - Convert MCP tool definitions to OpenAI format
 * - Route tool execution to appropriate handlers
 *
 * Usage:
 * 1. getToolsForClass(classId, chatType) - Get enabled tools for a class
 * 2. executeTool(toolId, args, context) - Execute a tool call from LLM
 */
@Injectable()
export class ToolRegistryService {
  private readonly logger = new Logger(ToolRegistryService.name);

  // Built-in tool definitions
  private readonly builtInTools: Map<string, ToolDefinition> = new Map();

  constructor(
    private prisma: DatabaseService,
    private mcpClient: McpClientService,
    private mcpConnectionManager: McpConnectionManagerService,
    private mcpOAuth: McpOAuthService,
    private classAnalytics: ClassAnalyticsService,
  ) {
    this.registerBuiltInTools();
  }

  /**
   * Instructor/admin-only tool. Deliberately NOT in builtInTools: it is
   * appended in getToolsForClass only after a per-user permission check, and
   * executeTool re-verifies before running (never trust the tool list alone).
   */
  private readonly classAnalyticsToolDef: ToolDefinition = {
    type: 'function',
    function: {
      name: 'class-analytics',
      description: `Look up analytics about how students in this class use the AI assistant. Only available to instructors and admins.

USE THIS TOOL WHEN the instructor asks about class activity, e.g.:
- "What are students asking about?" / "What topics confuse students?" → section "topics"
- "Are students trying to get answers or to learn?" / intent of questions → section "intents"
- "How active is the class?" / question counts, weekly trend → section "overview"
- "Which students are most/least active?" → section "students" (students are anonymized as Student 1, 2, …)
- "Which pages/slides get the most questions?" → section "pages"
- "Show me the questions about <topic>" → section "topic_questions" with topicId from a prior "topics" call
- "Show me the answer-seeking questions" → section "intent_questions" with intentId from a prior "intents" call
- "What did students ask recently?" → section "recent_questions"

Pass lectureId (a pdfId from "overview") to scope any section to one lecture.`,
      parameters: {
        type: 'object',
        properties: {
          section: {
            type: 'string',
            enum: [
              'overview',
              'topics',
              'intents',
              'students',
              'pages',
              'topic_questions',
              'intent_questions',
              'recent_questions',
            ],
            description: 'Which analytics view to fetch',
          },
          lectureId: {
            type: 'string',
            description:
              'Optional pdfId to scope results to one lecture (from the "overview" section)',
          },
          topicId: {
            type: 'string',
            description: 'Required for section "topic_questions"',
          },
          intentId: {
            type: 'string',
            description:
              'Required for section "intent_questions" (e.g. "answer-seeking", "concept", "guidance")',
          },
        },
        required: ['section'],
      },
    },
  };

  /**
   * Register built-in tool definitions
   */
  private registerBuiltInTools(): void {
    // RAG Tool - Enhanced description with explicit triggers
    this.builtInTools.set('rag', {
      type: 'function',
      function: {
        name: 'rag',
        description: `Search course materials for relevant information.

USE THIS TOOL WHEN:
- Student asks about specific course topics, concepts, or content
- Student needs clarification on lecture material
- Student references slides, materials, or readings
- Student asks "what does the lecture say about..."
- Student asks what is ON the current page/worksheet/slide (e.g. "extract the code on this page") and the injected page context doesn't already contain it — code PRINTED in course materials is a rag question (use scope "current_page")
- You need to cite course-specific information

DO NOT USE WHEN:
- Student asks general programming questions not tied to course content
- Student is asking about code THEY WROTE in the editor or an app — that code is provided in the App-Provided Context / code context; answer from it directly
- You can answer from recent conversation context`,
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query - be specific and include key terms from the student question',
            },
            scope: {
              type: 'string',
              enum: ['current_page', 'course'],
              description:
                'Where to search: "current_page" restricts to the page of the document the student is currently viewing (use for "what is on this page" questions); "course" (default) searches all class materials',
            },
          },
          required: ['query'],
        },
      },
    });

    // Code Interpreter Tool - Enhanced description
    this.builtInTools.set('code-interpreter', {
      type: 'function',
      function: {
        name: 'code-interpreter',
        description: `Help with programming questions, debugging, or code generation.

USE THIS TOOL WHEN:
- Student has a coding question or error
- Student needs help debugging
- Student asks for code examples or explanations
- There's an error message or traceback to analyze`,
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Description of what help is needed',
            },
            code: {
              type: 'string',
              description: 'Student code snippet (if applicable)',
            },
            error: {
              type: 'string',
              description: 'Error message or traceback (if applicable)',
            },
            generate_code: {
              type: 'boolean',
              description:
                'Whether to generate complete code (true) or provide hints only (false)',
            },
          },
          required: ['query'],
        },
      },
    });

    // In-class content navigation (materials / exercises / apps).
    //
    // NOT named 'navigate': that is a CLIENT tool (browser-side, destination +
    // path based). Both were being merged into one tool list, so the model saw
    // two different schemas under one name — and since client tools win at
    // dispatch, a call shaped for THIS tool was routed to the browser, which
    // rejected it with "Provide a destination or path" and sent the agent back
    // to re-read the sitemap.
    this.builtInTools.set('open_material', {
      type: 'function',
      function: {
        name: 'open_material',
        description: `Open a specific piece of class content for the student: a material/PDF page, an exercise, or a Kiwi App. This moves WITHIN the current class workspace — it does not change pages in the wider app (for that, the site-control tool 'navigate' is used instead).

USE THIS TOOL WHEN:
- Student asks to see specific materials (e.g., "show me lecture 5", "take me to the recursion slides")
- Student asks where to find something ("where can I find the practice problems?")
- Student wants to go to an exercise or problem ("I want to try problem 3")
- You recommend viewing specific content ("you should check the lecture notes on this")
- Student mentions wanting to practice or do exercises

EXAMPLES:
- "show me the recursion lecture" -> navigate to materials tab with specific PDF
- "I want to try problem 3" -> navigate to exercises tab with specific problem
- "give me an exercise" -> navigate to exercises tab
- "where are the practice problems?" -> navigate to exercises tab`,
        parameters: {
          type: 'object',
          properties: {
            targetTab: {
              type: 'string',
              enum: ['materials', 'exercises', 'chat', 'dashboard', 'app'],
              description: 'The tab to navigate to',
            },
            pdfId: {
              type: 'string',
              description: 'PDF document ID (for materials tab navigation)',
            },
            pageNumber: {
              type: 'number',
              description: 'Page number within the PDF (for materials tab)',
            },
            exerciseId: {
              type: 'string',
              description: 'Exercise/problem ID (for exercises tab navigation)',
            },
            exerciseSetId: {
              type: 'string',
              description: 'Exercise set ID (for exercises tab navigation)',
            },
            appSlug: {
              type: 'string',
              description: 'App slug (for app tab navigation)',
            },
            reason: {
              type: 'string',
              description: 'Brief explanation for why this navigation is suggested',
            },
          },
          required: ['targetTab'],
        },
      },
    });
  }

  /**
   * Get all enabled tools for a class and chat type
   *
   * @param classId Class ID (optional - if null, returns no tools)
   * @param chatType Chat type: 'pdf' or 'codegen'
   * @param userId User ID (for MCP OAuth connections)
   * @returns Array of tool definitions for OpenAI API
   */
  async getToolsForClass(
    classId: string | undefined,
    chatType: 'pdf' | 'codegen',
    userId: string,
  ): Promise<ToolDefinition[]> {
    if (!classId) {
      return [];
    }

    try {
      // Load tool configurations for optional disable/filtering
      const toolConfigs = await this.prisma.classToolConfig.findMany({
        where: { classId },
      });

      // Create a map for quick lookup of configs by toolType:toolIdentifier
      const configMap = new Map(
        toolConfigs.map((c) => [`${c.toolType}:${c.toolIdentifier}`, c]),
      );

      const tools: ToolDefinition[] = [];

      // Built-in tools are enabled by default for all classes
      // Database records can disable them or restrict by chatType
      // Identifiers a ClassToolConfig row may have been written against before a
      // tool was renamed, so an existing disable/chatType rule keeps applying.
      const LEGACY_IDENTIFIERS: Record<string, string> = {
        open_material: 'navigate',
      };

      for (const [identifier, toolDef] of this.builtInTools) {
        const toolType = identifier === 'rag' ? 'RAG' : 'CodeInterpreter';
        const legacyIdentifier = LEGACY_IDENTIFIERS[identifier];
        const config =
          configMap.get(`${toolType}:${identifier}`) ??
          (legacyIdentifier
            ? configMap.get(`${toolType}:${legacyIdentifier}`)
            : undefined);

        // Skip if explicitly disabled via database config
        if (config && !config.isEnabled) {
          continue;
        }

        // Apply chatType filtering if configured
        if (config) {
          const chatTypes = config.chatTypes as string[];
          if (chatTypes.length > 0 && !chatTypes.includes(chatType)) {
            continue;
          }
        }

        tools.push(toolDef);
      }

      // MCP tools - Load from ClassMcpServer assignments directly.
      // `priority` alone leaves equal-priority assignments in whatever order
      // Postgres returns them, and the engine hashes the `tools` array as part
      // of the cached prefix — a reshuffle is a full prompt-cache miss even
      // when the messages are byte-identical. The id tiebreak pins the order.
      const mcpAssignments = await this.prisma.classMcpServer.findMany({
        where: { classId, isEnabled: true },
        include: { mcpServer: true },
        orderBy: [{ priority: 'desc' }, { id: 'asc' }],
      });

      for (const assignment of mcpAssignments) {
        const mcpServer = assignment.mcpServer;

        // Skip if global server is not active
        if (!mcpServer.isActive) {
          continue;
        }

        // Check if disabled via ClassToolConfig override
        const config = configMap.get(`MCP:${assignment.id}`);
        if (config && !config.isEnabled) {
          continue;
        }

        // Apply chatType filtering if configured via ClassToolConfig
        if (config) {
          const chatTypes = config.chatTypes as string[];
          if (chatTypes.length > 0 && !chatTypes.includes(chatType)) {
            continue;
          }
        }

        try {
          const mcpTools = await this.getMcpTools(mcpServer, userId);
          tools.push(...mcpTools);
        } catch (error) {
          // Reached only when McpClientService has no last-good list to fall
          // back on. Dropping a server's tools mid-conversation silently
          // changes the agent's capabilities *and* invalidates the cached
          // prefix, so it is logged as a tool-list change, not a warning.
          this.logger.error(
            `Failed to load MCP tools from server ${mcpServer.name} and no ` +
              `cached list was available — its tools are missing from this turn:`,
            error,
          );
          // Continue with other tools
        }
      }

      // Class analytics — appended only for instructors/admins of this class
      if (await this.canViewClassAnalytics(userId, classId)) {
        tools.push(this.classAnalyticsToolDef);
      }

      this.logger.log(
        `Loaded ${tools.length} tools for class ${classId}, chat type ${chatType}`,
      );

      return tools;
    } catch (error) {
      this.logger.error(
        `Error loading tools for class ${classId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Get detailed tool information for a class (for UI display)
   * Built-in tools are included by default, database records can disable/configure them
   */
  async getToolDetailsForClass(
    classId: string,
    userId: string,
  ): Promise<Tool[]> {
    // Load tool configurations for optional disable/filtering
    const toolConfigs = await this.prisma.classToolConfig.findMany({
      where: { classId },
    });

    // Create a map for quick lookup of configs
    const configMap = new Map(
      toolConfigs.map((c) => [`${c.toolType}:${c.toolIdentifier}`, c]),
    );

    const tools: Tool[] = [];

    // Built-in tools are enabled by default
    for (const [identifier, toolDef] of this.builtInTools) {
      const toolType = identifier === 'rag' ? 'RAG' : 'CodeInterpreter';
      const config = configMap.get(`${toolType}:${identifier}`);

      tools.push({
        id: config?.id ?? `builtin:${identifier}`,
        source: toolType === 'RAG' ? ToolSource.RAG : ToolSource.CODE_INTERPRETER,
        definition: toolDef,
        isEnabled: config?.isEnabled ?? true,
        priority: config?.priority ?? 0,
        configuration: config?.configuration as any,
      });
    }

    // MCP tools - Load from ClassMcpServer assignments directly
    const mcpAssignments = await this.prisma.classMcpServer.findMany({
      where: { classId, isEnabled: true },
      include: { mcpServer: true },
      orderBy: { priority: 'desc' },
    });

    for (const assignment of mcpAssignments) {
      const mcpServer = assignment.mcpServer;

      // Skip if global server is not active
      if (!mcpServer.isActive) {
        continue;
      }

      // Check if disabled via ClassToolConfig override
      const config = configMap.get(`MCP:${assignment.id}`);

      try {
        const mcpTools = await this.getMcpTools(mcpServer, userId);

        for (const mcpTool of mcpTools) {
          tools.push({
            id: `${assignment.id}:${mcpTool.function.name}`,
            source: ToolSource.MCP,
            definition: mcpTool,
            mcpServerId: mcpServer.id,
            isEnabled: config?.isEnabled ?? true,
            priority: config?.priority ?? assignment.priority,
            configuration: config?.configuration as any,
          });
        }
      } catch (error) {
        this.logger.warn(`Failed to load MCP tools from ${mcpServer.name}`);
      }
    }

    return tools;
  }

  /**
   * Load tools from an MCP server and convert to OpenAI format
   */
  private async getMcpTools(
    mcpServer: any,
    userId: string,
  ): Promise<ToolDefinition[]> {
    // Get access token if server requires OAuth
    let accessToken: string | undefined;
    if (mcpServer.requiresOAuth) {
      const connection = await this.mcpConnectionManager.getConnection(
        userId,
        mcpServer.id,
      );

      if (!connection) {
        this.logger.warn(
          `User ${userId} not connected to MCP server ${mcpServer.name}`,
        );
        return [];
      }

      accessToken = connection.accessToken;
    }

    // List tools from MCP server
    const mcpTools = await this.mcpClient.listTools(mcpServer, accessToken);

    // Convert MCP tools to OpenAI format. Sorted by name because an MCP server
    // gives no ordering guarantee across calls or replicas, and tool order is
    // part of the engine's cached prefix.
    // Codepoint order, not localeCompare: the latter depends on the process
    // locale, which is exactly the kind of per-replica disagreement being
    // removed here.
    return mcpTools
      .map((tool) => this.convertMcpToolToOpenAI(tool))
      .sort((a, b) =>
        a.function.name < b.function.name
          ? -1
          : a.function.name > b.function.name
            ? 1
            : 0,
      );
  }

  /**
   * Convert MCP tool definition to OpenAI function calling format
   */
  private convertMcpToolToOpenAI(mcpTool: any): ToolDefinition {
    return {
      type: 'function',
      function: {
        name: mcpTool.name,
        description: mcpTool.description || `MCP tool: ${mcpTool.name}`,
        parameters: mcpTool.inputSchema || {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    };
  }

  /**
   * Execute a tool call
   * Routes to appropriate handler based on tool type
   */
  async executeTool(
    toolName: string,
    args: Record<string, any>,
    context: ToolExecutionContext,
    toolExecutor: any, // StudentService methods for built-in tools
  ): Promise<ToolExecutionResult> {
    try {
      // Client-side tools are executed in the browser, not on the server.
      // Return a clientAction directive instead of running any server logic.
      if (CLIENT_TOOL_NAMES.has(toolName)) {
        return {
          success: true,
          output: 'dispatched-to-client',
          clientAction: {
            tool: toolName,
            args: args as Record<string, unknown>,
          },
        };
      }

      // Check if this is a built-in tool
      if (toolName === 'rag') {
        return await this.executeBuiltInTool(
          'rag',
          args,
          context,
          toolExecutor,
        );
      }

      if (toolName === 'code-interpreter') {
        return await this.executeBuiltInTool(
          'code-interpreter',
          args,
          context,
          toolExecutor,
        );
      }

      if (toolName === 'open_material') {
        return this.executeNavigateTool(args);
      }

      if (toolName === 'class-analytics') {
        return await this.executeClassAnalyticsTool(args, context);
      }

      // Otherwise, it's an MCP tool
      return await this.executeMcpTool(toolName, args, context);
    } catch (error) {
      this.logger.error(`Tool execution failed for ${toolName}:`, error);
      return {
        success: false,
        output: null,
        error: error.message,
      };
    }
  }

  /**
   * Whether this user may see class analytics for this class. Mirrors
   * AnalyticsAccessGuard: admins always; instructors need an active
   * InstructorClass assignment with canViewAnalytics; professors need a
   * 'professor' enrollment in the class.
   */
  private async canViewClassAnalytics(
    userId: string,
    classId: string | undefined,
  ): Promise<boolean> {
    if (!classId || !userId) return false;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { systemRole: true },
      });
      if (!user) return false;
      if (user.systemRole === 'admin') return true;

      if (user.systemRole === 'instructor') {
        const assignment = await this.prisma.instructorClass.findUnique({
          where: { userId_classId: { userId, classId } },
        });
        if (!assignment?.isActive) return false;
        return (assignment.permissions as any)?.canViewAnalytics === true;
      }

      const professorEnrollment = await this.prisma.enrollment.findFirst({
        where: { userId, classId, role: 'professor' },
        select: { userId: true },
      });
      return !!professorEnrollment;
    } catch (error) {
      this.logger.error('canViewClassAnalytics check failed:', error);
      return false;
    }
  }

  /**
   * Execute the class-analytics tool. Re-checks authorization — the tool
   * list filter alone is not a security boundary.
   */
  private async executeClassAnalyticsTool(
    args: Record<string, any>,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    const { userId, classId } = context;

    if (!(await this.canViewClassAnalytics(userId, classId))) {
      return {
        success: false,
        output: null,
        error:
          'Not authorized: class analytics is only available to instructors and admins of this class.',
      };
    }

    const section = String(args.section ?? '');
    const lectureId =
      typeof args.lectureId === 'string' && args.lectureId
        ? args.lectureId
        : undefined;

    const cid = classId as string;
    const truncate = (s: string, n = 240) =>
      s.length > n ? `${s.slice(0, n)}…` : s;

    try {
      let payload: unknown;

      switch (section) {
        case 'overview': {
          const overview = await this.classAnalytics.getOverview(cid);
          payload = {
            ...overview,
            lectures: overview.lectures.slice(0, 40),
          };
          break;
        }
        case 'topics':
        case 'intents': {
          const result = await this.classAnalytics.getTopics(cid, lectureId);
          payload =
            section === 'topics'
              ? {
                  status: result.status,
                  generating: result.generating,
                  updatedAt: result.updatedAt,
                  topics: result.topics.slice(0, 40),
                }
              : {
                  status: result.status,
                  generating: result.generating,
                  updatedAt: result.updatedAt,
                  intents: result.intents,
                };
          break;
        }
        case 'students': {
          const groups = await this.classAnalytics.getChatGroups(
            cid,
            'student',
            lectureId,
          );
          payload = { ...groups, groups: groups.groups.slice(0, 60) };
          break;
        }
        case 'pages': {
          const groups = await this.classAnalytics.getChatGroups(
            cid,
            'page',
            lectureId,
          );
          payload = { ...groups, groups: groups.groups.slice(0, 60) };
          break;
        }
        case 'topic_questions': {
          if (!args.topicId) {
            return {
              success: false,
              output: null,
              error: 'topicId is required for section "topic_questions"',
            };
          }
          const result = await this.classAnalytics.getTopicQuestions(
            cid,
            String(args.topicId),
            lectureId,
            25,
          );
          payload = {
            ...result,
            questions: result.questions.slice(0, 25).map((q) => ({
              ...q,
              question: truncate(q.question),
            })),
          };
          break;
        }
        case 'intent_questions': {
          if (!args.intentId) {
            return {
              success: false,
              output: null,
              error: 'intentId is required for section "intent_questions"',
            };
          }
          const result = await this.classAnalytics.getIntentQuestions(
            cid,
            String(args.intentId),
            lectureId,
            25,
          );
          payload = {
            ...result,
            questions: result.questions.slice(0, 25).map((q) => ({
              ...q,
              question: truncate(q.question),
            })),
          };
          break;
        }
        case 'recent_questions': {
          const result = await this.classAnalytics.getChats(cid, {
            lectureId,
            limit: 25,
            order: 'desc',
          });
          payload = {
            total: result.total,
            chats: result.chats.map((c) => ({
              student: c.student,
              question: truncate(c.question),
              pdfId: c.pdfId,
              pdfPage: c.pdfPage,
              timestamp: c.timestamp,
            })),
          };
          break;
        }
        default:
          return {
            success: false,
            output: null,
            error: `Unknown section "${section}". Valid sections: overview, topics, intents, students, pages, topic_questions, intent_questions, recent_questions.`,
          };
      }

      return { success: true, output: JSON.stringify(payload) };
    } catch (error: any) {
      this.logger.error('class-analytics tool failed:', error);
      return {
        success: false,
        output: null,
        error: error?.message ?? 'Failed to fetch class analytics',
      };
    }
  }

  /**
   * Execute the navigate tool
   * Returns a navigation action that the frontend will handle
   */
  private executeNavigateTool(args: Record<string, any>): ToolExecutionResult {
    const { targetTab, pdfId, pageNumber, exerciseId, exerciseSetId, appSlug, reason } = args;

    const navigationAction = {
      type: 'navigate' as const,
      targetTab,
      pdfId,
      pageNumber,
      exerciseId,
      exerciseSetId,
      appSlug,
      reason,
    };

    // Build a human-readable message for the LLM context
    let message = `Navigating to ${targetTab}`;
    if (pdfId) message += ` (document: ${pdfId}${pageNumber ? `, page ${pageNumber}` : ''})`;
    if (exerciseId) message += ` (exercise: ${exerciseId})`;
    if (exerciseSetId && !exerciseId) message += ` (exercise set: ${exerciseSetId})`;
    if (appSlug) message += ` (app: ${appSlug})`;
    if (reason) message += ` - ${reason}`;

    return {
      success: true,
      output: message,
      metadata: {
        navigation: navigationAction,
      },
    };
  }

  /**
   * Execute a built-in tool (RAG or Code Interpreter)
   */
  private async executeBuiltInTool(
    toolName: string,
    args: Record<string, any>,
    context: ToolExecutionContext,
    toolExecutor: any,
  ): Promise<ToolExecutionResult> {
    try {
      let output: any;

      if (toolName === 'rag') {
        // Retrieval-only: return the retrieved chunks as text for the agent
        // to compose from. The legacy ragTool fires a nested LLM stream —
        // stringifying that into a tool message hands the model junk and
        // wastes the nested LLM call.
        const sc = context.studentContext ?? {};
        // scope "current_page": restrict retrieval to the document/page the
        // student is viewing. Only possible when the request carried a pdf
        // context; otherwise fall back to a course-wide search.
        const pageScope =
          args.scope === 'current_page' && (sc as any).pdfId
            ? {
                documentId: (sc as any).pdfId,
                pageNumber:
                  (sc as any).pdfPage ?? (sc as any).pageNumber,
              }
            : undefined;
        output = await toolExecutor.ragRetrieve(
          args.query,
          context.classId,
          sc.engineChoice,
          pageScope,
        );
      } else if (toolName === 'code-interpreter') {
        output = await toolExecutor.codeInterpreterTool(
          args.query,
          args.code,
          args.error,
          args.generate_code,
        );
      } else {
        throw new Error(`Unknown built-in tool: ${toolName}`);
      }

      return {
        success: true,
        output,
      };
    } catch (error) {
      // Log the actual throw. Folding it silently into `error.message` is what
      // made #212 expensive to diagnose: the model only saw `success:false` and
      // improvised "the RAG tool is having an issue", so a signature mismatch
      // looked like flaky embedding infrastructure for hours.
      this.logger.error(
        `Built-in tool "${toolName}" threw for class ${context.classId ?? '(none)'}: ` +
          `${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return {
        success: false,
        output: null,
        error: error.message,
      };
    }
  }

  /**
   * Execute an MCP tool
   */
  private async executeMcpTool(
    toolName: string,
    args: Record<string, any>,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    if (!context.classId) {
      throw new Error('Class ID required for MCP tool execution');
    }

    // Find which MCP server provides this tool
    const toolConfig = await this.findMcpToolConfig(
      context.classId,
      toolName,
      context.userId,
    );

    if (!toolConfig || !toolConfig.mcpServer) {
      throw new Error(`MCP tool ${toolName} not found in class configuration`);
    }

    // Get access token if needed
    let accessToken: string | undefined;
    if (toolConfig.mcpServer.requiresOAuth) {
      const connection = await this.mcpConnectionManager.getConnection(
        context.userId,
        toolConfig.mcpServer.id,
      );

      if (!connection) {
        // Return structured OAuth response instead of throwing
        const authorizationUrl = this.generateOAuthUrl(
          context.userId,
          toolConfig.mcpServer,
        );

        return {
          success: false,
          output: null,
          error: `OAuth authorization required for MCP server ${toolConfig.mcpServer.name}`,
          oauthRequired: true,
          oauthDetails: {
            serverId: toolConfig.mcpServer.id,
            serverName: toolConfig.mcpServer.name,
            toolName: toolName,
            authorizationUrl: authorizationUrl,
          },
        };
      }

      accessToken = connection.accessToken;
    }

    // Call the MCP tool
    const result = await this.mcpClient.callTool(
      toolConfig.mcpServer,
      toolName,
      args,
      accessToken,
    );

    return {
      success: true,
      output: result.content || result,
      metadata: {
        serverId: toolConfig.mcpServer.id,
        serverName: toolConfig.mcpServer.name,
      },
    };
  }

  /**
   * Find which MCP server provides a specific tool
   * Returns the assignment with mcpServer for access
   * @param classId Class ID to search in
   * @param toolName Name of the tool to find
   * @param userId User ID for OAuth-protected servers
   */
  private async findMcpToolConfig(
    classId: string,
    toolName: string,
    userId: string,
  ): Promise<any> {
    // Load MCP server assignments directly from ClassMcpServer
    const mcpAssignments = await this.prisma.classMcpServer.findMany({
      where: { classId, isEnabled: true },
      include: { mcpServer: true },
    });

    for (const assignment of mcpAssignments) {
      const mcpServer = assignment.mcpServer;
      if (!mcpServer.isActive) continue;

      try {
        // Get access token if server requires OAuth
        let accessToken: string | undefined;
        if (mcpServer.requiresOAuth) {
          const connection = await this.mcpConnectionManager.getConnection(
            userId,
            mcpServer.id,
          );
          if (!connection) continue; // Skip if not connected
          accessToken = connection.accessToken;
        }

        const tools = await this.mcpClient.listTools(mcpServer, accessToken);
        const hasTool = tools.some((t) => t.name === toolName);
        if (hasTool) {
          // Return the assignment with mcpServer at the expected location
          return {
            ...assignment,
            mcpServer: mcpServer,
          };
        }
      } catch (error) {
        this.logger.warn(
          `Failed to check tools from server ${mcpServer.name}`,
        );
      }
    }

    return null;
  }

  /**
   * Generate OAuth authorization URL for a user and MCP server
   *
   * @param userId User ID initiating the authorization
   * @param mcpServer MCP server configuration with OAuth metadata
   * @returns Authorization URL string, or empty string if OAuth not configured
   */
  private generateOAuthUrl(userId: string, mcpServer: any): string {
    const oauthMetadata = mcpServer.oauthMetadata as any;

    if (!oauthMetadata?.authorizationUrl || !oauthMetadata?.clientId) {
      this.logger.error(
        `MCP server ${mcpServer.name} has incomplete OAuth configuration`,
      );
      return '';
    }

    const result = this.mcpOAuth.initiateAuthorization(
      {
        authorizationUrl: oauthMetadata.authorizationUrl,
        clientId: oauthMetadata.clientId,
        scopes: oauthMetadata.scopes,
        redirectUri: oauthMetadata.redirectUri || this.mcpOAuth.getRedirectUri(),
      },
      userId,
      mcpServer.id,
    );

    return result.authorizationUrl;
  }
}
