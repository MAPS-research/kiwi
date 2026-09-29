import { Test, TestingModule } from '@nestjs/testing';
import { UnstructuredService } from './unstructured.service';

describe('UnstructuredService', () => {
  let service: UnstructuredService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UnstructuredService],
    })
      .useMocker(() => ({ get: jest.fn() }))
      .compile();

    service = module.get<UnstructuredService>(UnstructuredService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
