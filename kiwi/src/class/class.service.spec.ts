import { Test, TestingModule } from '@nestjs/testing';
import { ClassService } from './class.service';

describe('ClassService', () => {
  let service: ClassService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClassService],
    })
      .useMocker(() => ({ get: jest.fn() }))
      .compile();

    service = module.get<ClassService>(ClassService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
