import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UserService } from 'src/common/database/user.service';

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);
  constructor(private userService: UserService) {}

  async getUserFromRequest(req: any): Promise<any> {
    const userId = req.session.userId;

    if (!userId) {
      this.logger.error('User not found');
      throw new UnauthorizedException();
    }

    const user = await this.userService.user({
      id: userId,
    });

    if (!user) {
      this.logger.error('User not found');
      throw new UnauthorizedException();
    }

    return user;
  }

  async getConsentStatus(req: any): Promise<boolean> {
    const user = await this.getUserFromRequest(req);

    return user.consent ?? false;
  }

  async updateConsentStatus(req: any): Promise<boolean> {
    const user = await this.getUserFromRequest(req);

    const updatedUser = await this.userService.updateUser({
      where: { id: user.id },
      data: {
        consent: true,
      },
    });

    return updatedUser.consent ?? false;
  }
}
