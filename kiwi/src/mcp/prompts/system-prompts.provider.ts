import { Injectable, Scope } from '@nestjs/common';
import { Prompt } from '@rekog/mcp-nest';
import { z } from 'zod';
import { DEFAULT_SYSTEM_PROMPTS } from 'src/student/student.prompts';

/**
 * MCP System Prompts Provider
 * Exposes system prompts as MCP prompts for use by AI assistants
 */
@Injectable({ scope: Scope.REQUEST })
export class SystemPromptsProvider {
  /**
   * Default system prompt for the Kiwi assistant
   * No parameters required - returns the default system message
   */
  @Prompt({
    name: 'default-system-prompt',
    description: 'Default system instructions for the Kiwi AI assistant',
    parameters: z.object({}),
  })
  getDefaultSystemPrompt() {
    return {
      description: 'Default Kiwi assistant system instructions',
      messages: [
        {
          role: 'system',
          content: {
            type: 'text',
            text: DEFAULT_SYSTEM_PROMPTS.defaultSystemMessage,
          },
        },
      ],
    };
  }

  /**
   * Class materials prompt for the configured classes
   * Can optionally be customized per class
   */
  @Prompt({
    name: 'class-materials-prompt',
    description:
      'System prompt for assisting with Computer Science class materials',
    parameters: z.object({
      classId: z.string().optional().describe('Optional class ID for context'),
    }),
  })
  getClassMaterialsPrompt({ classId }: { classId?: string }) {
    let promptText = DEFAULT_SYSTEM_PROMPTS.classMaterialsPrompt;

    if (classId) {
      promptText += `\n\nCurrent class context: ${classId}`;
    }

    return {
      description: 'CS class materials assistance prompt',
      messages: [
        {
          role: 'system',
          content: {
            type: 'text',
            text: promptText,
          },
        },
      ],
    };
  }

  /**
   * Recitation guidance prompt for ICP problem-solving
   * Emphasizes guiding students rather than providing direct answers
   */
  @Prompt({
    name: 'recitation-guidance-prompt',
    description:
      'System prompt for guiding students through recitation problems',
    parameters: z.object({
      topic: z
        .string()
        .optional()
        .describe('Optional topic area (e.g., "loops", "functions")'),
    }),
  })
  getRecitationPrompt({ topic }: { topic?: string }) {
    let promptText = DEFAULT_SYSTEM_PROMPTS.recitationPrompt;

    if (topic) {
      promptText += `\n\nCurrent topic focus: ${topic}`;
    }

    return {
      description: 'Recitation problem-solving guidance prompt',
      messages: [
        {
          role: 'system',
          content: {
            type: 'text',
            text: promptText,
          },
        },
      ],
    };
  }

  /**
   * Combined prompt template for complete assistant configuration
   * Allows combining default + class-specific prompts
   */
  @Prompt({
    name: 'complete-assistant-prompt',
    description:
      'Complete system prompt combining default and class-specific instructions',
    parameters: z.object({
      classId: z.string().optional().describe('Optional class ID'),
      mode: z
        .enum(['default', 'class-materials', 'recitation'])
        .optional()
        .describe('The mode of assistance'),
    }),
  })
  getCompletePrompt({
    classId,
    mode,
  }: {
    classId?: string;
    mode?: 'default' | 'class-materials' | 'recitation';
  }) {
    const messages = [
      {
        role: 'system',
        content: {
          type: 'text',
          text: DEFAULT_SYSTEM_PROMPTS.defaultSystemMessage,
        },
      },
    ];

    // Default mode to 'default' if not specified
    const selectedMode = mode || 'default';

    // Add mode-specific prompt
    if (selectedMode === 'class-materials') {
      let classPrompt = DEFAULT_SYSTEM_PROMPTS.classMaterialsPrompt;
      if (classId) {
        classPrompt += `\n\nClass ID: ${classId}`;
      }
      messages.push({
        role: 'system',
        content: {
          type: 'text',
          text: classPrompt,
        },
      });
    } else if (selectedMode === 'recitation') {
      messages.push({
        role: 'system',
        content: {
          type: 'text',
          text: DEFAULT_SYSTEM_PROMPTS.recitationPrompt,
        },
      });
    }

    return {
      description: `Complete ${selectedMode} prompt${classId ? ` for class ${classId}` : ''}`,
      messages,
    };
  }
}
