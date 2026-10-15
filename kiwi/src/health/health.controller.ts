import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { Public } from 'src/auth/auth.decorator';
import { DatabaseService } from 'src/common/database/database.service';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private readonly indicator: HealthIndicatorService,
    private readonly db: DatabaseService,
  ) {}

  @Get()
  @HealthCheck()
  @Public()
  check() {
    return this.health.check([() => this.checkDatabase()]);
  }

  private async checkDatabase() {
    const database = this.indicator.check('database');
    try {
      await this.db.$queryRaw`SELECT 1`;
      return database.up();
    } catch (error) {
      return database.down({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
