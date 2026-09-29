import { Test, TestingModule } from '@nestjs/testing';
import { StorageController } from './storage.controller';

describe('StorageController', () => {
  let controller: StorageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StorageController],
    })
      .useMocker(() => ({
        get: jest.fn().mockReturnValue('http://localhost'),
      }))
      .compile();

    controller = module.get<StorageController>(StorageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
