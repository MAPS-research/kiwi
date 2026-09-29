import { Test, TestingModule } from '@nestjs/testing';
import { MaterialPersonalizationService as DatabaseMaterialPersonalizationService } from 'src/common/database/material-personalization.service';
import { LlmService } from 'src/common/llm/llm.service';
import { RedisService } from 'src/common/redis/redis.service';
import { DocumentService } from 'src/document/document.service';
import { InteractionService } from 'src/interaction/interaction.service';
import { MaterialPersonalizationService } from './material-personalization.service';
import { MAX_ROLLING_PROFILE_ROWS } from './rolling-profile';

describe('MaterialPersonalizationService', () => {
  let service: MaterialPersonalizationService;
  let database: { getLatestMaterialPersonalizationsByUser: jest.Mock };
  let interactionService: {
    getInteractionsWithServerActionsBySession: jest.Mock;
  };
  let llmService: { createChat: jest.Mock };

  beforeEach(async () => {
    database = {
      getLatestMaterialPersonalizationsByUser: jest.fn().mockResolvedValue([]),
    };
    interactionService = {
      getInteractionsWithServerActionsBySession: jest
        .fn()
        .mockResolvedValue([]),
    };
    llmService = { createChat: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialPersonalizationService,
        { provide: DatabaseMaterialPersonalizationService, useValue: database },
        { provide: RedisService, useValue: {} },
        { provide: InteractionService, useValue: interactionService },
        { provide: DocumentService, useValue: {} },
        { provide: LlmService, useValue: llmService },
      ],
    }).compile();

    service = module.get<MaterialPersonalizationService>(
      MaterialPersonalizationService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('rolling profile', () => {
    it('caps the rows it reads', async () => {
      await service.getRollingUserProfile('user-1');

      expect(
        database.getLatestMaterialPersonalizationsByUser,
      ).toHaveBeenCalledWith('user-1', MAX_ROLLING_PROFILE_ROWS);
    });

    it('renders one merged block instead of one line per session', async () => {
      database.getLatestMaterialPersonalizationsByUser.mockResolvedValue([
        {
          timeSpent: '20',
          learningStyle: 'visual',
          questionStyle: 'hints',
          studentGoodAt: 'loops',
          studentsImproveAt: 'recursion',
        },
        {
          timeSpent: '10',
          learningStyle: 'visual',
          questionStyle: 'hints',
          studentGoodAt: 'loops',
          studentsImproveAt: 'recursion',
        },
      ]);

      const block = await service.getRollingProfileBlock('user-1');

      expect(block).toContain('Learning style: visual');
      expect(block).toContain('30 minutes across 2 recent session(s)');
    });

    it('returns null when there is nothing remembered', async () => {
      expect(await service.getRollingProfileBlock('user-1')).toBeNull();
    });
  });

  describe('saveUserPersonalization', () => {
    it('skips the LLM call and the write for a session with no interactions', async () => {
      await service.saveUserPersonalization('session-1', 'user-1');

      expect(llmService.createChat).not.toHaveBeenCalled();
    });
  });
});
