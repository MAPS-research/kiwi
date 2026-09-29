import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UnstructuredModule } from 'src/common/unstructured/unstructured.module';
import { ParserService } from './parser.service';
import { UnstructuredParser } from './unstructured/unstructured.parser';
import { XbergParser } from './xberg/xberg.parser';

@Module({
  imports: [ConfigModule, UnstructuredModule],
  providers: [ParserService, XbergParser, UnstructuredParser],
  exports: [ParserService],
})
export class ParserModule {}
