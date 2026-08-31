import {
  Controller,
  Logger,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminGuard, JwtAuthGuard } from 'src/auth/auth.guard';
import { ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';
import {
  AddWhitelistRequest,
  ListWhitelistResponse,
  UpdateWhitelistRequest,
} from './dto/whitelist.request';
import { WhitelistService } from './whitelist.service';

@Controller('whitelist')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth('bearerAuth')
export class WhitelistController {
  private readonly logger = new Logger(WhitelistController.name);
  constructor(private readonly whitelistService: WhitelistService) {}

  @HttpCode(HttpStatus.OK)
  @Post('create')
  @ApiBody({
    type: AddWhitelistRequest,
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response',
  })
  async addUserToWhitelist(@Body() addWhitelistRequest: AddWhitelistRequest) {
    const { email } = addWhitelistRequest;
    return this.whitelistService.create({ email });
  }

  @HttpCode(HttpStatus.OK)
  @Get('list')
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: ListWhitelistResponse,
  })
  async listWhitelistUsers() {
    return this.whitelistService.list();
  }

  @HttpCode(HttpStatus.OK)
  @Post('update')
  @ApiBody({
    type: UpdateWhitelistRequest,
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response',
  })
  async updateUserWhitelist(
    @Body() updateWhitelistRequest: UpdateWhitelistRequest,
  ) {
    const { email, status } = updateWhitelistRequest;
    return this.whitelistService.update({ email, status });
  }
}
