import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';

@Injectable()
export class AppService implements OnApplicationShutdown {
  private readonly logger = new Logger(AppService.name);
  getHello(): string {
    this.logger.log('Hello World!');
    return 'Hello World!';
  }
  onApplicationShutdown(signal: string) {
    this.logger.log(`Application is shutting down with signal: ${signal}`);
  }
}
