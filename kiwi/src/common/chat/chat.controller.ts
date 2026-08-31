import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AdminGuard, JwtAuthGuard } from 'src/auth/auth.guard';
import { ChatRequest } from './dto/chat-request.dto';

@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @Post()
  @ApiResponse({
    status: 200,
    description: 'Successful response',
  })
  createChat(@Body() chatRequest: ChatRequest) {
    const { input, image } = chatRequest;
    this.logger.debug('Creating chat for', input);
    return this.chatService.createChat(input, image);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('stream')
  @ApiResponse({
    status: 200,
    description: 'Successful response',
  })
  @Sse()
  createChatStream(@Body() chatRequest: ChatRequest) {
    const { input, image } = chatRequest;
    this.logger.debug('Creating chat for', input);
    return this.chatService.createChatStream(input, image);
  }
}
