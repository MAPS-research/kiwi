import { Test, TestingModule } from '@nestjs/testing';
import { SystemPromptsProvider } from './system-prompts.provider';

// Mock the DEFAULT_SYSTEM_PROMPTS
jest.mock('src/student/student.prompts', () => ({
  DEFAULT_SYSTEM_PROMPTS: {
    defaultSystemMessage: 'You are a helpful AI assistant for Kiwi.',
    classMaterialsPrompt: 'Help students with CS class materials.',
    recitationPrompt: 'Guide students through recitation problems.',
  },
}));

describe('SystemPromptsProvider', () => {
  let provider: SystemPromptsProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SystemPromptsProvider],
    }).compile();

    provider = await module.resolve<SystemPromptsProvider>(
      SystemPromptsProvider,
    );
  });

  describe('getDefaultSystemPrompt', () => {
    it('should return default system prompt structure', () => {
      const result = provider.getDefaultSystemPrompt();

      expect(result.description).toBe(
        'Default Kiwi assistant system instructions',
      );
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[0].content.type).toBe('text');
    });

    it('should contain the default system message', () => {
      const result = provider.getDefaultSystemPrompt();

      expect(result.messages[0].content.text).toBe(
        'You are a helpful AI assistant for Kiwi.',
      );
    });
  });

  describe('getClassMaterialsPrompt', () => {
    it('should return class materials prompt without classId', () => {
      const result = provider.getClassMaterialsPrompt({});

      expect(result.description).toBe('CS class materials assistance prompt');
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content.text).toBe(
        'Help students with CS class materials.',
      );
    });

    it('should append class context when classId provided', () => {
      const classId = 'CS101';
      const result = provider.getClassMaterialsPrompt({ classId });

      expect(result.messages[0].content.text).toContain(
        'Help students with CS class materials.',
      );
      expect(result.messages[0].content.text).toContain(
        `Current class context: ${classId}`,
      );
    });

    it('should return correct structure', () => {
      const result = provider.getClassMaterialsPrompt({ classId: 'test' });

      expect(result.messages[0].role).toBe('user');
      expect(result.messages[0].content.type).toBe('text');
    });
  });

  describe('getRecitationPrompt', () => {
    it('should return recitation prompt without topic', () => {
      const result = provider.getRecitationPrompt({});

      expect(result.description).toBe(
        'Recitation problem-solving guidance prompt',
      );
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content.text).toBe(
        'Guide students through recitation problems.',
      );
    });

    it('should append topic when provided', () => {
      const topic = 'loops';
      const result = provider.getRecitationPrompt({ topic });

      expect(result.messages[0].content.text).toContain(
        'Guide students through recitation problems.',
      );
      expect(result.messages[0].content.text).toContain(
        `Current topic focus: ${topic}`,
      );
    });

    it('should return correct structure', () => {
      const result = provider.getRecitationPrompt({ topic: 'functions' });

      expect(result.messages[0].role).toBe('user');
      expect(result.messages[0].content.type).toBe('text');
    });
  });

  describe('getCompletePrompt', () => {
    it('should return default mode prompt when no mode specified', () => {
      const result = provider.getCompletePrompt({});

      expect(result.description).toBe('Complete default prompt');
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content.text).toBe(
        'You are a helpful AI assistant for Kiwi.',
      );
    });

    it('should return default mode prompt explicitly', () => {
      const result = provider.getCompletePrompt({ mode: 'default' });

      expect(result.description).toBe('Complete default prompt');
      expect(result.messages).toHaveLength(1);
    });

    it('should return class-materials mode prompt', () => {
      const result = provider.getCompletePrompt({ mode: 'class-materials' });

      expect(result.description).toBe('Complete class-materials prompt');
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].content.text).toBe(
        'You are a helpful AI assistant for Kiwi.',
      );
      expect(result.messages[1].content.text).toBe(
        'Help students with CS class materials.',
      );
    });

    it('should return class-materials mode with classId', () => {
      const classId = 'CS201';
      const result = provider.getCompletePrompt({
        mode: 'class-materials',
        classId,
      });

      expect(result.description).toBe(
        `Complete class-materials prompt for class ${classId}`,
      );
      expect(result.messages).toHaveLength(2);
      expect(result.messages[1].content.text).toContain(`Class ID: ${classId}`);
    });

    it('should return recitation mode prompt', () => {
      const result = provider.getCompletePrompt({ mode: 'recitation' });

      expect(result.description).toBe('Complete recitation prompt');
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].content.text).toBe(
        'You are a helpful AI assistant for Kiwi.',
      );
      expect(result.messages[1].content.text).toBe(
        'Guide students through recitation problems.',
      );
    });

    it('should include classId in description when provided', () => {
      const classId = 'CS301';
      const result = provider.getCompletePrompt({
        mode: 'default',
        classId,
      });

      expect(result.description).toBe(
        `Complete default prompt for class ${classId}`,
      );
    });

    it('should handle classId with recitation mode', () => {
      const result = provider.getCompletePrompt({
        mode: 'recitation',
        classId: 'CS401',
      });

      expect(result.description).toBe(
        'Complete recitation prompt for class CS401',
      );
      // Recitation mode doesn't append classId to the message content
      expect(result.messages[1].content.text).not.toContain('CS401');
    });

    it('should return correct message structure for all modes', () => {
      const modes = ['default', 'class-materials', 'recitation'] as const;

      for (const mode of modes) {
        const result = provider.getCompletePrompt({ mode });

        expect(result.messages[0].role).toBe('user');
        expect(result.messages[0].content.type).toBe('text');
      }
    });
  });
});
