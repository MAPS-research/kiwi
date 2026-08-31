import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/auth.guard';
import { ConsentService } from './consent.service';

@Controller('consent')
export class ConsentController {
  private readonly logger = new Logger(ConsentController.name);

  constructor(private readonly consentService: ConsentService) {}

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Get()
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    schema: {
      type: 'boolean',
      example: true,
    },
  })
  getConsentStatus(@Request() req: any) {
    return this.consentService.getConsentStatus(req);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Post()
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    schema: {
      type: 'boolean',
      example: true,
    },
  })
  updateConsentStatus(@Request() req: any) {
    return this.consentService.updateConsentStatus(req);
  }
}
