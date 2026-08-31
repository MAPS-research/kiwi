import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { ContextJobsService } from './context-jobs.service';
import { CONTEXT_QUEUE } from './context-jobs.types';

describe('ContextJobsService', () => {
  let service: ContextJobsService;
  let queue: { add: jest.Mock };

  beforeEach(async () => {
    queue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextJobsService,
        { provide: getQueueToken(CONTEXT_QUEUE), useValue: queue },
      ],
    }).compile();

    service = module.get(ContextJobsService);
  });

  it('queues the extraction keyed by session so repeat beacons collapse', async () => {
    const jobId = await service.enqueueProfileExtraction({
      userId: 'user-1',
      userSessionId: 'session-1',
    });

    expect(jobId).toBe('job-1');
    expect(queue.add).toHaveBeenCalledWith(
      'extractPersonalization',
      { userId: 'user-1', userSessionId: 'session-1' },
      expect.objectContaining({
        jobId: 'extractPersonalization:session-1',
        attempts: 2,
      }),
    );
  });

  it('never throws at the caller when the queue is unavailable', async () => {
    queue.add.mockRejectedValue(new Error('redis down'));

    await expect(
      service.enqueueProfileExtraction({
        userId: 'user-1',
        userSessionId: 'session-1',
      }),
    ).resolves.toBeNull();
  });
});
