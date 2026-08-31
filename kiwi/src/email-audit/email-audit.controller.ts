import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Session,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard, AdminGuard, ProfGuard } from 'src/auth/auth.guard';
import { EmailAuditLogService } from 'src/common/database/email-audit-log.service';
import {
  EmailAuditLogDto,
  ListEmailAuditLogsDto,
  EmailAuditLogsResponseDto,
  EmailStatsDto,
  GetEmailStatsDto,
} from './dto/email-audit-log.dto';
import { Prisma } from '@prisma/client';

@ApiTags('email-audit')
@Controller('email-audit')
export class EmailAuditController {
  constructor(private readonly emailAuditLogService: EmailAuditLogService) {}

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('logs')
  @ApiOperation({ summary: 'List email audit logs (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'List of email audit logs',
    type: EmailAuditLogsResponseDto,
  })
  async listLogs(
    @Query() query: ListEmailAuditLogsDto,
  ): Promise<EmailAuditLogsResponseDto> {
    const where: Prisma.EmailAuditLogWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.emailType) {
      where.emailType = query.emailType;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.classId) {
      where.classId = query.classId;
    }

    if (query.recipientEmail) {
      where.toEmails = {
        has: query.recipientEmail,
      };
    }

    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) {
        where.timestamp.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.timestamp.lte = new Date(query.endDate);
      }
    }

    const [logs, total] = await Promise.all([
      this.emailAuditLogService.emailAuditLogs({
        where,
        skip: query.skip ? Number(query.skip) : 0,
        take: query.take ? Number(query.take) : 20,
        orderBy: { timestamp: 'desc' },
      }),
      this.emailAuditLogService.countEmailAuditLogs(where),
    ]);

    return {
      logs,
      total,
      skip: query.skip || 0,
      take: query.take || 20,
    };
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('logs/:id')
  @ApiOperation({ summary: 'Get specific email audit log (Admin only)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Email audit log details',
    type: EmailAuditLogDto,
  })
  async getLog(@Param('id') id: string): Promise<EmailAuditLogDto> {
    const log = await this.emailAuditLogService.emailAuditLog({ id });

    if (!log) {
      throw new NotFoundException('Email audit log not found');
    }

    return log;
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('stats')
  @ApiOperation({ summary: 'Get email statistics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Email statistics',
    type: EmailStatsDto,
  })
  async getStats(@Query() query: GetEmailStatsDto): Promise<EmailStatsDto> {
    const params: Parameters<
      typeof this.emailAuditLogService.getEmailStats
    >[0] = {};

    if (query.startDate) {
      params.startDate = new Date(query.startDate);
    }

    if (query.endDate) {
      params.endDate = new Date(query.endDate);
    }

    if (query.userId) {
      params.userId = query.userId;
    }

    if (query.classId) {
      params.classId = query.classId;
    }

    return this.emailAuditLogService.getEmailStats(params);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, ProfGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('my-logs')
  @ApiOperation({ summary: "Get professor's own email logs" })
  @ApiResponse({
    status: 200,
    description: "Professor's email audit logs",
    type: EmailAuditLogsResponseDto,
  })
  async getMyLogs(
    @Session() session: Record<string, any>,
    @Query() query: ListEmailAuditLogsDto,
  ): Promise<EmailAuditLogsResponseDto> {
    const userId = session.userId;
    if (!userId) {
      throw new ForbiddenException('User ID not found in session');
    }

    const where: Prisma.EmailAuditLogWhereInput = {
      userId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.emailType) {
      where.emailType = query.emailType;
    }

    if (query.classId) {
      where.classId = query.classId;
    }

    if (query.recipientEmail) {
      where.toEmails = {
        has: query.recipientEmail,
      };
    }

    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) {
        where.timestamp.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.timestamp.lte = new Date(query.endDate);
      }
    }

    const [logs, total] = await Promise.all([
      this.emailAuditLogService.emailAuditLogs({
        where,
        skip: query.skip ? Number(query.skip) : 0,
        take: query.take ? Number(query.take) : 20,
        orderBy: { timestamp: 'desc' },
      }),
      this.emailAuditLogService.countEmailAuditLogs(where),
    ]);

    return {
      logs,
      total,
      skip: query.skip || 0,
      take: query.take || 20,
    };
  }
}
