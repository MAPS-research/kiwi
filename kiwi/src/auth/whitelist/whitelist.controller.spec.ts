import { Test, TestingModule } from '@nestjs/testing';
import { WhitelistController } from './whitelist.controller';
import { WhitelistService } from './whitelist.service';

describe('WhitelistController', () => {
  let controller: WhitelistController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhitelistController],
      providers: [WhitelistService],
    }).compile();

    controller = module.get<WhitelistController>(WhitelistController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
