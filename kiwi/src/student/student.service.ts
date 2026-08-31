import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { JsonObject } from '@prisma/client/runtime/library';
import {
  ChatCompletionChunk,
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ClassService } from 'src/class/class.service';
import { ChatService } from 'src/common/chat/chat.service';
import { UserSessionService } from 'src/common/database/user-session.service';
import { UserService } from 'src/common/database/user.service';
import {
  UserInteractionService,
  UserInteractionWithAction,
} from 'src/common/database/user-interaction.service';
import { LlmService } from 'src/common/llm/llm.service';
import { DocumentService } from 'src/document/document.service';
import { InteractionService } from 'src/interaction/interaction.service';
import { v4 as uuidv4 } from 'uuid';
import {
  BotResponse,
  StudentContext,
  CodegenContext,
  AppContext,
  UnifiedChatRequest,
  EnvironmentContext,
  NavigationAction,
  ConversationTurn,
  ClientToolResult,
  MAX_CONVERSATION_TURNS,
  MAX_TURN_CONTENT_CHARS,
  MAX_CHAT_SUMMARY_CHARS,
} from './dto/student-chat-request.dto';
import { ChatMessage } from './dto/student-summary-request.dto';
import {
  ChatHistoryMessageDto,
  ChatHistoryResponseDto,
} from './dto/chat-history.dto';
import { studentConfig } from './student.constants';
import { DEFAULT_SYSTEM_PROMPTS, UNIFIED_SYSTEM_PROMPTS } from './student.prompts';
import { ClassMetadata } from 'src/class/interfaces/class-metadata.interface';
import { Enrollment, Class } from '@prisma/client';
import { MaterialPersonalizationService } from './material-personalization/material-personalization.service';
import { EngineChoice } from 'src/common/llm/interfaces/engine-config';
import { KeywordService } from 'src/common/database/keyword.service';
import { ExperimentService } from 'src/experiment/experiment.service';
import { ResolvedExperimentConfig } from 'src/experiment/experiment.service';
import { ToolRegistryService } from 'src/common/tools/tool-registry.service';
import { ToolDefinition } from 'src/common/tools/tool.interface';
import { clientToolsForRole } from 'src/common/tools/client-tools';
import { AgentLoopService } from 'src/common/agent/agent-loop.service';
import {
  ContextTrace,
  formatContextBlocks,
} from 'src/common/context/context-trace';
import { AssembledContext } from 'src/common/context/context.types';
import {
  renderConditional,
  stripUnrenderedTokens,
} from 'src/common/context/template';
import { isTieredAssemblyEnabled } from 'src/common/context/context-layout';
import {
  CONTEXT_BUDGET,
  fitChunksToBudget,
} from 'src/common/context/context-budget';
import { buildPromptCacheKey } from 'src/common/llm/prompt-cache-key';
import { ConversationHistoryService } from 'src/common/context/conversation-history.service';
import { ConversationService } from 'src/common/context/conversation.service';
import { ContextJobsService } from 'src/context-jobs/context-jobs.service';
import { KiwiAppService } from 'src/kiwi-app/kiwi-app.service';

/**
 * The tutoring modes the prompt can be assembled in — exactly the keys of
 * `materialTypePrompts`, so a mode can never name a prompt that doesn't exist.
 * Also the `mode` segment of the prompt cache key, which is why an arbitrary
 * string must never reach it.
 */
type PromptMode = keyof typeof UNIFIED_SYSTEM_PROMPTS.materialTypePrompts;

/** Every legal mode, for validating what an app's registration declares. */
const PROMPT_MODES = Object.keys(
  UNIFIED_SYSTEM_PROMPTS.materialTypePrompts,
) as PromptMode[];

/**
 * SSE event shape for `/chat/v2`. `conversationId` carries the (possibly
 * server-minted) thread id so a client can group its turns without inventing
 * one.
 */
type UnifiedChatEvent = StudentMessageEvent & {
  data: { navigation?: NavigationAction; conversationId?: string };
};
import { ContextPreviewResponse } from './dto/context-preview.dto';
import {
  AgentStreamEvent,
  AgentExecutionContext,
} from 'src/common/agent/agent-loop.interfaces';
import { filter } from 'rxjs/operators';

type ChunkType = {
  type: string;
  metadata: {
    image_base64: string;
    image_mime_type: string;
    page_number: number;
  };
  described?: boolean;
};

type StudentMessageEvent = {
  id: string;
  data: {
    bot?: {
      botResponse: string;
      id: string;
      citations?: { pdfID: string; pageNumber: string }[];
      streaming: string | null;
    };
    oauthRequired?: {
      serverId: string;
      serverName: string;
      toolName: string;
      authorizationUrl: string;
      message: string;
    };
    clientAction?: {
      toolCallId?: string;
      tool: string;
      args: Record<string, unknown>;
      interactionId?: string;
    };
  };
};

type DocumentType = {
  id: string;
  fileName: string;
  chunks: ChunkType[];
  documentContent: string;
};

@Injectable()
export class StudentService {
  private readonly logger = new Logger(StudentService.name);
  // Store last keyword generation token usage per keywordId (ephemeral)
  private keywordUsage: Map<string, { promptTokens: number; completionTokens: number; totalTokens: number }> = new Map();
  constructor(
    private llmService: LlmService,
    private userSessionService: UserSessionService,
    private classService: ClassService,
    private chatService: ChatService,
    private userService: UserService,
    private interactionService: InteractionService,
    private documentService: DocumentService,
    private materialPersonalizationService: MaterialPersonalizationService,
    private keywordService: KeywordService,
    private experimentService: ExperimentService,
    private toolRegistryService: ToolRegistryService,
    private agentLoopService: AgentLoopService,
    private userInteractionService: UserInteractionService,
    private conversationHistoryService: ConversationHistoryService,
    private conversationService: ConversationService,
    private contextJobsService: ContextJobsService,
    private kiwiAppService: KiwiAppService,
  ) { }

  async getEnrollments(userId: string): Promise<Enrollment[]> {
    this.logger.debug('Fetching enrolled classes for user', userId);
    return await this.classService.getEnrollmentsPerUser(userId);
  }

  async getEnrolledClassesInfo(userId: string): Promise<Class[]> {
    this.logger.debug('Fetching enrolled classes for user', userId);
    // first get the enrollments
    const enrollments = await this.classService.getEnrollmentsPerUser(userId);
    // then get the class info for each enrollment
    const classInfo = await Promise.all(
      enrollments.map(async (enrollment) => {
        const classInfo = await this.classService.getClassById(
          enrollment.classId,
        );
        return {
          ...classInfo,
          classMetadata: classInfo.classMetadata,
        } as Class;
      }),
    );
    return classInfo;
  }

  messagesToString(messages: ChatMessage[]) {
    return messages
      .map((message) => `${message.role}: ${message.content}`)
      .join('\n');
  }
  // CALL TO FETCH PERSONALIZATION INFO

  async summary(
    conversation: ChatMessage[],
    sessionId: string,
    engineChoice?: EngineChoice,
  ) {
    const SUMMARY_SYSTEM_PROMPT = `You are a summarizer assistant. You will be given a conversation between the user and the assistant. Your task is to summarize this conversation. This task is very crucial as this summary will be used to extract educational personalization features for that specific student. Put more emphasis on the last conversation round.`;

    const messages = [
      {
        role: 'system',
        content: SUMMARY_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: this.messagesToString(conversation),
      },
    ] as ChatCompletionMessageParam[];

    this.logger.debug('creating chat for conversation', messages);

    const chatResponse = await this.llmService.createChat(
      messages,
      0,
      1000,
      undefined,
      undefined,
      engineChoice,
    );

    // this.logger.debug(chatResponse);

    // Record used tokens
    const usedTokens = chatResponse.usage?.total_tokens ?? 0;
    await this.userSessionService.incrementUserSessionTokensUsed(
      sessionId,
      usedTokens,
    );

    return {
      summary: chatResponse.choices[0].message.content,
    };
  }

  async beacon(userSessionId: string, userId?: string) {
    const sessionEndTime = new Date();

    await this.userSessionService.updateUserSession({
      where: {
        id: userSessionId,
      },
      data: {
        sessionEndTime,
      },
    });

    // Session end is where the student profile gets refreshed. It belongs here
    // rather than on the chat path because extraction is an LLM call — a chat
    // turn must never wait on it. Enqueue only; a failure is logged, not thrown,
    // so a Redis hiccup cannot turn a page-close into a 500.
    if (userId) {
      await this.contextJobsService.enqueueProfileExtraction({
        userId,
        userSessionId,
      });
    }
  }

