import { Test } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { DatabaseService } from 'src/common/database/database.service';

describe('HealthController', () => {
  let controller: HealthController;
  let db: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    db = { $queryRaw: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      imports: [TerminusModule.forRoot({ logger: false })],
      controllers: [HealthController],
      providers: [{ provide: DatabaseService, useValue: db }],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('reports ok when the database answers', async () => {
    db.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    await expect(controller.check()).resolves.toMatchObject({
      status: 'ok',
      info: { database: { status: 'up' } },
    });
  });

  it('returns 503 when the database is unreachable', async () => {
    db.$queryRaw.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const result = controller.check();
    await expect(result).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(result).rejects.toMatchObject({
      response: {
        status: 'error',
        error: {
          database: { status: 'down', message: 'connect ECONNREFUSED' },
        },
      },
    });
  });
});
