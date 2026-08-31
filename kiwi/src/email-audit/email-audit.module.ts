import { Module } from '@nestjs/common';
import { EmailAuditController } from './email-audit.controller';
import { DatabaseModule } from 'src/common/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [EmailAuditController],
})
export class EmailAuditModule {}