  ragToolDescription: ChatCompletionTool = {
    type: 'function',
    function: {
      name: 'rag',
      description:
        'Use the RAG method to find relevant information from class materials to help the student. You should provide a query to search for the information.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The query to search for the information.',
          },
        },
        required: ['prompt'],
      },
    },
  };

  async ragTool(
    prompt: string,
    selectorResponseMessage: string,
    selectorChoice: ChatCompletionChunk.Choice.Delta.ToolCall.Function,
    chatSummary: string,
    studentContext: StudentContext,
    userGroup: string,
    recitationPdfPair: {
      previewedPdfId: string;
      recitationPdfId: string;
    },
    engineChoice?: EngineChoice,
  ) {
    this.logger.debug('RAG Tool');
    this.logger.debug('selectorResponseMessage', selectorResponseMessage);
    this.logger.debug('selectorChoice', selectorChoice);
    this.logger.debug('chatSummary', chatSummary);
    this.logger.debug('studentContext', studentContext);
    this.logger.debug('userGroup', userGroup);

    const RAGQuery = JSON.parse(selectorChoice!.arguments!).query;

    // call RAG
    const classId = studentContext.classId;

    const results = await this.classService.queryClassDocuments(
      RAGQuery,
      classId,
      3,
      undefined,
      undefined,
      undefined,
      engineChoice,
    );

    // collect them into citations
    const citations = [] as { pdfID: string; pageNumber: string }[];

    // unique page number and pdfID from results.metadatas
    const uniquePageNumberPdfID = new Set();
    results.forEach((ragResult) => {
      const pageNumberPdfID =
        ragResult.documentPageNumber + ragResult.documentId;
      if (!uniquePageNumberPdfID.has(pageNumberPdfID)) {
        uniquePageNumberPdfID.add(pageNumberPdfID);
        const citationPdfId = this.pdfIdCorrector(
          ragResult.documentId,
          recitationPdfPair,
        );
        citations.push({
          pdfID: citationPdfId,
          pageNumber: ragResult.documentPageNumber,
        });
      }
    });

    // send the retrieved texts and images to the frontend
    const retrievedTexts = results.map((result) => result.text);

    const retrievedImages = results.map((result) => {
      const chunk = result.chunk as ChunkType;
      if (chunk.described) {
        return `data:${chunk.metadata.image_mime_type};base64,${chunk.metadata.image_base64}`;
      }
    });

    // this.logger.log("the texts of my response are:", retrievedTexts);
    // this.logger.log("the images of my response are:", retrievedImages);

    const ragMessageContent = [
      {
        type: 'text',
        text: 'The following is the information retrieved from the class materials in text and image format.',
      },
    ] as ChatCompletionContentPart[];

    // aggregate the text chunks
    let allTexts = '';
    if (retrievedTexts.length > 0) {
      allTexts = retrievedTexts.join('\n');
    }

    // this.logger.log("allTexts", allTexts);
    ragMessageContent.push({
      type: 'text',
      text: allTexts,
    });

    if (retrievedImages.length > 0) {
      retrievedImages.forEach((image) => {
        if (!image) {
          return;
        }
        const imageContentPart = {
          type: 'image_url' as const,
          image_url: {
            url: image,
          },
        };
        ragMessageContent.push(imageContentPart);
      });
    }

    // student context
    const studentContextResults = await this.classService.queryClassDocuments(
      RAGQuery,
      classId,
      3,
      studentContext.pdfId,
      studentContext.pageNumber,
      undefined,
      engineChoice,
    );

    studentContextResults.forEach((contextResult) => {
      const pageNumberPdfID =
        contextResult.documentPageNumber + contextResult.documentId;
      if (!uniquePageNumberPdfID.has(pageNumberPdfID)) {
        uniquePageNumberPdfID.add(pageNumberPdfID);
        citations.push({
          pdfID: contextResult.documentId,
          pageNumber: contextResult.documentPageNumber,
        });
      }
    });

    const studentContextTexts = studentContextResults.map(
      (result) => result.text,
    );

    const studentContextImages = studentContextResults.map((result) => {
      const chunk = result.chunk as ChunkType;
      if (chunk.described) {
        return `data:${chunk.metadata.image_mime_type};base64,${chunk.metadata.image_base64}`;
      }
    });

    let studentContextContent = '';

    if (studentContextTexts.length > 0) {
      studentContextContent = studentContextTexts.join('\n');
    }

    const studentContextMessage = `The student is currently looking at page ${studentContext.pageNumber} of class material with content: ${studentContextContent}`;

    const studentContextContentArray = [
      {
        type: 'text',
        text: studentContextMessage,
      },
    ] as ChatCompletionContentPart[];

    if (studentContextImages.length > 0) {
      studentContextImages.forEach((image) => {
        if (!image) {
          return;
        }
        const imageContentPart = {
          type: 'image_url' as const,
          image_url: {
            url: image,
          },
        };
        studentContextContentArray.push(imageContentPart);
      });
    }

    const messages = [];

    const defaultSystemMessage =
      "You are an Retrieval Augmented Generation enhanced assistant named Kiwi. Your role is to help students with learning resources. You will be given a student question and some relevant documents (images, text, or both) retrieved by the RAG system. Your crucial task is to generate an answer to the student's question based on the retrieved documents. Do not mention the RAG system, you can instead mention the source.";

    const classSpecificSystemMessage =
      'You will specifically assist in the class this Kiwi instance is configured for.';
    messages.push({
      role: 'system' as const,
      content: defaultSystemMessage + '\n\n' + classSpecificSystemMessage,
    });

    const summarySystemMessage =
      'The following is a summary of the class content for you to reference while making conversation with the student.' +
      chatSummary;

    if (chatSummary.length > 0) {
      messages.push({
        role: 'system' as const,
        content: summarySystemMessage,
      });
    }

    // push the rag content

    messages.push({
      role: 'user' as const,
      content: ragMessageContent,
    });

    // push context

    if (studentContextContent.length > 0) {
      messages.push({
        role: 'user' as const,
        content: studentContextContentArray,
      });
    }

    // push the prompt

    messages.push({
      role: 'user' as const,
      content: prompt,
    });

    const responseStream = await this.llmService.createChatStream(
      messages,
      1,
      1000,
      undefined,
      undefined,
      engineChoice,
    );

    // this.logger.log(response);

    return {
      responseStream,
      citations,
    };
  }

  /**
   * Retrieval-only RAG for the unified agent path: returns the retrieved
   * chunks as text so the agent composes the answer itself. (ragTool above
   * is the legacy selector path — it fires a nested LLM stream, which an
   * agent tool-result message cannot carry.)
   */
  async ragRetrieve(
    query: string,
    classId: string,
    engineChoice?: EngineChoice,
    pageScope?: { documentId?: string; pageNumber?: number },
  ): Promise<string> {
    const results = await this.classService.queryClassDocuments(
      query,
      classId,
      3,
      pageScope?.documentId,
      pageScope?.pageNumber,
      undefined,
      engineChoice,
    );

    if (!results.length) {
      return 'No matching content found in the class materials for this query.';
    }

    const parts = results.map((result, i) => {
      const chunk = result.chunk as ChunkType;
      const source = `document ${result.documentId}, page ${result.documentPageNumber}`;
      const body = chunk.described
        ? `[image content, described]: ${result.text}`
        : result.text;
      return `[${i + 1}] (${source})\n${body}`;
    });

    const header = pageScope
      ? 'Retrieved from the document/page the student is viewing:'
      : 'Retrieved from class materials:';
    return `${header}\n\n${parts.join('\n\n')}`.slice(
      0,
      CONTEXT_BUDGET.maxToolResultChars,
    );
  }

  codeInterpreterToolDescription: ChatCompletionTool = {
    type: 'function',
    function: {
      name: 'code-interpreter',
      description:
        'Talk to a code generator and interpreter expert to provide help to the student. You should provide an explanation of what the student needs help with and the code that needs to be worked if the student has provided any. You can also ask for expert to create code.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The query to ask to the code-interpreter expert.',
          },
          code: {
            type: 'string',
            description: 'The code that needs to be worked on.',
          },
          generate_code: {
            type: 'boolean',
            description: 'If the expert should generate code.',
          },
        },
        required: ['query'],
      },
    },
  };

  async codeInterpreterTool(
    selectorResponseMessage: string,
    selectorChoice: ChatCompletionChunk.Choice.Delta.ToolCall.Function,
    chatSummary: string,
    engineChoice?: EngineChoice,
  ) {
    this.logger.debug('Code Interpreter Tool');
    this.logger.debug('selectorResponseMessage', selectorResponseMessage);
    this.logger.debug('selectorChoice', selectorChoice);
    this.logger.debug('chatSummary', chatSummary);

    // tool calling
    const codeInterpreterTool = JSON.parse(selectorChoice!.arguments!) as {
      query: string;
      code: string;
      generate_code: boolean;
    };

    const codeInterpreterToolQuery = codeInterpreterTool.query;
    const codeInterpreterToolCode = codeInterpreterTool.code || '';
    const codeInterpreterToolGenerateCode =
      codeInterpreterTool.generate_code || false;

    const messages = [];

    const generateCodeOnlyMessage = `You should provide executable code for the given task.
  
Below are example responses you should give.

## Example 1

Student Prompt: Give me a code for Bubble sort algorithm

Your response:
\`\`\`python
  def bubble_sort(arr):
  n = len(arr)
  
  # Traverse through all elements in the array
  for i in range(n):
  # Last i elements are already sorted, so we don't need to check them
  for j in range(0, n-i-1):
  # Swap if the element found is greater than the next element
  if arr[j] > arr[j+1]:
  arr[j], arr[j+1] = arr[j+1], arr[j]
  
  # Example usage:
  my_list = [64, 34, 25, 12, 22, 11, 90]
  bubble_sort(my_list)
  
  print("Sorted array:", my_list)
\`\`\``;

    const generateCodeBasedOnCodeMessage = `You should provide instructions on how to correct the code.
  
Below are example responses you should give.

## Example 1

Student Prompt: I have the CODE like this.
\`\`\`python
  print('hello world!
\`\`\`
Can you provide me with some code correction?"

Your response:
\`\`\`python
print('hello world!')
\`\`\``;

    const instructionOnlyMessage = `You should only provide hints and instructions to correct the CODE according to given information. 
  
Below are example responses you should give.
 
## Example 1
  
Student Prompt: I have the CODE like this.
\`\`\`python
  print('hello world!
\`\`\`
I encountered a warning, here is the WARNING Information:
\`\`\`
  Traceback (most recent call last):
    File "/lib/python311.zip/_pyodide/_base.py", line 573, in eval_code_async
      await CodeRunner(
            ^^^^^^^^^^^
    File "/lib/python311.zip/_pyodide/_base.py", line 267, in __init__
      self.ast = next(self._gen)
                 ^^^^^^^^^^^^^^^
    File "/lib/python311.zip/_pyodide/_base.py", line 145, in _parse_and_compile_gen
      mod = compile(source, filename, mode, flags | ast.PyCF_ONLY_AST)
            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    File "<exec>", line 1
      print("hello world!
            ^
  SyntaxError: unterminated string literal (detected at line 1)
  
\`\`\`
Can you tell me why this is wrong?
  
Your response: In Python, the print() function is used to display output on the console. However, the code you provided is missing a closing parenthesis. To fix this, you need to add a closing parenthesis at the end of the string. This will resolve the warning message.`;

    let generateCodeMessage = '';
    if (codeInterpreterToolGenerateCode) {
      if (codeInterpreterToolCode) {
        generateCodeMessage = generateCodeBasedOnCodeMessage;
      } else {
        generateCodeMessage = generateCodeOnlyMessage;
      }
    } else {
      generateCodeMessage = instructionOnlyMessage;
    }

    const defaultSystemMessage = `You are a code generator and interpreter. ${generateCodeMessage}`;

    const classSpecificSystemMessage =
      '## Context\n\nYou will specifically assist in the classes this Kiwi instance is configured for.';

    messages.push({
      role: 'system' as const,
      content: defaultSystemMessage + '\n\n' + classSpecificSystemMessage,
    });

    const summarySystemMessage =
      'The following is a summary of the class content for you to reference while making conversation with the student.' +
      chatSummary;

    if (chatSummary) {
      messages.push({
        role: 'system' as const,
        content: summarySystemMessage,
      });
    }

    // push the prompt

    messages.push({
      role: 'user' as const,
      content: codeInterpreterToolQuery,
    });

    if (codeInterpreterToolCode !== '') {
      messages.push({
        role: 'user' as const,
        content: codeInterpreterToolCode,
      });
    }

    const responseStream = await this.llmService.createChatStream(
      messages,
      1,
      1000,
      undefined,
      undefined,
      engineChoice,
    );

    // console.log(response);

    return responseStream;
  }

  toolCallAccumulator(
    accumulator: Array<ChatCompletionChunk.Choice.Delta.ToolCall>,
    delta: Array<ChatCompletionChunk.Choice.Delta.ToolCall>,
  ) {
    const updatedAccumulator = [...accumulator];

    delta.forEach((deltaItem) => {
      const existingItemIndex = updatedAccumulator.findIndex(
        (item) => item.index === deltaItem.index,
      );

      if (existingItemIndex >= 0) {
        // Update the existing item
        const existingItem = updatedAccumulator[existingItemIndex];
        const updatedFunction = {
          ...existingItem.function,
          ...deltaItem.function,
          arguments: existingItem.function?.arguments
            ? existingItem.function.arguments +
            (deltaItem.function?.arguments || '')
            : deltaItem.function?.arguments,
        };

        updatedAccumulator[existingItemIndex] = {
          ...existingItem,
          ...deltaItem,
          function: updatedFunction,
        };
      } else {
        // Add the new item
        updatedAccumulator.push(deltaItem);
      }
    });

    return updatedAccumulator;
  }

  pdfIdCorrector(
    pdfID: string,
    recitationPdfPair: {
      previewedPdfId: string;
      recitationPdfId: string;
    },
  ) {
    if (pdfID === recitationPdfPair.recitationPdfId) {
      return recitationPdfPair.previewedPdfId;
    }
    return pdfID;
  }

  /**
   * Transform AgentStreamEvent to StudentMessageEvent for SSE response
   */
  private transformAgentEventToStudentEvent(
    event: AgentStreamEvent,
    conversationID: string,
    citations: Array<{ pdfID: string; pageNumber: string }>,
    contentAccumulator: { value: string },
  ): StudentMessageEvent | null {
    switch (event.type) {
      case 'content_delta':
        // Accumulate content and stream to user
        contentAccumulator.value += event.data.content || '';
        return {
          id: conversationID,
          data: {
            bot: {
              botResponse: contentAccumulator.value,
              id: conversationID,
              citations: citations,
              streaming: null,
            },
          },
        };

      case 'tool_call_start':
        // Show tool being used
        const toolName = event.data.toolCall?.name || 'tool';
        return {
          id: conversationID,
          data: {
            bot: {
              botResponse: contentAccumulator.value + `\n\nUsing ${toolName}...`,
              id: conversationID,
              citations: citations,
              streaming: null,
            },
          },
        };

      case 'final_response':
        // Final answer - use content from event if available
        const finalContent = event.data.content || contentAccumulator.value;
        return {
          id: conversationID,
          data: {
            bot: {
              botResponse: finalContent,
              id: conversationID,
              citations: event.data.citations || citations,
              streaming: 'stop',
            },
          },
        };

      case 'max_iterations':
        // Max iterations reached - return whatever content we have
        return {
          id: conversationID,
          data: {
            bot: {
              botResponse:
                event.data.content ||
                contentAccumulator.value ||
                'I reached the maximum number of steps. Here is what I found.',
              id: conversationID,
              citations: citations,
              streaming: 'stop',
            },
          },
        };

      case 'oauth_required':
        // OAuth authorization needed
        return {
          id: conversationID,
          data: {
            oauthRequired: {
              serverId: event.data.oauth!.serverId,
              serverName: event.data.oauth!.serverName,
              toolName: event.data.oauth!.toolName,
              authorizationUrl: event.data.oauth!.authorizationUrl,
              message: `Authorization required for ${event.data.oauth!.serverName}`,
            },
          },
        };

      case 'error':
        return {
          id: conversationID,
          data: {
            bot: {
              botResponse: `Error: ${event.data.error || 'An error occurred'}`,
              id: conversationID,
              citations: citations,
              streaming: 'stop',
            },
          },
        };

      // Internal events - don't emit to client
      case 'iteration_start':
      case 'iteration_complete':
      case 'tool_call_complete':
        return null;

      default:
        return null;
    }
  }

  async chat(
    prompt: string,
    chatSummary: string,
    type: 'pdf' | 'codegen',
    studentContext: StudentContext | undefined,
    codegenContext: CodegenContext | undefined,
    session: {
      userId: string;
      userSessionId: string;
      classId?: string;
    },
    engineChoice?: EngineChoice,
  ) {
    const conversationID = uuidv4();
    const { userId, userSessionId } = session;

    if (type === 'pdf') {
      return this.chatPdf(
        prompt,
        chatSummary,
        studentContext!,
        session,
        engineChoice,
      );
    } else if (type === 'codegen') {
      return this.chatCodegen(
        prompt,
        chatSummary,
        codegenContext!,
        session,
        engineChoice,
      );
    } else {
      throw new Error(`Unsupported chat type: ${type}`);
    }
  }

  private async chatPdf(
    prompt: string,
    chatSummary: string,
    studentContext: StudentContext,
    session: {
      userId: string;
      userSessionId: string;
      classId?: string;
    },
    engineChoice?: EngineChoice,
  ) {
    const conversationID = uuidv4();
    const RAGQuery = prompt;
    const classId = studentContext.classId;
    const previewedPdfId = studentContext.pdfId;
    const pageNumber = studentContext.pageNumber;
    const materialType = studentContext.materialType;
    const citations = [] as { pdfID: string; pageNumber: string }[];

    let pdfId = '';
    const recitationPdfPair = {
      previewedPdfId: previewedPdfId,
      recitationPdfId: '',
    };

    // Get class metadata to check for custom prompts
    const classInfo = await this.classService.getClassById(
      studentContext.classId,
    );
    const classMetadata = classInfo.classMetadata as unknown as ClassMetadata;

    // Get system prompts (use defaults if not specified in class metadata)
    const systemPrompts = {
      defaultSystemMessage:
        classMetadata.systemPrompts?.defaultSystemMessage ||
        DEFAULT_SYSTEM_PROMPTS.defaultSystemMessage,
      classMaterialsPrompt:
        classMetadata.systemPrompts?.classMaterialsPrompt ||
        DEFAULT_SYSTEM_PROMPTS.classMaterialsPrompt,
      recitationPrompt:
        classMetadata.systemPrompts?.recitationPrompt ||
        DEFAULT_SYSTEM_PROMPTS.recitationPrompt,
    };

    // Learning-experiment override: if an active experiment assigns this
    // student to a variant, apply that variant's engine + system prompts over
    // the class defaults. No-op when there is no active experiment, so default
    // behavior is unchanged. See EXPERIMENT_SYSTEM_DESIGN.md.
    const experimentConfig = await this.experimentService.resolveActiveConfig(
      session.userId,
      classId,
    );
    if (experimentConfig) {
      engineChoice = experimentConfig.engine;
      const sp = experimentConfig.systemPrompts;
      if (sp?.defaultSystemMessage)
        systemPrompts.defaultSystemMessage = sp.defaultSystemMessage;
      if (sp?.classMaterialsPrompt)
        systemPrompts.classMaterialsPrompt = sp.classMaterialsPrompt;
      if (sp?.recitationPrompt)
        systemPrompts.recitationPrompt = sp.recitationPrompt;
      this.logger.debug(
        `Experiment ${experimentConfig.experimentId} variant ` +
          `${experimentConfig.variantKey} applied for user ${session.userId}`,
      );
    }

    // set pdfId
    if (materialType == 'recitation') {
      pdfId =
        await this.documentService.getAnsweredRecitationForRecitationById(
          previewedPdfId,
        );
    } else {
      pdfId = previewedPdfId;
    }
    recitationPdfPair.recitationPdfId = pdfId;

    this.logger.debug('pdfId', pdfId);

    // Create interaction
    const { userId, userSessionId } = session;
    const userChatInteraction = await this.interactionService.createInteraction(
      userSessionId,
      userId,
      classId,
      {
        type: 'frontend-interaction-chat',
        timestamp: new Date(),
        pdfId: pdfId,
        pdfPage: pageNumber,
        pdfMaterialType: materialType,
        context: {
          content: {
            prompt: prompt,
            answer: '',
          },
          engineChoice: engineChoice,
        },
      },
    );

    // personalization: call setdynamictimeout with the current date time
    // in setdyanmictimeout, set a timeout for 1 hour
    // if the user sends a message within 1 hour, then reset the timer
    // if not, then call another api that prints "1 hour passed" for the callback function

    // Get User Research Notes
    const user = await this.userService.user({
      id: userId,
    });
    const researchNotes =
      user?.researchNotes ?? ({ CONTEXT_STUDY: 'control' } as JsonObject);
    const userGroup =
      ((researchNotes as JsonObject).CONTEXT_STUDY as string) ?? 'control';

    const userSession = await this.userSessionService.userSession({
      id: userSessionId,
    });
    const researchNotesForSession =
      userSession?.researchNotesForSession ?? ({ PN_STUDY: 1 } as JsonObject);
    const PN_STUDY_RATIO =
      ((researchNotesForSession as JsonObject).PN_STUDY as number) ?? 1;

    // N total chunks we send as context
    // P -  chunks on current page
    // O - chunks of the rest pages O = N-P
    let N = 3;
    // get number of chunkings of the current page and set to N
    const document = (await this.documentService.retrieveDocument(pdfId))
      .document as DocumentType;
    if (document && document.chunks) {
      const chunks: ChunkType[] = document.chunks;
      N = chunks.filter(
        (chunk) => chunk.metadata.page_number == pageNumber,
      ).length;
    }

    // set P
    let P = N;
    if (studentConfig.PN_STUDY_ENABLED) {
      P = Math.round(N * PN_STUDY_RATIO); // use round so we can get 0 - N
    }

    const studentContextResultsForP =
      await this.classService.queryClassDocuments(
        RAGQuery,
        classId,
        P,
        pdfId,
        pageNumber,
        false, // oMode
        engineChoice,
      );

    // set O
    const O = N - P;
    const studentContextResultsForO =
      await this.classService.queryClassDocuments(
        RAGQuery,
        classId,
        O,
        pdfId,
        pageNumber,
        true, // oMode
        engineChoice,
      );

    const studentContextResults = [
      ...studentContextResultsForP,
      ...studentContextResultsForO,
    ];

    this.logger.debug('N P O', N, P, O);
    this.logger.debug(
      'Student context results for P',
      JSON.stringify(studentContextResultsForP, null, 2),
    );
    this.logger.debug(
      'Student context results for O',
      JSON.stringify(studentContextResultsForO, null, 2),
    );

    const uniquePageNumberPdfID = new Set();
    studentContextResults.forEach((contextResult) => {
      const pageNumberPdfID =
        contextResult.documentPageNumber + contextResult.documentId;
      if (!uniquePageNumberPdfID.has(pageNumberPdfID)) {
        uniquePageNumberPdfID.add(pageNumberPdfID);
        const citationPdfId = this.pdfIdCorrector(
          contextResult.documentId,
          recitationPdfPair,
        );
        citations.push({
          pdfID: citationPdfId,
          pageNumber: contextResult.documentPageNumber,
        });
      }
    });

    // // text content for P and O
    const studentContextTextsForP = studentContextResultsForP.map(
      (result) => result.text,
    );
    const studentContextTextsForO = studentContextResultsForO.map(
      (result) => result.text,
    );

    let studentContextContentForP = '';
    if (studentContextTextsForP.length > 0) {
      studentContextContentForP = studentContextTextsForP.join('\n');
    }

    let studentContextContentForO = '';
    if (studentContextTextsForO.length > 0) {
      studentContextContentForO = studentContextTextsForO.join('\n');
    }

    let studentContextMessageForP = '';
    let studentContextMessageForO = '';
    const imageTextForP =
      studentContextResultsForP.filter((result) => {
        const chunk = result.chunk as ChunkType;
        return chunk.described;
      }).length > 0
        ? ' Below are the related images.'
        : '';
    const imageTextForO =
      studentContextResultsForO.filter((result) => {
        const chunk = result.chunk as ChunkType;
        return chunk.described;
      }).length > 0
        ? 'Below are the related images. '
        : '';
    // Fetch document summaries for this document
    let documentSummariesContext = '';
    try {
      const summariesResponse = await this.documentService.listVisibleDocumentSummariesForStudent(
        pdfId,
        userId,
      );
      if (summariesResponse.summaries && summariesResponse.summaries.length > 0) {
        const summaryTexts = summariesResponse.summaries
          .map((s, idx) => `Summary ${idx + 1}: ${s.content}`)
          .join('\n\n');
        documentSummariesContext = `\n\nDocument Summaries:\n${summaryTexts}`;
        this.logger.debug(`Loaded ${summariesResponse.summaries.length} document summaries for pdfId ${pdfId}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to load document summaries for pdfId ${pdfId}:`, error);
    }

    // Fetch document comments for this document (visible to students)
    let documentCommentsContext = '';
    try {
      const commentsResponse = await this.documentService.listVisibleDocumentCommentsForStudent(
        pdfId,
        userId,
      );
      if (commentsResponse.comments && commentsResponse.comments.length > 0) {
        const commentsByPage: Record<number, string[]> = {};
        commentsResponse.comments.forEach((comment) => {
          if (!commentsByPage[comment.pageNumber]) {
            commentsByPage[comment.pageNumber] = [];
          }
          commentsByPage[comment.pageNumber].push(comment.text);
        });

        const commentTexts = Object.entries(commentsByPage)
          .map(([page, texts]) => `Page ${page}: ${texts.join('; ')}`)
          .join('\n');
        documentCommentsContext = `\n\nInstructor Comments:\n${commentTexts}`;
        this.logger.debug(`Loaded ${commentsResponse.comments.length} document comments for pdfId ${pdfId}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to load document comments for pdfId ${pdfId}:`, error);
    }

    if (studentContext.materialType === 'class materials') {
      studentContextMessageForP = `The student is currently looking at page ${studentContext.pageNumber} of class material with content: ${studentContextContentForP}.${imageTextForP}${documentSummariesContext}${documentCommentsContext}`;
      studentContextMessageForO = `The other content about this lecture is ${studentContextContentForO}.${imageTextForO} Do not include this information if the student only asks the content on the current page`;
    } else {
      studentContextMessageForP = `The student is currently looking at page ${studentContext.pageNumber} of recitation materials without the answers. Below is recitation materials with the questions and the answers: ${studentContextContentForP}.${imageTextForP}${documentSummariesContext}${documentCommentsContext}`;
      studentContextMessageForO = `The other content about this recitation is ${studentContextContentForO}.${imageTextForO} Do not include this information if the student only asks the content on the current page`;
    }

    const studentContextContentArrayForP = [
      {
        type: 'text',
        text: studentContextMessageForP,
      },
    ] as ChatCompletionContentPart[];

    const studentContextContentArrayForO = [
      {
        type: 'text',
        text: studentContextMessageForO,
      },
    ] as ChatCompletionContentPart[];

    // images content for P and O
    const studentContextImagesForP = studentContextResultsForP.map((result) => {
      const chunk = result.chunk as ChunkType;
      if (chunk.described) {
        return `data:${chunk.metadata.image_mime_type};base64,${chunk.metadata.image_base64}`;
      }
    });

    const studentContextImagesForO = studentContextResultsForO.map((result) => {
      const chunk = result.chunk as ChunkType;
      if (chunk.described) {
        return `data:${chunk.metadata.image_mime_type};base64,${chunk.metadata.image_base64}`;
      }
    });

    // add images to content array
    if (studentContextImagesForP.length > 0) {
      studentContextImagesForP.forEach((image) => {
        if (!image) {
          return;
        }
        const imageContentPart = {
          type: 'image_url' as const,
          image_url: {
            url: image,
          },
        };
        studentContextContentArrayForP.push(imageContentPart);
      });
    }

    if (studentContextImagesForO.length > 0) {
      studentContextImagesForO.forEach((image) => {
        if (!image) {
          return;
        }
        const imageContentPart = {
          type: 'image_url' as const,
          image_url: {
            url: image,
          },
        };
        studentContextContentArrayForO.push(imageContentPart);
      });
    }

    const messages = [];

    // change the default system message depending on the current material type
    // Use appropriate prompt based on material type
    const classSpecificSystemMessage =
      studentContext.materialType === 'class materials'
        ? systemPrompts.classMaterialsPrompt
        : systemPrompts.recitationPrompt;

    messages.push({
      role: 'system',
      content:
        systemPrompts.defaultSystemMessage + '\n' + classSpecificSystemMessage,
    });

    let studentPersonalization = '';
    const studentPersonalizationArray =
      await this.materialPersonalizationService.getUserPersonalizations(userId);
    this.logger.debug(
      'The personalization array is:',
      studentPersonalizationArray,
    );

    if (studentPersonalizationArray.length > 0) {
      this.logger.debug('Personalization array is not empty');
      // Loop over the objects in the student personalization array and add them to the studentPersonalization string.
      studentPersonalizationArray.forEach((element) => {
        studentPersonalization += `The student has spent ${element.timeSpent} minutes on ${element.documentName}. The student's learning style is ${element.learningStyle}. The student's question style is ${element.questionStyle}. The student is good at ${element.studentGoodAt} and needs to improve at ${element.studentsImproveAt}. `;
      });
      this.logger.debug('Student personalization:', studentPersonalization);
      messages.push({
        role: 'system' as const,
        content: studentPersonalization,
      });
      this.logger.debug('Messages after push:', messages);
    } else {
      this.logger.debug('Personalization array is empty');
      messages.push({
        role: 'system' as const,
        content: 'No personalization for this student yet',
      });
    }

    // add summary if any
    const summarySystemMessage =
      'The following is a summary of the class content for you to reference while making conversation with the student.' +
      chatSummary;
    if (chatSummary.length > 0) {
      messages.push({
        role: 'system',
        content: summarySystemMessage,
      });
    }

    // Get enabled tools for this class (includes built-in + MCP tools)
    const tools = await this.toolRegistryService.getToolsForClass(
      classId,
      'pdf',
      userId,
    );

    if (studentContextContentForP.length > 0) {
      messages.push({
        role: 'user',
        content: studentContextContentArrayForP,
      });
    }
    if (studentContextContentForO.length > 0) {
      messages.push({
        role: 'user',
        content: studentContextContentArrayForO,
      });
    }
    messages.push({
      role: 'user',
      content: prompt,
    });

    // this.logger.debug('Using the messages', JSON.stringify(messages, null, 2));

    // Store the query so far
    const serverAction = await this.interactionService.createServerAction(
      {
        interactionId: userChatInteraction.id,
        type: 'chat-query',
        context: {
          conversationID: conversationID,
          messages: messages,
          PN_STUDY_RATIO,
          PN_STUDY_N_NUMBER: N,
          userGroup: userGroup,
        },
        botResponse: '',
        engineChoice: engineChoice,
        timestamp: new Date(),
      },

      // {
      //   type: 'chat-query',
      //   timestamp: new Date(),
      //   pdfId: pdfId,
      //   pdfPage: pageNumber,
      //   pdfMaterialType: materialType,
      //   context: {
      //     conversationID: conversationID,
      //     messages: messages,
      //     PN_STUDY_RATIO,
      //     PN_STUDY_N_NUMBER: N,
      //     engineChoice: engineChoice,
      //   },
      // }
    );
    // await this.interactionService.addInteractionAction(userChatInteraction.id, {
    //   type: 'chat-query',
    //   timestamp: new Date(),
    //   pdfID: pdfId,
    //   pdfPage: pageNumber,
    //   pdfMaterialType: materialType,
    //   context: {
    //     conversationID: conversationID,
    //     messages: messages,
    //     PN_STUDY_RATIO,
    //     PN_STUDY_N_NUMBER: N,
    //     engineChoice: engineChoice,
    //   },
    // });

    // Build agent execution context
    const agentContext: AgentExecutionContext = {
      userId: session.userId,
      userSessionId: session.userSessionId,
      classId: classId,
      chatType: 'pdf',
      engineChoice: engineChoice,
      studentContext: {
        pdfId: pdfId,
        pageNumber: pageNumber,
        materialType: materialType,
        chatSummary: chatSummary,
      },
      toolExecutor: this, // For built-in tools (ragTool, codeInterpreterTool)
      interactionId: userChatInteraction.id,
    };

    // Content accumulator for streaming (passed by reference)
    const contentAccumulator = { value: '' };

    // Execute agent loop and transform events to StudentMessageEvent
    return this.agentLoopService
      .executeAgentLoop(
        messages as ChatCompletionMessageParam[],
        tools,
        agentContext,
        {
          maxIterations: 10,
          maxTokensPerIteration: 1000,
          streamIntermediateResponses: true,
        },
      )
      .pipe(
        // Transform agent events to student message events
        map((event) =>
          this.transformAgentEventToStudentEvent(
            event,
            conversationID,
            citations,
            contentAccumulator,
          ),
        ),
        // Filter out null events (internal events we don't want to emit)
        filter((event): event is StudentMessageEvent => event !== null),
      );
  }

  private async chatCodegen(
    prompt: string,
    chatSummary: string,
    codegenContext: CodegenContext,
    session: {
      userId: string;
      userSessionId: string;
      classId?: string;
    },
    engineChoice?: EngineChoice,
  ) {
    const conversationID = uuidv4();
    const { userId, userSessionId } = session;
    const { problemId } = codegenContext;
    const classId = session.classId;

    if (!classId) {
      this.logger.error('Missing classId in session for codegen chat');
      throw new Error('Missing classId in session for codegen chat');
    }

    this.logger.debug('Codegen chat for problemId:', problemId);
    const problemInfo = {
      title: `Problem ${problemId}`,
      description:
        'Problem information is not available. Please check if the codegen service is running.',
      constraints: 'No constraints available',
      testCases: null,
      solution: null,
    };

    let userChatInteraction: any;
    try {
      userChatInteraction = await this.interactionService.createInteraction(
        userSessionId,
        userId,
        classId,
        {
          type: 'frontend-interaction-chat-exercise',
          timestamp: new Date(),
          pdfId: undefined,
          pdfPage: undefined,
          pdfMaterialType: undefined,
          context: {
            content: {
              prompt: prompt,
              answer: '',
            },
            engineChoice: engineChoice,
            problemId: problemId,
          },
        },
      );
    } catch (error) {
      this.logger.warn(
        'Failed to create interaction for codegen chat:',
        error.message,
      );
      userChatInteraction = {
        id: `codegen-${Date.now()}`,
        userId,
        sessionId: userSessionId,
        classId: classId,
        timestamp: new Date(),
        type: 'frontend-interaction-chat-exercise',
        context: {
          content: {
            prompt: prompt,
            answer: '',
          },
          engineChoice: engineChoice,
          problemId: problemId,
        },
        pdfId: undefined,
        pdfMaterialType: undefined,
        pdfPage: undefined,
      };
    }

    const user = await this.userService.user({
      id: userId,
    });
    const researchNotes =
      user?.researchNotes ?? ({ CONTEXT_STUDY: 'control' } as JsonObject);
    const userGroup =
      ((researchNotes as JsonObject).CONTEXT_STUDY as string) ?? 'control';

    const userSession = await this.userSessionService.userSession({
      id: userSessionId,
    });
    const researchNotesForSession =
      userSession?.researchNotesForSession ?? ({ PN_STUDY: 1 } as JsonObject);
    const PN_STUDY_RATIO =
      ((researchNotesForSession as JsonObject).PN_STUDY as number) ?? 1;

    const enhancedPrompt = this.buildCodegenPrompt(
      prompt,
      problemInfo,
      codegenContext?.codeContext,
      codegenContext?.selectedCode,
      codegenContext?.errorContext,
    );

    const messages = [];

    const defaultSystemMessage = `You are an AI programming assistant named Kiwi. You help with programming exercises. Provide helpful hints, explain concepts, and guide the student toward the solution without giving away the complete answer.`;

    messages.push({
      role: 'system' as const,
      content: defaultSystemMessage,
    });

    const studentPersonalizationArray =
      await this.materialPersonalizationService.getUserPersonalizations(userId);

    if (studentPersonalizationArray.length > 0) {
      let studentPersonalization = '';
      studentPersonalizationArray.forEach((element) => {
        studentPersonalization += `The student has spent ${element.timeSpent} minutes on ${element.documentName}. The student's learning style is ${element.learningStyle}. The student's question style is ${element.questionStyle}. The student is good at ${element.studentGoodAt} and needs to improve at ${element.studentsImproveAt}. `;
      });

      messages.push({
        role: 'system' as const,
        content: studentPersonalization,
      });
    }

    if (chatSummary.length > 0) {
      const summarySystemMessage =
        'The following is a summary of the previous conversation for context:' +
        chatSummary;
      messages.push({
        role: 'system',
        content: summarySystemMessage,
      });
    }

    messages.push({
      role: 'user',
      content: enhancedPrompt,
    });

    if (!userChatInteraction.id.startsWith('codegen-')) {
      await this.interactionService.createServerAction({
        interactionId: userChatInteraction.id,
        type: 'chat-query',
        context: {
          conversationID: conversationID,
          messages: messages,
          userGroup: userGroup,
        },
        botResponse: '',
        engineChoice: engineChoice,
        timestamp: new Date(),
      });
    }

    // Get enabled tools for this class (includes built-in + MCP tools)
    const tools = await this.toolRegistryService.getToolsForClass(
      classId,
      'codegen',
      userId,
    );

    const chatStream = await this.llmService.createChatStream(
      messages as ChatMessage[],
      1,
      1000,
      tools.length > 0 ? tools : undefined,
      undefined,
      engineChoice,
    );

    const chatObservable = this.chatService.streamToObservable(chatStream);

    return new Observable<StudentMessageEvent>((subscriber) => {
      let accumulatedResponse = '';
      const pushMessageToInteraction = async (
        role: 'user' | 'assistant',
        text: string,
      ) => {
        try {
          const ctx = (userChatInteraction as any).context || {};
          const messages = Array.isArray((ctx as any).messages)
            ? ([...((ctx as any).messages as any[])] as any[])
            : ([] as any[]);
          const messageIndex = messages.length;
          messages.push({
            role,
            content: text,
            messageIndex,
            timestamp: new Date().toISOString(),
            engineChoice: engineChoice || 'openai',
          });
          await this.interactionService.updateInteractionContext(
            userChatInteraction.id,
            {
              ...(ctx as any),
              messages,
              problemId: problemId,
              engineChoice: engineChoice,
            } as any,
          );
          (userChatInteraction as any).context = {
            ...(ctx as any),
            messages,
            problemId: problemId,
            engineChoice: engineChoice,
          };
        } catch {}
      };
      
      chatObservable.subscribe({
        next: async (chunk) => {
          const response = chunk.data;

          if (response.usage) {
            const usedTokens = response.usage.total_tokens;
            this.userSessionService.incrementUserSessionTokensUsed(
              session.userSessionId,
              usedTokens,
            );
            return;
          }

          const responseDelta = response.choices[0].delta.content;
          const responseFinished = response.choices[0].finish_reason;

          if (responseDelta) {
            accumulatedResponse += responseDelta;
            subscriber.next({
              id: chunk.id,
              data: {
                bot: {
                  botResponse: responseDelta,
                  id: conversationID,
                  citations: [],
                  streaming: responseFinished,
                },
              },
            });
            // Append assistant delta only at the end for context compactness; no-op here
          }

          if (responseFinished) {
            subscriber.next({
              id: chunk.id,
              data: {
                bot: {
                  botResponse: responseDelta || '',
                  id: conversationID,
                  citations: [],
                  streaming: responseFinished,
                },
              },
            });
          }
        },
        error: (error) => {
          this.logger.error(error);
          subscriber.error({
            data: { error: 'Error occurred while creating a response.' },
          });
        },
        complete: async () => {
          this.logger.debug('Codegen chat stream completed');

          if (!userChatInteraction.id.startsWith('codegen-')) {
            await pushMessageToInteraction('user', enhancedPrompt);
            await pushMessageToInteraction('assistant', accumulatedResponse);
            await this.interactionService.createServerAction({
              interactionId: userChatInteraction.id,
              type: 'chat-selector',
              context: {
                conversationID: conversationID,
                userGroup: userGroup,
              },
              botResponse: accumulatedResponse,
              engineChoice: engineChoice,
              timestamp: new Date(),
            });
            await this.interactionService.updateInteractionContext(
              userChatInteraction.id,
              {
                content: {
                  prompt: prompt,
                  answer: accumulatedResponse,
                },
                engineChoice: engineChoice,
                problemId: problemId,
              },
            );
          }

          subscriber.complete();
        },
      });
    });
  }

  private buildCodegenPrompt(
    userPrompt: string,
    problemInfo: any,
    codeContext?: string,
    selectedCode?: string,
    errorContext?: string,
  ): string {
    const testCasesInfo = problemInfo?.testCases
      ? `- Test Cases: Available (${Array.isArray(problemInfo.testCases) ? problemInfo.testCases.length : "Multiple"})`
      : "- Test Cases: Not provided";

    const solutionInfo = problemInfo?.solution
      ? "- Solution: Available internally (do not reveal it verbatim)"
      : "- Solution: Not provided";

    const trim = (text: string | undefined, max: number) => {
      if (!text) return '';
      if (text.length <= max) return text;
      const head = Math.floor(max * 0.6);
      const tail = Math.floor(max * 0.3);
      return text.slice(0, head) + `\n...\n` + text.slice(-tail);
    };

    const codeBlock = (label: string, content: string) =>
      `${label}:\n\n\
\`\`\`\n${content}\n\`\`\``;

    const selectedCodeBlock = selectedCode
      ? codeBlock('Selected Code', trim(selectedCode, 4000))
      : '';
    const fullCodeBlock = !selectedCode && codeContext
      ? codeBlock('Code Context', trim(codeContext, 6000))
      : '';
    const errorBlock = errorContext
      ? codeBlock('Error Context', trim(errorContext, 2000))
      : '';
    return `Context:

Problem Information:
- Title: ${problemInfo?.title || "Unknown"}
- Description: ${problemInfo?.description || "No description available"}
- Constraints: ${problemInfo?.constraints || "No constraints specified"}
${testCasesInfo}
${solutionInfo}

${selectedCodeBlock || fullCodeBlock || ''}
${errorBlock || ''}

Student's Question: ${userPrompt}

Your goals:
- Fully understand the student's question before responding; never go off-topic.
- Guide the student to learn, not just give answers.
- Adapt to their intent: debug issues, explain concepts, or outline a plan step by step.
- Keep responses natural and concise.

Rules:
- Don’t make up details or reveal full solutions unless asked.
- Share only small code snippets or hints (1–3, increasing detail if needed).
- Explain code briefly and suggest meaningful tests or edge cases.
- Acknowledge correct work and offer small improvements.

Safety:
- Never copy internal solutions directly.
- If info is missing, clarify with one targeted question.`;
  }

  // === Unified Chat Method (v2) ===

  /**
   * Extended message event type with navigation support
   */
  private createUnifiedMessageEvent(
    conversationID: string,
    botResponse: string,
    citations: Array<{ pdfID: string; pageNumber: string }>,
    streaming: string | null,
    navigation?: NavigationAction,
    threadId?: string,
  ): UnifiedChatEvent {
    return {
      id: conversationID,
      data: {
        bot: {
          botResponse,
          id: conversationID,
          citations,
          streaming,
        },
        navigation,
        // The thread this turn belongs to. Additive: clients that ignore it keep
        // working exactly as before, and clients that echo it back on the next
        // request get server-owned history instead of having to resend it.
        conversationId: threadId,
      },
    };
  }

  /**
   * Unified chat endpoint that handles both PDF and Codegen flows
   * Uses AgentLoopService for iterative tool execution with environment awareness
   */
  async unifiedChat(
    request: UnifiedChatRequest,
    session: {
      userId: string;
      userSessionId: string;
      classId?: string;
    },
  ): Promise<Observable<UnifiedChatEvent>> {
    const conversationID = uuidv4();
    const {
      prompt,
      chatSummary,
      context,
      engineChoice,
      clientToolResult,
      clientToolTrail,
      conversation,
      conversationId: requestedThreadId,
    } = request;

    // Mint a thread id when the client didn't supply one. Without it every turn
    // is its own island: `stringTag` stays empty, so nothing groups the turns and
    // server-owned replay has no key to look them up by. The id is echoed back on
    // the stream so the client can adopt it for the rest of the conversation.
    const threadId = requestedThreadId || uuidv4();
    const { environment, pdf, codegen, app, experiment: experimentOverride } = context;
    const { userId, userSessionId } = session;
    let effectiveEngineChoice = engineChoice;

    // Determine chat type from context
    const chatType = this.inferChatType(context.environment, !!codegen);

    // Get classId from context or session. App-wide agent/navigation turns are
    // not scoped to a class, so classId may be absent — that's allowed; only the
    // class-scoped features (RAG, class prompts) are skipped when it's missing.
    const classId = pdf?.classId || app?.classId || session.classId;

    this.logger.debug(`Unified chat request - type: ${chatType}, classId: ${classId ?? '(none)'}, activeTab: ${environment.activeTab}`);

    // Check user session tokens
    const userSession = await this.userSessionService.userSession({
      id: userSessionId,
    });

    if (!userSession) {
      throw new Error('User session not found');
    }

    // Get user research notes (for personalization)
    const user = await this.userService.user({ id: userId });
    const researchNotes =
      user?.researchNotes ?? ({ CONTEXT_STUDY: 'control' } as JsonObject);
    const userGroup =
      ((researchNotes as JsonObject).CONTEXT_STUDY as string) ?? 'control';

    const researchNotesForSession =
      userSession?.researchNotesForSession ?? ({ PN_STUDY: 1 } as JsonObject);
    const PN_STUDY_RATIO =
      ((researchNotesForSession as JsonObject).PN_STUDY as number) ?? 1;
    const N = 4; // Number of document chunks to retrieve

    let experimentConfig: ResolvedExperimentConfig | null = null;
    const isExperimentStaff =
      user?.systemRole === 'admin' || user?.systemRole === 'instructor';
    if (experimentOverride) {
      if (!classId) {
        throw new BadRequestException(
          'Experiment preview requires a class context.',
        );
      }
      if (!isExperimentStaff) {
        throw new ForbiddenException(
          'Only admins and instructors can preview experiment variants.',
        );
      }
      experimentConfig = await this.experimentService.resolveVariantConfig(
        experimentOverride.experimentId,
        classId,
        experimentOverride.variantKey,
      );
      effectiveEngineChoice = experimentConfig.engine;
      this.logger.debug(
        `Experiment preview ${experimentConfig.experimentId} variant ` +
          `${experimentConfig.variantKey} applied for user ${userId}`,
      );
    } else if (!isExperimentStaff) {
      // Active-experiment override (v2 counterpart of the retired v1 chatPdf
      // wiring): if an active experiment assigns this student to a variant,
      // apply that variant's engine + system prompt. Staff are excluded —
      // activate() assigns only student enrollments, and resolving here would
      // sweep staff into the assignment table via the late-enrollee fallback;
      // staff simulate variants through the preview path above instead.
      // Resolves to null when there is no class or no active experiment, so
      // default behavior is unchanged.
      experimentConfig = await this.experimentService.resolveActiveConfig(
        userId,
        classId,
      );
      if (experimentConfig) {
        effectiveEngineChoice = experimentConfig.engine;
        this.logger.debug(
          `Experiment ${experimentConfig.experimentId} variant ` +
            `${experimentConfig.variantKey} applied for user ${userId}`,
        );
      }
    }

    // Create interaction record
    // Multi-step agent turns span several round-trips. The FIRST request creates
    // one interaction; each resume (clientToolResult present) reuses it via the
    // echoed interactionId, so the whole turn is a single history entry instead
    // of one per tool step.
    //
    // SECURITY (IDOR): the interactionId is echoed by the client, so we must
    // verify it actually belongs to this user before writing to it. If it
    // doesn't validate, ignore it and create a fresh interaction.
    let userChatInteraction: { id: string } | undefined;
    if (clientToolResult?.interactionId) {
      const [existing] = await this.interactionService.getInteractionsByIds([
        clientToolResult.interactionId,
      ]);
      if (existing && existing.userId === userId) {
        userChatInteraction = { id: existing.id };
      } else {
        this.logger.warn(
          `Ignoring client-supplied interactionId ${clientToolResult.interactionId} that does not belong to user ${userId}`,
        );
      }
    }
    // Resolve (or open) the thread this turn belongs to. A null result just
    // means the thread row could not be written — replay still works through the
    // legacy key, so a chat turn never depends on it.
    const conversationRow = await this.conversationService.resolve({
      userId,
      threadKey: threadId,
      classId,
      source: app ? 'app' : 'chat',
    });

    if (!userChatInteraction) {
      // Persist the turn even when there's no class (app-wide agent turns on
      // admin/UI pages). createInteraction stores classId=null for those, so
      // they still show up in chat history and can be reloaded.
      userChatInteraction = await this.interactionService.createInteraction(
        userSessionId,
        userId,
        classId ?? null,
        {
          type: 'frontend-interaction-chat',
          timestamp: new Date(),
          pdfId: pdf?.pdfId,
          pdfPage: pdf?.pageNumber,
          pdfMaterialType: pdf?.materialType,
          context: {
            content: {
              prompt: prompt,
              answer: '',
            },
            engineChoice: effectiveEngineChoice,
            experimentPreview:
              experimentOverride && experimentConfig
                ? {
                    experimentId: experimentConfig.experimentId,
                    variantKey: experimentConfig.variantKey,
                  }
                : undefined,
            experimentApplied:
              !experimentOverride && experimentConfig
                ? {
                    experimentId: experimentConfig.experimentId,
                    variantKey: experimentConfig.variantKey,
                  }
                : undefined,
          },
        },
        // Thread id groups all messages of this chat session into one history entry.
        threadId,
        conversationRow?.id,
      );
      if (conversationRow) {
        void this.conversationService.noteTurn(conversationRow.id);
      }
    }

    const { messages, tools, trace, usedServerHistory } =
      await this.assembleUnifiedContext({
      classId,
      userId,
      environment,
      pdf,
      codegen,
      app,
      chatSummary,
      experimentConfig,
      prompt,
      conversation,
      conversationId: threadId,
      currentInteractionId: userChatInteraction.id,
      conversationRowId: conversationRow?.id,
      clientToolResult,
      clientToolTrail,
      pnStudyRatio: PN_STUDY_RATIO,
      n: N,
      userGroup,
      engineChoice: effectiveEngineChoice,
      chatType,
      systemRole: user?.systemRole ?? 'user',
    });

    // Build agent execution context
    const agentContext: AgentExecutionContext = {
      userId: userId,
      userSessionId: userSessionId,
      classId: classId,
      chatType: chatType,
      engineChoice: effectiveEngineChoice,
      studentContext: pdf ? {
        pdfId: pdf.pdfId,
        pageNumber: pdf.pageNumber,
        materialType: pdf.materialType,
        chatSummary: chatSummary,
      } : undefined,
      codegenContext: codegen ? {
        problemId: codegen.problemId,
        codeContext: codegen.codeContext,
        selectedCode: codegen.selectedCode,
        errorContext: codegen.errorContext,
      } : undefined,
      environmentContext: {
        activeTab: environment.activeTab,
        activeView: environment.activeView,
        activeAppSlug: environment.activeAppSlug,
        activeAppName: environment.activeAppName,
        currentPath: environment.currentPath,
      },
      toolExecutor: this,
      // Always a real, persisted interaction now (class or classless) — so the
      // agent's final answer is logged to history via logAgentCompletion.
      interactionId: userChatInteraction.id,
      // Routes requests that share a stable head to the same cache shard.
      // Deliberately keyed on class/type/mode/toolset and NOT on the user or
      // conversation: every student in a class, in the same mode, should land on
      // the same warm prefix.
      cacheKey: buildPromptCacheKey({
        classId,
        chatType,
        mode: this.resolvePromptMode(pdf, codegen, app),
        // The variant's instructions are part of the stable head, so it is part
        // of the prefix identity.
        variantKey: experimentConfig?.variantKey,
        toolNames: tools.map((t) => t.function?.name ?? 'unknown'),
      }),
    };

    // Content accumulator for streaming
    const contentAccumulator = { value: '' };
    const citations: Array<{ pdfID: string; pageNumber: string }> = [];
    let pendingNavigation: NavigationAction | undefined;

    // DEBUG: log the exact context the agent is seeded with this turn, so we can
    // see whether conversation history / tool results are preserved or dropped.
    // The trail itself is seeded inside the assembler; this only counts it.
    const resumeSteps =
      clientToolTrail?.length ?? (clientToolResult ? 1 : 0);
    this.logger.debug(
      `[AGENT-CTX] resume=${resumeSteps > 0} steps=${resumeSteps} prompt="${prompt}" ` +
        `conversationTurns=${conversation?.length ?? 0} tools=${tools.length} ` +
        `seededMessages=${(messages as any[]).length}`,
    );

    // Once the thread outgrows the replay window, fold its oldest turns into a
    // summary — on the queue. Deliberately not awaited: this turn already has
    // the context it needs, and compaction only changes what the NEXT turn
    // sees. A failure here must never cost the student their answer.
    //
    // It lives here rather than inside the assembler so that assembling a prompt
    // stays free of side effects, and inspecting a conversation cannot schedule
    // work against it.
    if (usedServerHistory && threadId) {
      void this.conversationHistoryService
        .needsCompaction(userId, threadId)
        .then((needed) =>
          needed
            ? this.contextJobsService.enqueueConversationCompaction({
                userId,
                conversationId: threadId,
                // The thread's memory gets written by the model that will read
                // it back, not by whichever engine the worker defaults to.
                engineChoice: effectiveEngineChoice,
              })
            : null,
        )
        .catch((error) =>
          this.logger.warn(
            `Compaction check failed for thread ${threadId}: ${error instanceof Error ? error.message : error}`,
          ),
        );
    }

    // Block layout and prefix fingerprint — no student content, so this is safe
    // to leave on. Compare `prefix=` across consecutive turns of one
    // conversation: when it changes, the provider's prompt cache missed, and
    // the per-block sizes say which block is worth attacking.
    const describedContext = trace.describe(
      messages as ChatCompletionMessageParam[],
      tools.map((t) => t.function?.name ?? 'unknown'),
    );
    this.logger.debug(`[CTX-BLOCKS] ${formatContextBlocks(describedContext)}`);

    // A prompt that disagrees with itself is not a prompt-wording problem, and
    // it is invisible in the response — so say it at warn level, not debug.
    if (describedContext.conflicts.length) {
      this.logger.warn(
        `[CTX-CONFLICT] ${describedContext.conflicts.join('; ')}`,
      );
    }

    // Persist the same metadata against the interaction so a conversation can be
    // reconstructed after the fact without re-running it. v1 already snapshots
    // its whole messages array into ServerAction.context; this is the metadata-
    // only equivalent for v2.
    void this.logContextSnapshot(userChatInteraction.id, describedContext, {
      resume: !!clientToolResult,
      conversationTurns: conversation?.length ?? 0,
      engineChoice: effectiveEngineChoice,
    });
    // The full message dump includes user/conversation content — gate it behind
    // an explicit flag so it isn't emitted (even in dev) unless deliberately on.
    if (process.env.LOG_LEVEL_DEBUG === 'true') {
      this.logger.debug(
        '[AGENT-CTX] messages:\n' +
          (messages as any[])
            .map((m, i) => {
              const role = m.role;
              const tc = m.tool_calls
                ? ` tool_calls=[${m.tool_calls.map((t: any) => t.function?.name).join(',')}]`
                : '';
              const content =
                typeof m.content === 'string'
                  ? m.content.replace(/\s+/g, ' ').slice(0, 200)
                  : m.content == null
                    ? '(null)'
                    : JSON.stringify(m.content).slice(0, 200);
              return `  [${i}] ${role}${tc}: ${content}`;
            })
            .join('\n'),
      );
    }

    // Execute agent loop and transform events
    return this.agentLoopService
      .executeAgentLoop(
        messages as ChatCompletionMessageParam[],
        tools,
        agentContext,
        {
          maxIterations: 10,
          maxTokensPerIteration: 1500,
          streamIntermediateResponses: true,
        },
      )
      .pipe(
        map((event) => this.transformUnifiedAgentEvent(
          event,
          conversationID,
          citations,
          contentAccumulator,
          pendingNavigation,
          (nav) => { pendingNavigation = nav; },
          userChatInteraction.id,
          threadId,
        )),
        filter((event): event is UnifiedChatEvent => event !== null),
      );
  }

  /**
   * Infer chat type from environment context and codegen presence
   */
  private inferChatType(
    environment: EnvironmentContext,
    hasCodegenContext: boolean,
  ): 'pdf' | 'codegen' {
    // If on exercises tab or has codegen context, use codegen type
    if (environment.activeTab === 'exercises' || hasCodegenContext) {
      return 'codegen';
    }
    // If on an app tab with codegen app, use codegen type
    if (environment.activeTab === 'app' && environment.activeAppSlug === 'codegen') {
      return 'codegen';
    }
    // Default to pdf for materials, chat, or other tabs
    return 'pdf';
  }

  /**
   * Build unified system prompt with tool guidance and environment awareness
   */
  private async buildUnifiedSystemPrompt(
    classId: string | undefined,
    userId: string,
    environment: EnvironmentContext,
    pdfContext?: StudentContext,
    codegenContext?: CodegenContext,
    appContext?: AppContext,
    chatSummary?: string,
    experimentConfig?: ResolvedExperimentConfig | null,
    trace?: ContextTrace,
    /**
     * Legacy layout only. When false the environment block is emitted separately,
     * after the replayed history, so this system message stays byte-identical
     * across the turns of a session and the provider can cache it.
     */
    inlineEnvironment = true,
    /**
     * The class this turn is scoped to, already resolved by the caller. Passed
     * in rather than re-fetched so the tiered layout — which needs the class
     * name for its separately-emitted environment block — does not pay for a
     * second lookup of the row this method was going to read anyway.
     */
    resolvedClassMetadata?: ClassMetadata,
  ): Promise<ChatCompletionMessageParam[]> {
    const messages: ChatCompletionMessageParam[] = [];

    // Get class info for custom prompts — only when scoped to a class. App-wide
    // agent/navigation turns have no class, so skip the class-specific bits.
    const classMetadata =
      resolvedClassMetadata ??
      ((classId
        ? ((await this.classService.getClassById(classId))?.classMetadata ??
          undefined)
        : undefined) as unknown as ClassMetadata | undefined);

    // What "this class" / "here" resolve to. Without it the model has a classID
    // in the request but never in the prompt, so it burns a list_classes
    // round-trip to recover an id it was already scoped to — and a class NAME
    // is not a valid classID, so guessing builds a page whose data never loads.
    const currentClass = classId
      ? { classID: classId, className: classMetadata?.className }
      : undefined;

    // 1. Base system prompt with capabilities
    let systemPrompt = UNIFIED_SYSTEM_PROMPTS.basePrompt;

    // 2. Add tool usage guidelines
    systemPrompt += '\n' + UNIFIED_SYSTEM_PROMPTS.toolGuidance;

    // 3. Add environment awareness (interpolate template)
    //
    // This is the single most expensive line in the file: the interpolated
    // values (active tab, PDF page number, app slug) change almost every turn,
    // so inlining them here rewrites the ~2,400-token head and destroys a prefix
    // that otherwise caches at 88%. The tiered layout emits it as its own block
    // after the history instead.
    if (inlineEnvironment) {
      systemPrompt +=
        '\n' +
        this.renderEnvironmentBlock(
          environment,
          pdfContext,
          codegenContext,
          appContext,
          currentClass,
        );
    }

    // 4. Add material-type specific prompt.
    //
    // Dispatched on `resolvePromptMode` rather than re-deriving the mode here.
    // This block and `getModeReminder` used to walk their own copies of the
    // same if/else, and the guardrail bypass lived in the gap between them:
    // both branched to App Mode, but only one of them was ever going to be
    // noticed. One decision, three consumers (here, the reminder, the cache key).
    const promptMode = this.resolvePromptMode(
      pdfContext,
      codegenContext,
      appContext,
    );

    if (promptMode === 'recitation') {
      systemPrompt += '\n' + UNIFIED_SYSTEM_PROMPTS.materialTypePrompts.recitation;
    } else if (promptMode === 'codegen') {
      systemPrompt += '\n' + UNIFIED_SYSTEM_PROMPTS.materialTypePrompts.codegen;
    } else if (promptMode === 'classMaterials') {
      systemPrompt += '\n' + UNIFIED_SYSTEM_PROMPTS.materialTypePrompts.classMaterials;
    } else {
      // App-scoped: App Mode, then the style the app's registration asks for.
      systemPrompt += '\n' + UNIFIED_SYSTEM_PROMPTS.materialTypePrompts.app;
      // The app can request a tutoring style (e.g. codegen requests 'guidance').
      // Append it after App Mode so the guardrail reads as the later override.
      //
      // We keep this guardrail even during experiments. Rather than hard-removing
      // it, we let the model resolve precedence: an active experiment's
      // AUTHORITATIVE instructions (section 5) come later and are explicitly told
      // to override answer-giving policy on conflict, so a variant can still steer
      // the behavior while every non-conflicting rule here stays in force.
      const tutoringPrompt =
        promptMode !== 'app' &&
        UNIFIED_SYSTEM_PROMPTS.materialTypePrompts[promptMode];
      if (tutoringPrompt) {
        systemPrompt += '\n' + tutoringPrompt;
      }
    }

    // 5. Add class/experiment-specific customizations if available.
    //
    // The experiment layer is ADDITIVE and authoritative: it does NOT replace the
    // base persona, tool guidance, environment awareness, or app mode above —
    // those stay so the agent still operates the app correctly and knows the
    // current context. It only asserts precedence over the pedagogical guidance
    // (teaching style, tone, answer-giving policy). We apply ONLY
    // defaultSystemMessage: the legacy classMaterials/recitation split is
    // PDF-shaped and does not map onto v2's app/codegen sessions, and a single
    // authoritative override reads more cleanly to the model.
    const experimentDefault =
      experimentConfig?.systemPrompts?.defaultSystemMessage;
    if (experimentDefault) {
      systemPrompt +=
        '\n\n## Experiment Variant Instructions (AUTHORITATIVE — teaching behavior)\n' +
        "The following instructions define THIS session's teaching style, tone, and " +
        'answer-giving policy. Where they conflict with earlier guidance about how much ' +
        'to help, whether to give answers, or persona/tone, FOLLOW THESE INSTEAD. They ' +
        'do NOT change how you operate the application: keep following all tool-usage ' +
        'rules, the app-operation workflow, and the "never submit a form" rule above.\n\n' +
        experimentDefault;
    } else if (classMetadata?.systemPrompts?.defaultSystemMessage) {
      systemPrompt += '\n\n## Class-Specific Instructions\n';
      systemPrompt += classMetadata.systemPrompts.defaultSystemMessage;
    }

    messages.push({ role: 'system', content: systemPrompt });
    // The stable tier — identical on every turn of a session, and therefore the
    // only part a provider's prompt cache can reuse. That is only true when the
    // environment block is NOT inlined above: measured, a PDF page turn used to
    // change this block's hash and take the whole prefix with it.
    trace?.mark(messages, 'stable-head', 'stable');

    // 6. Add personalization if available.
    //
    // A merged rolling profile, not one line per past session: the old rendering
    // grew without bound as a student accumulated sessions, and because it
    // changed on every new session it also kept moving a block that sits inside
    // the cacheable prefix. Sanitisation happens on read, so legacy rows written
    // before that existed are covered too.
    const personalization =
      await this.materialPersonalizationService.getRollingProfileBlock(userId);
    if (personalization) {
      messages.push({ role: 'system', content: personalization });
    }
    trace?.mark(messages, 'personalization', 'stable');

    // 7. Add chat summary if provided.
    //
    // Capped here as well as in the DTO: this is free text the client supplies
    // and it goes into a SYSTEM message, so an unbounded value is both a cost
    // problem and the most privileged position in the prompt to be handing to
    // unvalidated input.
    if (chatSummary && chatSummary.length > 0) {
      messages.push({
        role: 'system',
        content: `Previous conversation context:\n${chatSummary.slice(0, MAX_CHAT_SUMMARY_CHARS)}`,
      });
    }
    // History, not stable — despite sitting in the head's block group.
    //
    // This is client-supplied free text about the conversation so far. Marked
    // `stable` it counted toward `prefixHash`, which is both wrong (it is not
    // stable; a client that regenerates its summary each turn changes it every
    // turn) and dangerous: a caller could move the cached prefix on every
    // request without anything reporting a problem. That is the 0%-cache
    // failure this whole layout exists to prevent, reachable through a
    // different door.
    trace?.mark(messages, 'chat-summary', 'history');

    return messages;
  }

  /**
   * Assemble everything the model sees for one unified-chat turn: the message
   * array, the tool list, and a trace describing what each block is.
   *
   * Shared by the live `/chat/v2` path and the staff context-preview endpoint so
   * the two cannot drift — a preview that shows a different prompt than the one
   * actually sent would be worse than no preview at all.
   *
   * Free of side effects: it retrieves and builds, but writes nothing, queues
   * nothing and calls no LLM. That is what lets the preview endpoint run the
   * identical code path — anything a real turn should trigger (persisting the
   * turn, scheduling compaction) belongs to the caller.
   */
  private async assembleUnifiedContext(params: {
    classId?: string;
    userId: string;
    environment: EnvironmentContext;
    pdf?: StudentContext;
    codegen?: CodegenContext;
    app?: AppContext;
    chatSummary?: string;
    experimentConfig?: ResolvedExperimentConfig | null;
    prompt: string;
    conversation?: ConversationTurn[];
    /** Thread key, used to replay server-owned history when the client sends none. */
    conversationId?: string;
    /** This turn's own interaction row, so it isn't replayed as its own history. */
    currentInteractionId?: string;
    /** Resolved Conversation row id, when the thread has one. */
    conversationRowId?: string | null;
    clientToolResult?: ClientToolResult;
    /** Every client-tool step taken so far this turn, oldest first. */
    clientToolTrail?: ClientToolResult[];
    pnStudyRatio: number;
    n: number;
    userGroup: string;
    engineChoice?: EngineChoice;
    chatType: 'pdf' | 'codegen';
    systemRole: string;
  }): Promise<{
    messages: ChatCompletionMessageParam[];
    tools: ToolDefinition[];
    trace: ContextTrace;
    /**
     * Whether history came from the server's own record. The caller uses it to
     * decide whether this thread is worth a compaction check — assembly itself
     * stays free of side effects so the preview endpoint can reuse it verbatim.
     */
    usedServerHistory: boolean;
  }> {
    const {
      classId,
      userId,
      environment,
      pdf,
      codegen,
      app: requestedApp,
      chatSummary,
      experimentConfig,
      prompt,
      conversation,
      conversationId,
      currentInteractionId,
      conversationRowId,
      clientToolResult,
      clientToolTrail,
      pnStudyRatio,
      n,
      userGroup,
      engineChoice,
      chatType,
      systemRole,
    } = params;

    // Replace the request's app block with the registration's before anything
    // reads it. `appSlug` and `tutoringMode` are the student's browser talking;
    // only the class's installed apps decide what an app-scoped turn may ask
    // for. An unregistered slug keeps its context text (already labelled as
    // untrusted data downstream) but loses every mode-affecting field, so it
    // cannot buy its way into a weaker prompt.
    const app = await this.resolveTrustedAppContext(classId, requestedApp);

    // The trace labels each block with its tier as the array is assembled — it
    // observes, it does not change what is sent.
    const trace = new ContextTrace();
    let usedServerHistory = false;

    const tiered = isTieredAssemblyEnabled();

    // Which history source this turn will use — decided here rather than at the
    // point of use, because the client's `chatSummary` block is emitted inside
    // the head group, before we get there.
    //
    // Same predicate as the replay below. A client that has stopped sending
    // `conversation` is on server-owned history, where the server's own summary
    // is authoritative; honouring its `chatSummary` too would put two blocks
    // both headed "Previous conversation context:" into one prompt, with
    // different contents and no way for the model to know which is current.
    // Read the server's record of this thread BEFORE the prompt is assembled,
    // because whether the client's `chatSummary` survives depends on whether
    // there is anything to replace it with.
    //
    // This predicate used to be `!!conversationId`, which is always true: the
    // id is minted server-side when the client doesn't send one. So a client
    // that supplied only a summary had it blanked and got a brand-new thread
    // that matched no rows — the whole conversation, silently gone.
    //
    // Keying on "did the CLIENT supply the id" would fix that case and still be
    // the wrong shape: it lets client-controlled input decide whether we trust
    // the client. This asks the only question that matters, and the answer
    // comes from the database rather than the request body.
    const serverWindow =
      !conversation?.length && conversationId
        ? await this.conversationHistoryService.getWindow({
            userId,
            conversationId,
            excludeInteractionId: currentInteractionId,
            conversationRowId,
          })
        : null;
    const hasServerHistory = !!(
      serverWindow &&
      (serverWindow.messages.length || serverWindow.summary)
    );
    const effectiveChatSummary = hasServerHistory ? '' : chatSummary || '';

    // Resolved once here and handed to both consumers: the system prompt (custom
    // class prompts) and, under the tiered layout, the environment block that is
    // emitted separately further down.
    const classMetadata = classId
      ? (((await this.classService.getClassById(classId))?.classMetadata ??
          undefined) as unknown as ClassMetadata | undefined)
      : undefined;
    const currentClass = classId
      ? { classID: classId, className: classMetadata?.className }
      : undefined;

    const messages = await this.buildUnifiedSystemPrompt(
      classId,
      userId,
      environment,
      pdf,
      codegen,
      app,
      effectiveChatSummary,
      experimentConfig,
      trace,
      !tiered,
      classMetadata,
    );

    // Freshly-derived context for this turn: the environment block, the
    // retrieved course chunks, the editor code. All of it changes turn to turn.
    //
    // Under the tiered layout this runs AFTER the history is replayed, so the
    // prefix (stable head → profile → summary → history) grows append-only and
    // stays cacheable. Under the legacy layout it runs before, which is what
    // truncated the cacheable prefix at block 0 on every page turn.
    const addVolatileContext = async () => {
      if (tiered) {
        messages.push({
          role: 'system',
          content: this.renderEnvironmentBlock(
            environment,
            pdf,
            codegen,
            app,
            currentClass,
          ),
        });
        trace.mark(messages, 'environment', 'volatile');
      }

      // pdf and codegen stay mutually exclusive, but app context (e.g. the Code
      // tab's editor code) always injects — it must not be silently dropped
      // just because a pdf context is also present.
      if (pdf) {
        // A PDF context always carries a classId. A failed retrieval (e.g. the
        // embedding provider rejecting the request) must not kill the whole
        // turn — degrade to answering without page context; rag-tool failures
        // are already caught per-tool.
        try {
          await this.addPdfContextToMessages(
            messages,
            pdf,
            (classId ?? pdf.classId)!,
            prompt,
            pnStudyRatio,
            n,
            userGroup,
            engineChoice,
          );
        } catch (error) {
          this.logger.warn(
            `Failed to add PDF context, continuing without it: ${error instanceof Error ? error.message : error}`,
          );
        }
        trace.mark(messages, 'page-context', 'volatile');
      } else if (codegen) {
        await this.addCodegenContextToMessages(messages, codegen, prompt);
        trace.mark(messages, 'codegen-context', 'volatile');
      }
      if (app) {
        this.addAppContextToMessages(messages, app);
        trace.mark(messages, 'app-context', 'volatile');
      }
    };

    if (!tiered) {
      await addVolatileContext();
    }

    // Replay prior conversation turns so the agent remembers the back-and-forth
    // (e.g. "add a flag to uet200" → the form it's on → which value). This is the
    // real history, not the lossy chatSummary, and it is REQUIRED on resume turns
    // too — without it the agent is near-blind and misreads the goal (e.g. treats
    // "token limit" as a question instead of a form value). We drop the transient
    // "Using <tool>..." narration bubbles so only real turns are replayed.
    // History source. The client still wins when it sends `conversation`, so
    // kiwi-ui keeps working unchanged; when it doesn't (and we have a thread
    // id), the server replays its own record instead. That is the migration
    // path — the frontend can stop sending history whenever it likes, and the
    // fields can be dropped a release later.
    if (serverWindow) {
      // Already fetched above — the summary decision depended on it.
      const window = serverWindow;
      if (window.summary) {
        messages.push({
          role: 'system',
          content: `Previous conversation context:\n${window.summary}`,
        });
      }
      for (const message of window.messages) {
        messages.push(message);
      }
      if (window.messages.length) {
        this.logger.debug(
          `[CTX-HISTORY] replayed ${window.messages.length} server-owned message(s) ` +
            `for thread ${conversationId}`,
        );
        usedServerHistory = true;
      }
    } else if (conversation?.length) {
      // Bound the replay here, not only in the DTO: the global ValidationPipe in
      // main.ts is commented out, so the decorators on UnifiedChatRequest do not
      // currently run and this array arrives unbounded from the browser.
      // Truncate rather than reject — a 400 loses the student their turn, and
      // the newest turns are the ones that carry the thread of the conversation.
      const replayed = conversation.slice(-MAX_CONVERSATION_TURNS);
      if (replayed.length < conversation.length) {
        this.logger.warn(
          `[CTX-BUDGET] replaying the newest ${replayed.length} of ` +
            `${conversation.length} client-supplied turns`,
        );
      }

      for (const turn of replayed) {
        // The role is client-controlled. Anything other than user/assistant —
        // notably 'system' — would let the caller inject instructions straight
        // into the prompt, so unrecognised roles are treated as the student
        // speaking rather than trusted.
        const role = turn.role === 'assistant' ? 'assistant' : 'user';
        const content = (turn.content || '').trim().slice(0, MAX_TURN_CONTENT_CHARS);
        if (!content) continue;
        if (/^using\s+\w+\.\.\.$/i.test(content)) continue; // skip tool narration
        messages.push({ role, content });
      }
    }
    trace.mark(messages, 'history', 'history');

    if (tiered) {
      await addVolatileContext();
    }

    // Re-state the active tutoring mode's hard rules in the LAST position before
    // the user's prompt. The full mode prompt is in the system message far above,
    // behind the environment block, the retrieved context and the whole replayed
    // conversation — far enough back that a long chat can talk around it (#215,
    // #46). This costs ~150 tokens and only fires for guided sessions.
    const modeReminder = this.getModeReminder(
      pdf,
      codegen,
      app,
      experimentConfig,
    );
    if (modeReminder) {
      messages.push({ role: 'system', content: modeReminder });
    }
    trace.mark(messages, 'mode-reminder', 'volatile');

    // Add the current user prompt. On a resume the conversation already contains
    // the goal, but re-stating it keeps the immediate intent salient.
    messages.push({
      role: 'user',
      content: prompt,
    });
    trace.mark(messages, 'prompt', 'current');

    // Resume a paused client-tool loop: seed the assistant tool_call and the
    // browser-executed result for EVERY step taken so far this turn, oldest
    // first.
    //
    // The agent loop ends the SSE stream on each client tool, and assembly
    // rebuilds `messages` from scratch on the resume request — so whatever is
    // not seeded here, the agent has simply never seen. Seeding only the latest
    // step meant it forgot the sitemap the moment it listed classes, and forgot
    // the classID the moment it navigated; the only move left was to re-fetch
    // what it already had, which is exactly the observed get_sitemap ->
    // list_classes -> navigate -> get_sitemap loop.
    //
    // `clientToolResult` is the single-step legacy shape; keep honouring it so
    // an older frontend still resumes (just without the memory).
    const toolTrail = clientToolTrail?.length
      ? clientToolTrail
      : clientToolResult
        ? [clientToolResult]
        : [];

    toolTrail.forEach((step, index) => {
      messages.push({
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: step.toolCallId,
            type: 'function' as const,
            function: {
              name: step.tool,
              arguments: JSON.stringify(step.args ?? {}),
            },
          },
        ],
      });
      trace.mark(messages, 'resume-tool-call', 'current');
      // Cap the browser tool result (observe snapshots of control-heavy pages
      // can be tens of KB) so resume turns can't blow the context window. Only
      // the step that just finished gets the full budget.
      const isLatest = index === toolTrail.length - 1;
      const rawClientResult =
        typeof step.result === 'string'
          ? step.result
          : JSON.stringify(step.result);
      messages.push({
        role: 'tool',
        tool_call_id: step.toolCallId,
        content: (step.isError
          ? `Error: ${rawClientResult}`
          : rawClientResult
        ).slice(
          0,
          isLatest
            ? CONTEXT_BUDGET.maxToolResultChars
            : CONTEXT_BUDGET.maxEarlierToolResultChars,
        ),
      });
      trace.mark(messages, 'resume-tool-result', 'current');
    });

    if (toolTrail.length) {
      this.logger.debug(
        `Resuming agent loop with ${toolTrail.length} client tool step(s): ` +
          toolTrail.map((step) => step.tool).join(' -> '),
      );
    }

    // Get enabled tools for this class (includes navigate tool)
    const ragTools = await this.toolRegistryService.getToolsForClass(
      classId,
      chatType,
      userId,
    );

    // Merge client-side (browser) tools so the agent can drive the UI from chat.
    //
    // Deduplicated by name, client definition winning. `navigate` exists in both
    // sets with DIFFERENT schemas (the built-in takes {tab, pdfId, exerciseId},
    // the client takes {destination, path, params}), and sending both meant the
    // model picked one at random — while `ToolRegistryService.executeTool`
    // dispatches any `navigate` call to the client, because it checks
    // CLIENT_TOOL_NAMES before its own handlers. So a model that followed the
    // built-in schema produced arguments the browser could not act on, which is
    // the shape of the failures in #210. Keeping the definition that actually
    // executes also drops ~1KB of duplicate schema from the cached prefix.
    const clientTools = clientToolsForRole(systemRole) as ToolDefinition[];
    const clientToolNames = new Set(
      clientTools.map((t) => t.function?.name).filter(Boolean),
    );
    const shadowed = ragTools.filter((t) =>
      clientToolNames.has(t.function?.name),
    );
    if (shadowed.length) {
      this.logger.debug(
        `Dropping ${shadowed.length} server tool definition(s) shadowed by a client tool: ` +
          shadowed.map((t) => t.function?.name).join(', '),
      );
    }
    const tools = [
      ...ragTools.filter((t) => !clientToolNames.has(t.function?.name)),
      ...clientTools,
    ];

    this.logger.debug(`Loaded ${tools.length} tools for unified chat`);

    return {
      messages: messages as ChatCompletionMessageParam[],
      tools,
      trace,
      usedServerHistory,
    };
  }

  /**
   * Assemble a unified-chat turn and describe it, without calling the model.
   *
   * The only way to see what the agent actually receives used to be a truncated
   * debug log behind an env flag. This returns the real block layout — sizes,
   * tiers, per-block hashes, the tool order and the prefix fingerprint — for the
   * exact same assembly the live endpoint uses.
   *
   * @param includeContent returns the raw block text as well. That is student
   *   conversation content, so the caller must be authorized for it.
   */
  async previewUnifiedContext(
    request: UnifiedChatRequest,
    session: { userId: string; userSessionId: string; classId?: string },
    includeContent = false,
  ): Promise<ContextPreviewResponse> {
    const {
      prompt,
      chatSummary,
      context,
      engineChoice,
      clientToolResult,
      clientToolTrail,
      conversation,
    } = request;
    const { environment, pdf, codegen, app } = context;
    const { userId } = session;

    const chatType = this.inferChatType(environment, !!codegen);
    const classId = pdf?.classId || app?.classId || session.classId;

    const user = await this.userService.user({ id: userId });
    const researchNotes =
      user?.researchNotes ?? ({ CONTEXT_STUDY: 'control' } as JsonObject);
    const userGroup =
      ((researchNotes as JsonObject).CONTEXT_STUDY as string) ?? 'control';

    // Experiment resolution mirrors the live path so a preview reflects the
    // variant a student in this class would actually get. Failures degrade to
    // the default prompt rather than failing the preview.
    let experimentConfig: ResolvedExperimentConfig | null = null;
    if (classId) {
      try {
        // (userId, classId) — same order as the live path. Swapped, this
        // silently resolves nothing and the preview shows the default prompt
        // instead of the variant a student in this class actually receives,
        // which is exactly the drift this endpoint exists to catch.
        experimentConfig = await this.experimentService.resolveActiveConfig(
          userId,
          classId,
        );
      } catch (error) {
        this.logger.warn(
          `Preview: experiment resolution failed, using defaults: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    const { messages, tools, trace } = await this.assembleUnifiedContext({
      classId,
      userId,
      environment,
      pdf,
      codegen,
      app,
      chatSummary,
      experimentConfig,
      prompt,
      conversation,
      conversationId: request.conversationId,
      clientToolResult,
      clientToolTrail,
      // Same defaults the live path uses when there is no session override.
      pnStudyRatio: 1,
      n: 4,
      userGroup,
      engineChoice: (experimentConfig?.engine as EngineChoice) ?? engineChoice,
      chatType,
      systemRole: user?.systemRole ?? 'user',
    });

    // The layout is what a teacher needs (sizes, tiers, what moved). The raw
    // text also carries retrieved course material — including, on a class whose
    // documents are not flagged, answer-key variants (#219) — so it stays
    // admin-only rather than open to every staff role the guard admits.
    const mayReadContent = user?.systemRole === 'admin';
    if (includeContent && !mayReadContent) {
      this.logger.warn(
        `Context preview: user ${userId} (role ${user?.systemRole ?? 'user'}) ` +
          'requested raw block content; returning metadata only.',
      );
    }

    const described = trace.describe(
      messages,
      tools.map((t) => t.function?.name ?? 'unknown'),
      includeContent && mayReadContent,
    );

    // Build the response explicitly rather than spreading `described`: that
    // object carries the full `messages` array, and Nest does not strip
    // undeclared properties, so spreading would return every block's raw text
    // to any staff caller and defeat the admin gate above.
    return {
      blocks: described.blocks.map((block) => ({
        index: block.index,
        role: block.role,
        label: block.label,
        tier: block.tier,
        chars: block.chars,
        estTokens: block.estTokens,
        // Folded in per block so a caller can diff two previews directly
        // instead of correlating two parallel arrays.
        hash: described.blockHashes[block.index]?.hash,
        ...(block.content !== undefined ? { content: block.content } : {}),
      })),
      toolNames: described.toolNames,
      prefixHash: described.prefixHash,
      totals: described.totals,
    };
  }

  /**
   * Persist the block layout of one assembled turn.
   *
   * Metadata only — block labels, tiers, sizes and hashes, never the text. That
   * keeps the snapshot safe to retain (it is student conversation content
   * otherwise) while still answering the questions that matter after the fact:
   * how big was each block, and did the cacheable prefix move?
   *
   * Fire-and-forget: a failed snapshot must never break a chat turn.
   */
  private async logContextSnapshot(
    interactionId: string,
    context: AssembledContext,
    meta: {
      resume: boolean;
      conversationTurns: number;
      engineChoice?: EngineChoice;
    },
  ): Promise<void> {
    try {
      await this.interactionService.createServerAction({
        interactionId,
        type: 'chat-context-snapshot',
        context: {
          prefixHash: context.prefixHash,
          totals: context.totals,
          toolNames: context.toolNames,
          blocks: context.blocks.map((b) => ({
            index: b.index,
            role: b.role,
            label: b.label,
            tier: b.tier,
            chars: b.chars,
            estTokens: b.estTokens,
            hash: context.blockHashes[b.index]?.hash,
          })),
          resume: meta.resume,
          conversationTurns: meta.conversationTurns,
        },
        botResponse: '',
        engineChoice: meta.engineChoice,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.warn(
        `Failed to record context snapshot: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /**
   * The short restatement of the active tutoring mode's hard rules, or undefined
   * when this turn isn't in a guarded mode.
   *
   * Mirrors the mode selection in `buildUnifiedSystemPrompt` exactly: an app
   * context wins and may request `tutoringMode`; otherwise a codegen context is
   * unguarded; otherwise a recitation PDF is guarded.
   */
  private getModeReminder(
    pdfContext?: StudentContext,
    codegenContext?: CodegenContext,
    appContext?: AppContext,
    experimentConfig?: ResolvedExperimentConfig | null,
  ): string | undefined {
    const mode = this.resolvePromptMode(pdfContext, codegenContext, appContext);

    let reminder: string | undefined;
    if (mode === 'guidance') reminder = UNIFIED_SYSTEM_PROMPTS.modeReminders.guidance;
    if (mode === 'recitation')
      reminder = UNIFIED_SYSTEM_PROMPTS.modeReminders.recitation;
    if (!reminder) return undefined;

    // An active variant's instructions are declared AUTHORITATIVE over
    // answer-giving policy in the stable head — but this reminder lands last,
    // and last is what the model weights most. Left as it was, the reminder
    // quietly beat the variant it was told to defer to. Say the precedence out
    // loud rather than letting position decide it.
    if (experimentConfig?.systemPrompts?.defaultSystemMessage) {
      reminder += '\n' + UNIFIED_SYSTEM_PROMPTS.modeReminders.experimentOverride;
    }

    return reminder;
  }

  /**
   * Which pedagogical mode this turn is in.
   *
   * Single source of truth for the branch that `buildUnifiedSystemPrompt`
   * (section 4), `getModeReminder` and the prompt cache key all have to agree
   * on. They must agree: the mode picks which prompt goes into the stable head,
   * so a cache key that disagreed would let two genuinely different heads share
   * a cache slot.
   */
  /**
   * The app block the prompt is allowed to act on, given what is registered.
   *
   * Only `tutoringMode` is authority-bearing, so only it is taken from the
   * registration; `appContext` text survives either way because it is rendered
   * as clearly-labelled untrusted data, not as instructions.
   *
   * A registration that declares no mode falls back to the request's value.
   * That is deliberate and safe in one direction only: the DTO admits just
   * `'guidance'`, the strictest mode we have, so the request can make the
   * guardrail tighter and never looser. Once apps carry `tutoringMode` in their
   * config the fallback can go.
   *
   * @returns the sanitized block, or `undefined` when there was no app block.
   */
  private async resolveTrustedAppContext(
    classId: string | undefined,
    requested?: AppContext,
  ): Promise<AppContext | undefined> {
    if (!requested) return undefined;

    const registered = await this.kiwiAppService
      .resolveChatApp(classId, requested.appSlug)
      .catch((error) => {
        // Fail closed: an unreachable registry must not hand the caller a mode
        // it could not verify.
        this.logger.warn(
          `App registration lookup failed for "${requested.appSlug}": ` +
            `${error instanceof Error ? error.message : error}`,
        );
        return null;
      });

    if (!registered) {
      this.logger.warn(
        `[CTX-APP] "${requested.appSlug}" is not an enabled app for class ` +
          `${classId ?? 'none'} — honouring only a request to TIGHTEN the mode`,
      );
      // Unregistered is not the same as untrusted-in-both-directions.
      //
      // Stripping the mode here was a real regression: the Code tab asks for
      // 'guidance' on every class (kiwi-ui ClassIDE.tsx) and `resolveChatApp`
      // returns null whenever the turn has no classId, so a class without an
      // enabled codegen row silently lost its never-reveal guardrail and the
      // model went back to handing over full solutions.
      //
      // 'guidance' is the strictest mode there is, so accepting it can only
      // make the guardrail tighter — which is exactly what the docstring above
      // promises. The bypass this check exists to close was a request LOOSENING
      // the mode, and that is still refused: recitation is resolved before the
      // app block, so a worksheet can never be downgraded, and the only
      // transition reachable from here is plain app -> guidance.
      //
      // Compared literally rather than through the DTO on purpose: the global
      // ValidationPipe is commented out, so the @IsEnum on tutoringMode does
      // not run and an arbitrary string would otherwise reach the cache key.
      const tightening = requested.tutoringMode === 'guidance';
      return {
        ...requested,
        tutoringMode: tightening ? 'guidance' : undefined,
      };
    }

    // Validated against the real prompt keys, not just trusted: the mode also
    // becomes a segment of the prompt cache key, and a typo in an app's config
    // would otherwise mint a cache shard of its own.
    const declared = registered.tutoringMode;
    if (declared && !PROMPT_MODES.includes(declared as PromptMode)) {
      this.logger.warn(
        `[CTX-APP] app "${requested.appSlug}" declares unknown tutoringMode ` +
          `"${declared}" — falling back to plain app mode`,
      );
      return { ...requested, tutoringMode: undefined };
    }

    return {
      ...requested,
      tutoringMode: (declared ??
        requested.tutoringMode) as AppContext['tutoringMode'],
    };
  }

  private resolvePromptMode(
    pdfContext?: StudentContext,
    codegenContext?: CodegenContext,
    appContext?: AppContext,
  ): PromptMode {
    // A guarded material mode is never downgraded by an app block.
    //
    // `app` used to win outright, and App Mode carries no answer-withholding
    // rule at all — so a student on a recitation worksheet could add
    // `app: {appSlug: 'anything'}` to the request body and drop BOTH the
    // recitation prompt and the late reminder that `getModeReminder` derives
    // from this function. That is the #215/#46 guardrail, defeated by one
    // browser-controlled field. Recitation is decided by the material, which
    // the student does not get a vote on, so it is checked first.
    if (pdfContext?.materialType === 'recitation') return 'recitation';

    // `tutoringMode` is only honoured once `assembleUnifiedContext` has
    // replaced the request's app block with the registration's — an
    // unregistered slug arrives here with no mode to offer.
    if (appContext) return appContext.tutoringMode ?? 'app';
    if (codegenContext) return 'codegen';
    return 'classMaterials';
  }

  /**
   * The rendered "## Current Environment" section for this turn.
   *
   * Volatile by nature — every value in it can change between two consecutive
   * turns of the same conversation.
   */
  private renderEnvironmentBlock(
    environment: EnvironmentContext,
    pdfContext?: StudentContext,
    codegenContext?: CodegenContext,
    appContext?: AppContext,
    currentClass?: { classID: string; className?: string },
  ): string {
    return this.interpolateEnvironmentPrompt(
      UNIFIED_SYSTEM_PROMPTS.environmentAwareness,
      environment,
      pdfContext,
      codegenContext,
      appContext,
      currentClass,
    );
  }

  /**
   * Interpolate environment awareness template with actual values
   */
  private interpolateEnvironmentPrompt(
    template: string,
    environment: EnvironmentContext,
    pdfContext?: StudentContext,
    codegenContext?: CodegenContext,
    appContext?: AppContext,
    currentClass?: { classID: string; className?: string },
  ): string {
    let result = template;

    // Replace simple placeholders
    result = result.replace(/\{\{activeTab\}\}/g, environment.activeTab || 'unknown');
    result = result.replace(/\{\{activeView\}\}/g, environment.activeView || '');
    result = result.replace(/\{\{activeAppName\}\}/g, environment.activeAppName || '');
    result = result.replace(/\{\{currentPath\}\}/g, environment.currentPath || '');
    result = result.replace(/\{\{classID\}\}/g, currentClass?.classID || '');
    result = result.replace(
      /\{\{className\}\}/g,
      currentClass?.className || 'the current class',
    );

    // Handle conditional blocks for currentPath. Without this the agent has no idea
    // where it already is: it navigates, then re-reads the sitemap to check, and loops.
    if (environment.currentPath) {
      result = result.replace(/\{\{#if currentPath\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');
    } else {
      result = result.replace(/\{\{#if currentPath\}\}[\s\S]*?\{\{\/if\}\}/g, '');
    }

    // Handle conditional blocks for the current class. The request has carried a
    // classId all along (it gates RAG and class-analytics), but it was never shown to
    // the model — so "this class" was unresolvable and the agent had to spend a
    // round-trip on list_classes, whose result the next round-trip then dropped.
    if (currentClass?.classID) {
      result = result.replace(/\{\{#if currentClass\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');
    } else {
      result = result.replace(/\{\{#if currentClass\}\}[\s\S]*?\{\{\/if\}\}/g, '');
    }

    // Conditional sections. These MUST be rendered with depth-matched close
    // tags: `codegenContext` and `appContext` each nest another `{{#if}}`, and a
    // non-greedy regex closes on the inner tag, leaving the outer `{{/if}}` in
    // the rendered prompt. That literal marker was being sent to the model in
    // every turn's system prompt.
    result = renderConditional(
      result,
      'activeView',
      environment.activeView ? (inner) => inner : null,
    );

    result = renderConditional(
      result,
      'activeAppName',
      environment.activeAppName ? (inner) => inner : null,
    );

    result = renderConditional(
      result,
      'pdfContext',
      pdfContext
        ? (inner) =>
            inner
              .replace(
                /\{\{pdfContext\.pageNumber\}\}/g,
                String(pdfContext.pageNumber || ''),
              )
              .replace(
                /\{\{pdfContext\.materialType\}\}/g,
                pdfContext.materialType || '',
              )
        : null,
    );

    result = renderConditional(
      result,
      'codegenContext',
      codegenContext
        ? (inner) =>
            renderConditional(
              inner.replace(
                /\{\{codegenContext\.problemId\}\}/g,
                codegenContext.problemId || '',
              ),
              'codegenContext.errorContext',
              codegenContext.errorContext ? (nested) => nested : null,
            )
        : null,
    );

    result = renderConditional(
      result,
      'appContext',
      appContext
        ? (inner) =>
            renderConditional(
              inner.replace(
                /\{\{appContext\.appSlug\}\}/g,
                appContext.appSlug || '',
              ),
              'appContext.appContext',
              appContext.appContext ? (nested) => nested : null,
            )
        : null,
    );

    // Backstop: never ship a literal template token to the model. The
    // codegen/app blocks NEST an {{#if}}, and the non-greedy matchers above stop
    // at the inner {{/if}}, leaving the outer one orphaned. Stripping the token
    // is the general fix, but it leaves the line behind as whitespace — so blank
    // those out and collapse the runs the dropped blocks leave with them.
    result = stripUnrenderedTokens(result);
    result = result.replace(/^[ \t]+$/gm, '');
    result = result.replace(/\n{3,}/g, '\n\n');

    return result;
  }

  /**
   * Add app context to messages
   */
  private addAppContextToMessages(
    messages: ChatCompletionMessageParam[],
    appContext: AppContext,
  ): void {
    if (appContext.appContext) {
      const trimmedContext = appContext.appContext.slice(
        0,
        CONTEXT_BUDGET.maxAppContextChars,
      );
      messages.push({
        role: 'system',
        content: `## App-Provided Context\nThe app "${appContext.appSlug}" has provided the following context about the student's current activity:\n\n${trimmedContext}`,
      });
    }
  }

  /**
   * Add PDF context messages (similar to chatPdf flow)
   */
  private async addPdfContextToMessages(
    messages: ChatCompletionMessageParam[],
    pdfContext: StudentContext,
    classId: string,
    query: string,
    pnStudyRatio: number,
    n: number,
    userGroup: string,
    engineChoice?: EngineChoice,
  ): Promise<void> {
    // Query class documents for relevant context
    const P = Math.round(n * pnStudyRatio);
    const O = n - P;

    const studentContextResultsForP = await this.classService.queryClassDocuments(
      query,
      classId,
      P,
      pdfContext.pdfId,
      pdfContext.pageNumber,
      false,
      engineChoice,
    );

    const studentContextResultsForO = await this.classService.queryClassDocuments(
      query,
      classId,
      O,
      pdfContext.pdfId,
      pdfContext.pageNumber,
      true,
      engineChoice,
    );

    // Build context content.
    //
    // Budgeted by whole chunks: this block had no length cap at all, so a class
    // with large chunks pushed an unbounded amount of text into every turn. The
    // current page keeps priority over the wider course context — it is what the
    // student is actually looking at.
    const contextParts: string[] = [];
    let droppedChunks = 0;

    const budget = CONTEXT_BUDGET.maxRagChars;
    const currentPage = fitChunksToBudget(
      studentContextResultsForP.map((r) => r.text),
      budget,
    );
    droppedChunks += currentPage.dropped;

    if (currentPage.kept.length > 0) {
      contextParts.push(
        `[Current Page Context - Page ${pdfContext.pageNumber}]\n${currentPage.kept.join('\n')}`,
      );
    }

    const remaining = budget - currentPage.kept.join('\n').length;
    const other = fitChunksToBudget(
      studentContextResultsForO.map((r) => r.text),
      Math.max(remaining, 0),
    );
    droppedChunks += other.dropped;

    if (other.kept.length > 0) {
      contextParts.push(`[Additional Course Context]\n${other.kept.join('\n')}`);
    }

    if (droppedChunks > 0) {
      // Never shrink the context silently — a missing chunk looks like a
      // retrieval failure when you are debugging a bad answer.
      this.logger.warn(
        `[CTX-BUDGET] dropped ${droppedChunks} retrieved chunk(s) to fit ${budget} chars`,
      );
    }

    if (contextParts.length === 0) {
      // Retrieval ran and came back with nothing. The turn continues — an
      // ungrounded answer beats no answer — but this must not be silent: the
      // usual cause is a class whose documents have vectors for one embedding
      // model while the request routed to the other, and the symptom is an
      // answer that looks normal and cites nothing. Without this line there is
      // no signal at all, because the [CTX-BUDGET] warning above only fires
      // when chunks were retrieved and then trimmed.
      this.logger.warn(
        `[CTX-RAG] no course context for class ${pdfContext.classId} ` +
          `(doc ${pdfContext.pdfId}, page ${pdfContext.pageNumber}) — ` +
          'answering without grounding; check the class has embeddings for the active engine',
      );
    }

    if (contextParts.length > 0) {
      messages.push({
        role: 'user',
        content: contextParts.join('\n\n'),
      });
    }
  }

  /**
   * Add codegen context messages
   */
  private async addCodegenContextToMessages(
    messages: ChatCompletionMessageParam[],
    codegenContext: CodegenContext,
    prompt: string,
  ): Promise<void> {
    // Problem info is no longer fetched from the codegen service.
    const problemInfo: any = null;

    const contextParts: string[] = [];

    if (problemInfo) {
      contextParts.push(`## Problem: ${problemInfo.title || codegenContext.problemId}`);
      if (problemInfo.description) {
        contextParts.push(`Description: ${problemInfo.description}`);
      }
      if (problemInfo.constraints) {
        contextParts.push(`Constraints: ${problemInfo.constraints}`);
      }
    }

    if (codegenContext.selectedCode) {
      const trimmedCode = codegenContext.selectedCode.slice(
        0,
        CONTEXT_BUDGET.maxSelectedCodeChars,
      );
      contextParts.push(`## Selected Code:\n\`\`\`\n${trimmedCode}\n\`\`\``);
    } else if (codegenContext.codeContext) {
      const trimmedCode = codegenContext.codeContext.slice(
        0,
        CONTEXT_BUDGET.maxCodeContextChars,
      );
      contextParts.push(`## Current Code:\n\`\`\`\n${trimmedCode}\n\`\`\``);
    }

    if (codegenContext.errorContext) {
      const trimmedError = codegenContext.errorContext.slice(
        0,
        CONTEXT_BUDGET.maxErrorContextChars,
      );
      contextParts.push(`## Error Output:\n\`\`\`\n${trimmedError}\n\`\`\``);
    }

    if (contextParts.length > 0) {
      messages.push({
        role: 'user',
        content: contextParts.join('\n\n'),
      });
    }
  }

  /**
   * Transform AgentStreamEvent to StudentMessageEvent with navigation support
   */
  private transformUnifiedAgentEvent(
    event: AgentStreamEvent,
    conversationID: string,
    citations: Array<{ pdfID: string; pageNumber: string }>,
    contentAccumulator: { value: string },
    currentNavigation: NavigationAction | undefined,
    setNavigation: (nav: NavigationAction | undefined) => void,
    interactionId?: string,
    threadId?: string,
  ): (UnifiedChatEvent) | null {
    switch (event.type) {
      case 'content_delta':
        contentAccumulator.value += event.data.content || '';
        return this.createUnifiedMessageEvent(
          conversationID,
          contentAccumulator.value,
          citations,
          null,
          currentNavigation,
          threadId,
        );

      case 'tool_call_start':
        const toolName = event.data.toolCall?.name || 'tool';
        return this.createUnifiedMessageEvent(
          conversationID,
          contentAccumulator.value + `\n\nUsing ${toolName}...`,
          citations,
          null,
          currentNavigation,
          threadId,
        );

      case 'tool_call_complete':
        // Check if this was an open_material tool call and extract navigation from
        // metadata (the tool was renamed off 'navigate' to stop colliding with the
        // browser-side client tool of that name).
        if (
          event.data.toolCall?.name === 'open_material' &&
          event.data.toolCall?.metadata
        ) {
          const metadata = event.data.toolCall.metadata as { navigation?: NavigationAction };
          if (metadata.navigation) {
            const navAction = metadata.navigation;
            setNavigation(navAction);
            // Send navigation immediately so frontend can act on it
            return this.createUnifiedMessageEvent(
              conversationID,
              contentAccumulator.value,
              citations,
              null, // Not final yet, keep streaming
              navAction,
              threadId,
            );
          }
        }
        return null; // Don't emit event for other tool completions

      case 'final_response':
        const finalContent = event.data.content || contentAccumulator.value;
        return this.createUnifiedMessageEvent(
          conversationID,
          finalContent,
          event.data.citations || citations,
          'stop',
          currentNavigation,
          threadId,
        );

      case 'max_iterations':
        return this.createUnifiedMessageEvent(
          conversationID,
          event.data.content || contentAccumulator.value || 'I reached the maximum number of steps.',
          citations,
          'stop',
          currentNavigation,
          threadId,
        );

      case 'oauth_required':
        return {
          id: conversationID,
          data: {
            oauthRequired: {
              serverId: event.data.oauth!.serverId,
              serverName: event.data.oauth!.serverName,
              toolName: event.data.oauth!.toolName,
              authorizationUrl: event.data.oauth!.authorizationUrl,
              message: `Authorization required for ${event.data.oauth!.serverName}`,
            },
            navigation: currentNavigation,
          },
        };

      case 'client_action':
        // Agent called a browser-executed tool; the loop has paused. Surface
        // the directive so the frontend can run it and resume the chat by
        // re-invoking /student/chat/v2 with context.clientToolResult.
        return {
          id: conversationID,
          data: {
            clientAction: {
              toolCallId: event.data.clientAction!.toolCallId,
              tool: event.data.clientAction!.tool,
              args: event.data.clientAction!.args,
              // Echoed back by the frontend on resume so the whole multi-step
              // turn is recorded as one history interaction.
              interactionId,
            },
            navigation: currentNavigation,
          },
        };

      case 'error':
        return this.createUnifiedMessageEvent(
          conversationID,
          `Error: ${event.data.error || 'An error occurred'}`,
          citations,
          'stop',
          currentNavigation,
          threadId,
        );

      case 'iteration_start':
      case 'iteration_complete':
        return null;

      default:
        return null;
    }
  }

  // === Keyword Management Methods ===

  async refreshKeywords(lectureId: string, classId: string, force: boolean = false) {
    this.logger.debug('Refreshing keywords for lecture:', lectureId, 'class:', classId);

    try {
      // Check if keywords already exist
      const existingKeywords = await this.keywordService.getLectureKeywordsByLectureId(lectureId, classId);

      if (existingKeywords && !force) {
        this.logger.debug('Keywords already exist, returning existing record');
        return {
          success: true,
          message: 'Keywords already exist',
          status: existingKeywords.status,
          keywordId: existingKeywords.id,
        };
      }

      // Create or update keyword record with pending status
      const keywordRecord = await this.keywordService.upsertLectureKeywords({
        where: {
          lectureId_classId: {
            lectureId,
            classId,
          },
        },
        update: {
          status: 'processing',
          updatedAt: new Date(),
        },
        create: {
          lectureId,
          keywords: [],
          status: 'processing',
          class: {
            connect: { id: classId },
          },
        },
      });

      // Process keywords asynchronously
      this.processKeywordsAsync(keywordRecord.id, lectureId, classId);

      return {
        success: true,
        message: 'Keywords refresh started successfully',
        status: 'processing',
        keywordId: keywordRecord.id,
      };
    } catch (error) {
      this.logger.error('Error refreshing keywords:', error);
      return {
        success: false,
        message: 'Failed to refresh keywords',
        status: 'failed',
        keywordId: null,
      };
    }
  }

  async getKeywords(lectureId: string, classId: string) {
    this.logger.debug('Getting keywords for lecture:', lectureId, 'class:', classId);

    try {
      const keywordRecord = await this.keywordService.getLectureKeywordsByLectureId(lectureId, classId);

      if (!keywordRecord) {
        return {
          success: false,
          message: 'No keywords found for this lecture',
          status: 'not_found',
          keywords: [],
          updatedAt: null,
        };
      }

      // Ensure keywords returned to clients are validated with the latest rules
      const rawKeywords = (keywordRecord.keywords as any[]) || [];
      const filteredKeywords = this.validateAndFilterKeywords(Array.isArray(rawKeywords) ? rawKeywords : []);

      const usage = this.keywordUsage.get(keywordRecord.id) || undefined;
      return {
        success: true,
        message: 'Keywords retrieved successfully',
        status: keywordRecord.status,
        keywords: filteredKeywords,
        updatedAt: keywordRecord.updatedAt.toISOString(),
        usage,
      };
    } catch (error) {
      this.logger.error('Error getting keywords:', error);
      return {
        success: false,
        message: 'Failed to retrieve keywords',
        status: 'error',
        keywords: [],
        updatedAt: null,
        usage: undefined,
      };
    }
  }

  async getKeywordStatus(lectureId: string, classId: string) {
    this.logger.debug('Getting keyword status for lecture:', lectureId, 'class:', classId);

    try {
      const keywordRecord = await this.keywordService.getLectureKeywordsByLectureId(lectureId, classId);

      if (!keywordRecord) {
        return {
          success: false,
          message: 'No keyword record found',
          status: 'not_found',
          progress: 0,
          updatedAt: null,
        };
      }

      const progress = keywordRecord.status === 'completed' ? 100 :
        keywordRecord.status === 'processing' ? 50 :
          keywordRecord.status === 'failed' ? 0 : 0;

      const usage = keywordRecord?.id ? this.keywordUsage.get(keywordRecord.id) : undefined;
      return {
        success: true,
        message: this.getStatusMessage(keywordRecord.status),
        status: keywordRecord.status,
        progress,
        updatedAt: keywordRecord.updatedAt.toISOString(),
        usage,
      };
    } catch (error) {
      this.logger.error('Error getting keyword status:', error);
      return {
        success: false,
        message: 'Failed to retrieve keyword status',
        status: 'error',
        progress: 0,
        updatedAt: null,
        usage: undefined,
      };
    }
  }

  private getStatusMessage(status: string): string {
    switch (status) {
      case 'pending':
        return 'Keywords are queued for processing';
      case 'processing':
        return 'Keywords are being processed';
      case 'completed':
        return 'Keywords are ready';
      case 'failed':
        return 'Keywords processing failed';
      default:
        return 'Unknown status';
    }
  }

  private async processKeywordsAsync(keywordId: string, lectureId: string, classId: string) {
    try {
      this.logger.debug('Processing keywords asynchronously for:', keywordId, 'classId:', classId, 'lectureId:', lectureId);

      // Fetch interactions for this lecture and class efficiently (avoid loading all records)
      const interactions = await this.interactionService.getLectureInteractions(
        lectureId,
        classId,
        [
          'frontend-interaction-chat',
          'frontend-interaction-chat-exercise',
        ],
      );
      this.logger.debug(`Filtered lecture interactions: ${interactions.length} for lectureId: ${lectureId}, classId: ${classId}`);

      if (!interactions || interactions.length === 0) {
        this.logger.debug('No interactions found for lecture:', lectureId);
        await this.keywordService.updateKeywordStatus(keywordId, 'failed');
        return;
      }

      // Extract questions from interactions
      const questionObjects = this.extractQuestionsFromInteractions(interactions);
      this.logger.debug(`Extracted questions: ${questionObjects.length}`);
      this.logger.debug('Sample questions:', questionObjects.slice(0, 3).map(q => q.text));

      if (questionObjects.length === 0) {
        this.logger.debug('No questions found in interactions');
        await this.keywordService.updateKeywordStatus(keywordId, 'failed');
        return;
      }

      // Use LLM to generate keywords
      const { keywords, usage } = await this.generateKeywordsFromQuestions(questionObjects);

      // Update keyword record with generated keywords
      await this.keywordService.updateLectureKeywords({
        where: { id: keywordId },
        data: {
          keywords: keywords,
          status: 'completed',
          updatedAt: new Date(),
        },
      });

      // Record usage for status/get endpoints
      if (usage) {
        this.keywordUsage.set(keywordId, usage);
      }

      this.logger.debug('Keywords processed successfully for:', keywordId);
    } catch (error) {
      this.logger.error('Error processing keywords:', error);
      await this.keywordService.updateKeywordStatus(keywordId, 'failed');
    }
  }

  private extractQuestionsFromInteractions(interactions: any[]): any[] {
    const questions: any[] = [];

    for (const interaction of interactions) {
      if (interaction.type?.startsWith('frontend-interaction-chat')) {
        const context = interaction.context as any;
        if (context?.content?.prompt) {
          questions.push({
            text: context.content.prompt,
            pdfId: interaction.pdfId,
            pdfPage: interaction.pdfPage,
            slide: interaction.pdfPage, // use pdfPage as slide index
            slideTitle: `Page ${interaction.pdfPage}`, // simple title
            studentId: interaction.userId,
            timestamp: interaction.timestamp
          });
        }
      }
    }

    return questions;
  }

  private async generateKeywordsFromQuestions(questionObjects: any[]): Promise<{ keywords: any[]; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
    const KEYWORD_GENERATION_PROMPT = `
You are an educational content analyzer. Given a list of student questions about a lecture, extract and return the key academic topics/keywords that students are asking about.

Instructions:
1. Extract academic nouns, noun phrases, and important technical terms
2. Focus on technical terms, concepts, theories, subjects, and key academic concepts  
3. Include mathematical terms, formulas, algorithms, and statistical concepts
4. Group similar questions and count frequency
5. Generate AT LEAST 5-10 keywords if possible
6. Return properly spelled academic terms (allow numbers in terms like "bayes theorem", "machine learning", etc.)

Return the result as a JSON array of objects with this structure:
[
  {
    "text": "keyword or phrase",
    "count": number_of_occurrences,
    "questions": ["sample question 1", "sample question 2"],
    "relatedQuestions": ["related question 1", "related question 2"]
  }
]

Student questions (total: ${questionObjects.length}):
${questionObjects.map(q => q.text).join('\n')}
`;

    try {
      const messages = [
        {
          role: 'system',
          content: KEYWORD_GENERATION_PROMPT,
        },
        {
          role: 'user',
          content: 'Please analyze the questions and extract keywords.',
        },
      ] as ChatCompletionMessageParam[];

      const response = await this.llmService.createChat(
        messages,
        0,
        2000,
        undefined,
        undefined,
        'openai',
      );

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No content in LLM response');
      }

      // Clean up markdown code blocks and parse JSON
      const cleanedContent = content
        .replace(/```json\s*/g, '')  // Remove ```json
        .replace(/```\s*$/g, '')     // Remove closing ```
        .trim();

      this.logger.debug('Cleaned LLM content:', cleanedContent);

      // Parse JSON response
      const keywordsFromLLM = JSON.parse(cleanedContent);
      this.logger.debug(`LLM generated ${keywordsFromLLM.length} keywords:`, keywordsFromLLM.map((k: any) => k.text));

      // Map keywords back to question objects with metadata
      const enhancedKeywords = this.mapKeywordsToQuestionObjects(keywordsFromLLM, questionObjects);
      this.logger.debug(`Enhanced keywords count: ${enhancedKeywords.length}`);

      // Validate and filter keywords
      const validatedKeywords = this.validateAndFilterKeywords(enhancedKeywords);
      this.logger.debug(`Final validated keywords: ${validatedKeywords.length}`, validatedKeywords.map((k: any) => k.text));

      const usage = {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      };

      return { keywords: validatedKeywords, usage };
    } catch (error) {
      this.logger.error('Error generating keywords:', error);
      // Return fallback keywords
      return { keywords: this.generateFallbackKeywords(questionObjects) };
    }
  }

  private mapKeywordsToQuestionObjects(keywordsFromLLM: any[], questionObjects: any[]): any[] {
    const enhancedKeywords: any[] = [];

    const dedupeQuestionObjects = (arr: any[]): any[] => {
      const seen = new Set<string>();
      const unique: any[] = [];
      for (const q of arr) {
        const key = (q.text || q.studentQuestion || '').toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(q);
        }
      }
      return unique;
    };

    for (const keyword of keywordsFromLLM) {
      // Find question objects that match this keyword's questions
      const matchingQuestionObjects: any[] = [];
      const matchingRelatedObjects: any[] = [];

      // Map questions to question objects
      if (keyword.questions && Array.isArray(keyword.questions)) {
        for (const questionText of keyword.questions) {
          const matchingObj = questionObjects.find(obj =>
            obj.text.toLowerCase().includes(questionText.toLowerCase()) ||
            questionText.toLowerCase().includes(obj.text.toLowerCase())
          );
          if (matchingObj) {
            matchingQuestionObjects.push(matchingObj);
          }
        }
      }

      // Map related questions to question objects
      if (keyword.relatedQuestions && Array.isArray(keyword.relatedQuestions)) {
        for (const questionText of keyword.relatedQuestions) {
          const matchingObj = questionObjects.find(obj =>
            obj.text.toLowerCase().includes(questionText.toLowerCase()) ||
            questionText.toLowerCase().includes(obj.text.toLowerCase())
          );
          if (matchingObj) {
            matchingRelatedObjects.push(matchingObj);
          }
        }
      }

      // Dedupe to avoid repeated entries
      const uniqueQuestions = dedupeQuestionObjects(matchingQuestionObjects);
      const uniqueRelated = dedupeQuestionObjects(matchingRelatedObjects);

      // Compute actual total questions (questions + relatedQuestions)
      const totalQuestions = uniqueQuestions.length + uniqueRelated.length;

      enhancedKeywords.push({
        text: keyword.text,
        count: Math.max(totalQuestions, keyword.count || 1), // use actual total or LLM-provided count, whichever is larger
        questions: uniqueQuestions,
        relatedQuestions: uniqueRelated,
      });
    }

    return enhancedKeywords;
  }

  private validateAndFilterKeywords(keywords: any[]): any[] {
    const validKeywords: any[] = [];
    const rejectedKeywords: string[] = [];

    for (const keyword of keywords) {
      if (this.isValidKeyword(keyword)) {
        // Deduplicate by text to avoid duplicates
        const seenQ = new Set<string>();
        const questions = (keyword.questions || []).filter((q: any) => {
          const key = (q.text || '').toLowerCase().trim();
          if (seenQ.has(key)) return false;
          seenQ.add(key);
          return true;
        });
        const seenR = new Set<string>();
        const relatedQuestions = (keyword.relatedQuestions || []).filter((q: any) => {
          const key = (q.text || '').toLowerCase().trim();
          if (seenR.has(key) || seenQ.has(key)) return false;
          seenR.add(key);
          return true;
        });
        const actualTotalQuestions = questions.length + relatedQuestions.length;

        validKeywords.push({
          text: keyword.text.toLowerCase(),
          count: Math.max(actualTotalQuestions, keyword.count || 1), // ensure count matches actual total questions
          questions: questions,
          relatedQuestions: relatedQuestions,
        });
      } else {
        rejectedKeywords.push(keyword.text);
      }
    }

    if (rejectedKeywords.length > 0) {
      this.logger.debug(`Rejected keywords: ${rejectedKeywords.join(', ')}`);
    }

    return validKeywords;
  }

  private isValidKeyword(keyword: any): boolean {
    if (!keyword.text || typeof keyword.text !== 'string') {
      return false;
    }

    const text = keyword.text.toLowerCase().trim();

    // Minimum length (reduced from 3 to 2 for terms like "ai", "ml")
    if (text.length < 2) {
      return false;
    }

    // Exclude common non-academic terms
    const nonAcademicTerms = [
      'ppt', 'pdf', 'slide', 'page', 'document', 'file', 'presentation',
      // Articles / conjunctions / prepositions
      'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'than', 'because',
      'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'about', 'into', 'through', 'over', 'after', 'before', 'between', 'without', 'within', 'across', 'against', 'among', 'around', 'during', 'until', 'upon', 'via',
      // Auxiliaries / be-forms
      'is', 'are', 'am', 'was', 'were', 'be', 'been', 'being', 'do', 'does', 'did', 'done', 'doing', 'have', 'has', 'had',
      // Pronouns / determiners
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'ours', 'theirs', 'this', 'that', 'these', 'those', 'there', 'here',
      // Question/Modal words and fillers
      'question', 'answer', 'ask', 'please', 'thank', 'thanks', 'hi', 'hello', 'ok', 'okay',
      'what', 'how', 'when', 'where', 'why', 'who', 'which', 'whom',
      'will', 'would', 'should', 'could', 'can', 'may', 'might', 'shall', 'must',
      // Additional fillers/connectives not desired in academic keywords
      'like', 'etc', 'etc.', 'such', 'such as', 'including', 'include', 'includes'
    ];

    if (nonAcademicTerms.includes(text)) {
      return false;
    }

    // Reject phrases that are entirely made of stopwords/fillers (e.g., "and the like")
    const tokens = text.split(/[^a-z]+/).filter(Boolean);
    if (
      tokens.length > 0 &&
      tokens.every((t: string) => nonAcademicTerms.includes(t) || t.length <= 2)
    ) {
      return false;
    }

    // Allow numbers and some special characters (for academic terms like "p-value", "t-test", etc.)
    // Only exclude terms that are purely numbers or have too many special characters
    if (/^[0-9]+$/.test(text)) {
      return false; // Exclude pure numbers like "123"
    }

    // Exclude terms with too many special characters (but allow hyphens, spaces, and some others)
    if (/[^a-zA-Z0-9\s\-_]/.test(text)) {
      return false;
    }

    return true;
  }

  private generateFallbackKeywords(questionObjects: any[]): any[] {
    this.logger.debug('Generating fallback keywords from questions:', questionObjects.map((q: any) => q.text));

    // Extract keywords from actual question text using simple word extraction
    const keywords: any[] = [];
    const keywordCounts: Map<string, any[]> = new Map();

    // Extended academic terms
    const academicTerms = [
      'probability', 'statistics', 'algorithm', 'function', 'variable',
      'equation', 'matrix', 'vector', 'regression', 'classification',
      'neural network', 'machine learning', 'deep learning', 'data',
      'model', 'training', 'testing', 'validation', 'optimization',
      'conditional', 'gaussian', 'distribution', 'variance', 'mean',
      'calculate', 'compute', 'formula', 'theorem', 'proof', 'derivative',
      'integral', 'linear', 'exponential', 'logarithm', 'random',
      'sample', 'population', 'hypothesis', 'significance', 'correlation',
      'bayes', 'frequentist', 'likelihood', 'estimation', 'confidence',
      'interval', 'regression', 'clustering', 'supervised', 'unsupervised'
    ];

    // Check each question for academic terms
    for (const question of questionObjects) {
      const questionText = question.text.toLowerCase();

      // Extract words from question
      const words = questionText.match(/\b[a-z]+\b/g) || [];

      for (const word of words) {
        // Check if word is an academic term or similar
        if (word.length >= 3 && academicTerms.some(term =>
          term.includes(word) || word.includes(term) ||
          term.toLowerCase().includes(word) || word.includes(term.toLowerCase())
        )) {
          if (!keywordCounts.has(word)) {
            keywordCounts.set(word, []);
          }
          keywordCounts.get(word)!.push(question);
        }
      }

      // Also check for exact matches of academic terms
      for (const term of academicTerms) {
        if (questionText.includes(term.toLowerCase())) {
          if (!keywordCounts.has(term)) {
            keywordCounts.set(term, []);
          }
          keywordCounts.get(term)!.push(question);
        }
      }
    }

    // Convert to keyword objects
    for (const [text, questions] of keywordCounts.entries()) {
      if (questions.length > 0) {
        const mainQuestions = questions.slice(0, 3);
        const relatedQuestions = questions.slice(3, 6);

        keywords.push({
          text: text,
          count: questions.length, // Use actual total question count
          questions: mainQuestions,
          relatedQuestions: relatedQuestions,
        });
      }
    }

    // Sort by count (descending) and take top 10
    const sortedKeywords = keywords
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    this.logger.debug(`Generated ${sortedKeywords.length} fallback keywords:`, sortedKeywords.map((k: any) => k.text));

    return sortedKeywords;
  }

  /**
   * The student's chat threads, newest activity first.
   *
   * Returns the thread key the client already uses as `conversationId`, so a
   * caller can resume a thread by passing it straight back to `/chat/v2`.
   */
  async listConversations(
    userId: string,
    options: { classId?: string; limit?: number; offset?: number } = {},
  ) {
    const { conversations, total } = await this.conversationService.list({
      userId,
      ...options,
    });

    return {
      conversations: conversations.map((c) => ({
        conversationId: c.threadKey,
        classId: c.classId,
        source: c.source,
        title: c.title,
        turnCount: c.turnCount,
        lastTurnAt: c.lastTurnAt.toISOString(),
        createdAt: c.createdAt.toISOString(),
      })),
      total,
    };
  }

  // === Chat History API ===

  async getChatHistory(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      interactionType?: string;
      conversationId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ): Promise<ChatHistoryResponseDto> {
    const pageNum = options.page ?? 1;
    const limitNum = Math.min(options.limit ?? 20, 100);

    // Build where clause for filtering
    const chatTypes = [
      'frontend-interaction-chat',
      'frontend-interaction-chat-exercise',
      'exercise_chat',
      'chat-query',
    ];

    const whereClause: any = {
      userId,
      type: options.interactionType
        ? { equals: options.interactionType }
        : { in: chatTypes },
    };

    if (options.conversationId) {
      // conversationId is `stringTag || interaction.id` (see
      // flattenInteractionsToMessages). stringTag is empty on chat interactions,
      // so the conversationId is usually the interaction id — match either.
      whereClause.OR = [
        { stringTag: options.conversationId },
        { id: options.conversationId },
      ];
    }

    if (options.startDate || options.endDate) {
      whereClause.timestamp = {};
      if (options.startDate) {
        whereClause.timestamp.gte = options.startDate;
      }
      if (options.endDate) {
        whereClause.timestamp.lte = options.endDate;
      }
    }

    // Fetch interactions with server actions
    const interactions =
      await this.userInteractionService.userInteractionsWithServerActions({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
      });

    // Flatten interactions to messages
    const allMessages = this.flattenInteractionsToMessages(interactions);

    // Apply pagination
    const total = allMessages.length;
    const totalPages = Math.ceil(total / limitNum);
    const skip = (pageNum - 1) * limitNum;
    const paginatedMessages = allMessages.slice(skip, skip + limitNum);

    return {
      messages: paginatedMessages,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrevious: pageNum > 1,
    };
  }

  private flattenInteractionsToMessages(
    interactions: UserInteractionWithAction[],
  ): ChatHistoryMessageDto[] {
    const messages: ChatHistoryMessageDto[] = [];

    for (const interaction of interactions) {
      const conversationId = interaction.stringTag || interaction.id;
      const interactionType = interaction.type;
      const context = interaction.context as any;

      // Pattern 1: Extract from context.content.prompt (frontend-interaction-chat)
      if (context?.content?.prompt) {
        messages.push({
          id: `${interaction.id}_user`,
          role: 'user',
          content: context.content.prompt,
          timestamp: interaction.timestamp.toISOString(),
          conversationId,
          interactionType,
          metadata: {
            pdfId: interaction.pdfId,
            pdfPage: interaction.pdfPage,
            classId: interaction.classId,
          },
        });
      }

      // Extract assistant responses from ServerAction.
      //
      // A multi-step agent turn writes MORE THAN ONE row with a botResponse: an
      // `agent-loop-step` per intermediate narration ("Using rag...") plus one
      // `agent-loop-complete` carrying the real answer. Emitting every row as a
      // peer assistant message is what put "calling tool" into history and
      // analytics (#139) and produced duplicate entries (#108).
      //
      // Order by time so the narration precedes the answer, flag the steps so
      // clients can collapse them, and drop a step whose text the final answer
      // already repeats verbatim.
      const responseActions = [...(interaction.serverActions || [])]
        .filter((action) => action.botResponse)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      const finalTexts = new Set(
        responseActions
          .filter((action) => action.type !== 'agent-loop-step')
          .map((action) => action.botResponse!.trim()),
      );

      for (const action of responseActions) {
        const isIntermediate = action.type === 'agent-loop-step';
        const text = action.botResponse!.trim();

        // A step that says exactly what the final answer says is pure noise.
        if (isIntermediate && finalTexts.has(text)) continue;

        messages.push({
          id: action.id,
          role: 'assistant',
          content: action.botResponse!,
          timestamp: action.timestamp.toISOString(),
          conversationId,
          interactionType,
          ...(isIntermediate ? { isIntermediate: true } : {}),
          metadata: {
            engineChoice: action.engineChoice,
            actionType: action.type,
          },
        });
      }

      // Pattern 2: Extract from context.messages array (exercise_chat)
      if (Array.isArray(context?.messages)) {
        for (const msg of context.messages) {
          messages.push({
            id: `${interaction.id}_${msg.messageIndex ?? messages.length}`,
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content || '',
            timestamp: msg.timestamp || interaction.timestamp.toISOString(),
            conversationId,
            interactionType,
            metadata: {
              messageIndex: msg.messageIndex,
              engineChoice: msg.engineChoice,
              exerciseId: context.exerciseId,
            },
          });
        }
      }
    }

    // Sort by timestamp descending
    return messages.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }
}
