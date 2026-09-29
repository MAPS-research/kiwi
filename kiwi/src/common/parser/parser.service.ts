import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DocumentParser,
  ParsedDocument,
  ParserInput,
  ParserName,
} from './parser.types';
import { UnstructuredParser } from './unstructured/unstructured.parser';
import { XbergParser } from './xberg/xberg.parser';

const PARSERS: readonly ParserName[] = ['xberg', 'unstructured'];

/**
 * Chooses the document parser.
 *
 * `PARSER` selects the implementation; everything downstream of this service
 * sees the same chunk shape either way. Defaults to `xberg`, the parser
 * compose.yml runs; set `PARSER=unstructured` to use Unstructured.
 */
@Injectable()
export class ParserService implements OnModuleInit {
  private readonly logger = new Logger(ParserService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly xbergParser: XbergParser,
    private readonly unstructuredParser: UnstructuredParser,
  ) {}

  /**
   * Fail at boot rather than on the first upload: a misconfigured parser
   * otherwise surfaces as a failed document minutes into a user's first
   * interaction with the system.
   */
  onModuleInit(): void {
    const name = this.parserName;
    const required =
      name === 'xberg' ? 'XBERG_API_URL' : 'UNSTRUCTURED_API_URL';

    if (!this.configService.get<string>(required)) {
      throw new Error(`PARSER=${name} requires ${required} to be set.`);
    }

    this.logger.log(`Document parser: ${name}`);
  }

  get parserName(): ParserName {
    const configured = (
      this.configService.get<string>('PARSER') ?? 'xberg'
    ).toLowerCase();

    if (!PARSERS.includes(configured as ParserName)) {
      throw new Error(
        `Unknown PARSER "${configured}". Expected one of: ${PARSERS.join(', ')}.`,
      );
    }
    return configured as ParserName;
  }

  private get parser(): DocumentParser {
    return this.parserName === 'xberg'
      ? this.xbergParser
      : this.unstructuredParser;
  }

  async parse(input: ParserInput): Promise<ParsedDocument> {
    const parser = this.parser;
    const started = Date.now();

    const parsed = await parser.parse(input);

    this.logger.log(
      `Parsed ${input.fileName} with ${parser.name}: ` +
        `${parsed.chunks.length} chunks in ${Date.now() - started}ms`,
    );
    for (const warning of parsed.warnings) {
      this.logger.warn(`${parser.name}: ${warning}`);
    }

    return parsed;
  }
}
