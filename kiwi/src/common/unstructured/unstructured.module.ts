import { Module } from '@nestjs/common';
import { UnstructuredService } from './unstructured.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [UnstructuredService],
  exports: [UnstructuredService],
})
export class UnstructuredModule {}
