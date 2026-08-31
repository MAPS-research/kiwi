import { Test, TestingModule } from '@nestjs/testing';
import { WhitelistService } from './whitelist.service';

describe('WhitelistService', () => {
  let service: WhitelistService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WhitelistService],
    }).compile();

    service = module.get<WhitelistService>(WhitelistService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
