import { Test } from '@nestjs/testing';
import { AppContextService } from './app-context.service';
import { UserInteractionService } from 'src/common/database/user-interaction.service';
import { KeywordService } from 'src/common/database/keyword.service';
import { UserService } from 'src/common/database/user.service';
import { ClassService } from 'src/class/class.service';

describe('AppContextService', () => {
  let service: AppContextService;

  const userInteractionService = {
    userInteractionsWithServerActions: jest.fn(),
  };
  const keywordService = { getLectureKeywordsByClassId: jest.fn() };
  const userService = { user: jest.fn() };
  const classService = { queryClassDocuments: jest.fn() };

  const baseParams = {
    userId: 'user-1',
    classId: 'class-1',
    timeWindowDays: 7,
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AppContextService,
        { provide: UserInteractionService, useValue: userInteractionService },
        { provide: KeywordService, useValue: keywordService },
        { provide: UserService, useValue: userService },
        { provide: ClassService, useValue: classService },
      ],
    }).compile();
    service = moduleRef.get(AppContextService);
  });

  it('drops recent_questions for a non-consented student and reports it', async () => {
    userService.user.mockResolvedValue({ id: 'user-1', consent: false });

    const result = await service.assembleStudentLearningContext({
      ...baseParams,
      include: ['recent_questions'],
    });

    expect(result.included).toEqual([]);
    expect(result.omitted).toEqual(['recent_questions']);
    expect(result.contextText).toBe('');
    expect(
      userInteractionService.userInteractionsWithServerActions,
    ).not.toHaveBeenCalled();
  });

  it('includes recent questions from both interaction storage patterns when consented', async () => {
    userService.user.mockResolvedValue({ id: 'user-1', consent: true });
    userInteractionService.userInteractionsWithServerActions.mockResolvedValue([
      {
        context: { content: { prompt: 'What is recursion?' } },
      },
      {
        context: {
          messages: [
            { role: 'user', content: 'Why does my loop not stop?' },
            { role: 'assistant', content: 'Consider the exit condition.' },
          ],
        },
      },
    ]);

    const result = await service.assembleStudentLearningContext({
      ...baseParams,
      include: ['recent_questions'],
    });

    expect(result.included).toEqual(['recent_questions']);
    expect(result.omitted).toEqual([]);
    expect(result.contextText).toContain('What is recursion?');
    expect(result.contextText).toContain('Why does my loop not stop?');
    expect(result.contextText).not.toContain('Consider the exit condition');
    expect(
      userInteractionService.userInteractionsWithServerActions,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          classId: 'class-1',
          timestamp: { gte: expect.any(Date) },
        }),
      }),
    );
  });

  it('aggregates weak concepts across completed lectures only', async () => {
    keywordService.getLectureKeywordsByClassId.mockResolvedValue([
      {
        status: 'completed',
        keywords: [
          { text: 'recursion', count: 5 },
          { text: 'big-o', count: 2 },
        ],
      },
      {
        status: 'completed',
        keywords: [{ text: 'recursion', count: 3 }],
      },
      {
        status: 'processing',
        keywords: [{ text: 'should-not-appear', count: 99 }],
      },
    ]);

    const result = await service.assembleStudentLearningContext({
      ...baseParams,
      include: ['weak_concepts'],
    });

    expect(result.included).toEqual(['weak_concepts']);
    expect(result.contextText).toContain('recursion (8 mentions)');
    expect(result.contextText).toContain('big-o (2 mentions)');
    expect(result.contextText).not.toContain('should-not-appear');
  });

  it('retrieves relevant materials with the app-supplied query and formats sources', async () => {
    classService.queryClassDocuments.mockResolvedValue([
      { documentId: 'doc-1', documentPageNumber: '3', text: 'Recursion is...' },
    ]);

    const result = await service.assembleStudentLearningContext({
      ...baseParams,
      include: ['relevant_materials'],
      retrievalQuery: 'recursion base case',
    });

    expect(classService.queryClassDocuments).toHaveBeenCalledWith(
      'recursion base case',
      'class-1',
      5,
    );
    expect(result.contextText).toContain('[1] (document doc-1, page 3)');
    expect(result.contextText).toContain('Recursion is...');
  });

  it('degrades the materials section when retrieval fails', async () => {
    classService.queryClassDocuments.mockRejectedValue(
      new Error('embedding provider down'),
    );

    const result = await service.assembleStudentLearningContext({
      ...baseParams,
      include: ['relevant_materials'],
    });

    expect(result.included).toEqual(['relevant_materials']);
    expect(result.contextText).toContain(
      'Class material retrieval is currently unavailable.',
    );
  });

  it('caps the assembled context length', async () => {
    userService.user.mockResolvedValue({ id: 'user-1', consent: true });
    userInteractionService.userInteractionsWithServerActions.mockResolvedValue(
      Array.from({ length: 100 }, () => ({
        context: { content: { prompt: 'q'.repeat(600) } },
      })),
    );

    const result = await service.assembleStudentLearningContext({
      ...baseParams,
      include: ['recent_questions'],
    });

    expect(result.contextText.length).toBeLessThanOrEqual(16000);
  });
});
