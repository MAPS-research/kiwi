import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { DatabaseModule } from 'src/common/database/database.module';
import { AuthModule } from 'src/auth/auth.module';
import { ClassModule } from 'src/class/class.module';

@Module({
  imports: [ConfigModule, DatabaseModule, AuthModule, ClassModule],
  providers: [EmailService],
  controllers: [EmailController],
  exports: [EmailService],
})
export class EmailModule {}
