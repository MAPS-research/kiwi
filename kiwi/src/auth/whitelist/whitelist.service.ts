import { Injectable, Logger } from '@nestjs/common';
import { UserWhitelistService } from 'src/common/database/user-whistelist.service';

@Injectable()
export class WhitelistService {
  private readonly logger = new Logger(WhitelistService.name);
  constructor(private readonly userWhitelistService: UserWhitelistService) {}

  async create(params: { email: string }) {
    return this.userWhitelistService.createUserWhitelist(params);
  }

  async list() {
    const userWhitelistEntries = await this.userWhitelistService.userWhitelists(
      {},
    );
    return {
      entries: userWhitelistEntries,
    };
  }

  async listAllowed() {
    const userWhitelistEntries = await this.userWhitelistService.userWhitelists(
      {
        where: {
          status: 'enabled',
        },
      },
    );
    return {
      entries: userWhitelistEntries,
    };
  }

  async update(params: { email: string; status: 'enabled' | 'disabled' }) {
    return this.userWhitelistService.updateUserWhitelist(params);
  }
}
