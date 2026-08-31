import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Logger,
  Body,
  UseGuards,
} from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AdminGuard, JwtAuthGuard } from 'src/auth/auth.guard';
import { CreateEmbeddingDto } from './dto/create-embedding.dto';
import { EmbeddingResponseDto } from './dto/create-embedding-response.dto';

@Controller('embedding')
export class EmbeddingController {
  private readonly logger = new Logger(EmbeddingController.name);

  constructor(private readonly embeddingService: EmbeddingService) {}

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('create')
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: EmbeddingResponseDto,
  })
  createEmbedding(@Body() createEmbeddingDto: CreateEmbeddingDto) {
    const { input } = createEmbeddingDto;
    return this.embeddingService.createEmbedding(input);
  }
}
