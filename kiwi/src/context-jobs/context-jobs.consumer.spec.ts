import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { MaterialPersonalizationService } from 'src/student/material-personalization/material-personalization.service';
import { ConversationHistoryService } from 'src/common/context/conversation-history.service';
import { LlmService } from 'src/common/llm/llm.service';
import { ContextJobsConsumer } from './context-jobs.consumer';

const job = (name: string, data: any) => ({ name, data }) as Job<any, any, string>;

describe('ContextJobsConsumer', () => {
  let consumer: ContextJobsConsumer;
  let materialPersonalizationService: jest.Mocked<MaterialPersonalizationService>;
  let conversationHistoryService: jest.Mocked<ConversationHistoryService>;
  let llmService: jest.Mocked<LlmService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextJobsConsumer,
        {
          provide: MaterialPersonalizationService,
          useValue: { saveUserPersonalization: jest.fn() },
        },
        {
          provide: ConversationHistoryService,
          useValue: { compact: jest.fn() },
        },
        {
          provide: LlmService,
          useValue: { createChat: jest.fn() },
        },
      ],
    }).compile();

    consumer = module.get(ContextJobsConsumer);
    materialPersonalizationService = module.get(MaterialPersonalizationService);
    conversationHistoryService = module.get(ConversationHistoryService);
    llmService = module.get(LlmService);
  });

  it('dispatches extractPersonalization to the profile write path', async () => {
    materialPersonalizationService.saveUserPersonalization.mockResolvedValue(
      undefined,
    );

    const result = await consumer.process(
      job('extractPersonalization', {
        userId: 'user-1',
        userSessionId: 'session-1',
      }),
    );

    expect(
      materialPersonalizationService.saveUserPersonalization,
    ).toHaveBeenCalledWith('session-1', 'user-1');
    expect(result).toEqual({ userSessionId: 'session-1' });
  });

  it('ignores an unknown job name instead of failing it', async () => {
    const result = await consumer.process(job('somethingFromANewerRelease', {}));

    expect(result).toBeUndefined();
    expect(
      materialPersonalizationService.saveUserPersonalization,
    ).not.toHaveBeenCalled();
  });

  describe('compactConversation', () => {
    const runCompaction = async (
      summaryContent: string | null,
      engineChoice?: 'openai' | 'qwen',
    ) => {
      llmService.createChat.mockResolvedValue({
        choices: [{ message: { content: summaryContent } }],
      } as any);
      conversationHistoryService.compact.mockImplementation(
        async ({ summarize }: any) => ({
          compacted: true,
          turnsCovered: 4,
          summary: await summarize(
            [
              { role: 'user', content: 'q1' },
              { role: 'assistant', content: 'a1' },
            ],
            undefined,
          ),
        }),
      );

      return consumer.process(
        job('compactConversation', {
          userId: 'user-1',
          conversationId: 'thread-1',
          ...(engineChoice ? { engineChoice } : {}),
        }),
      );
    };

    it('writes the summary with the conversation\'s own engine', async () => {
      // `engineChoice` is the SIXTH positional parameter of createChat, so it
      // was never passed and every summary fell through to the default engine.
      // A Qwen class had its long-term memory written by an OpenAI model.
      await runCompaction('a summary', 'qwen');

      expect(llmService.createChat.mock.calls[0][5]).toBe('qwen');
    });

    it('summarises the transcript the history service hands it', async () => {
      const result: any = await runCompaction('a summary');

      expect(result.compacted).toBe(true);
      const messages = llmService.createChat.mock.calls[0][0];
      expect(messages[0].role).toBe('system');
      expect(messages[1].content).toContain('user: q1');
      expect(messages[1].content).toContain('assistant: a1');
    });

    it('folds a previous summary into the new one so compaction is cumulative', async () => {
      llmService.createChat.mockResolvedValue({
        choices: [{ message: { content: 'merged' } }],
      } as any);
      conversationHistoryService.compact.mockImplementation(
        async ({ summarize }: any) => ({
          compacted: true,
          turnsCovered: 2,
          summary: await summarize(
            [{ role: 'user', content: 'newer' }],
            'earlier summary',
          ),
        }),
      );

      await consumer.process(
        job('compactConversation', {
          userId: 'user-1',
          conversationId: 'thread-1',
        }),
      );

      expect(llmService.createChat.mock.calls[0][0][1].content).toContain(
        'earlier summary',
      );
    });

    it('throws rather than storing an empty summary', async () => {
      // Persisting "" would silently erase the turns it stands in for, and the
      // history service would then skip replaying them.
      await expect(runCompaction(null)).rejects.toThrow(
        'Summariser returned no content',
      );
    });
  });

  it('lets a handler failure surface so BullMQ can retry', async () => {
    materialPersonalizationService.saveUserPersonalization.mockRejectedValue(
      new Error('llm unavailable'),
    );

    await expect(
      consumer.process(
        job('extractPersonalization', {
          userId: 'user-1',
          userSessionId: 'session-1',
        }),
      ),
    ).rejects.toThrow('llm unavailable');
  });
});
