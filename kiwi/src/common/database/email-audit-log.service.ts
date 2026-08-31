import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { EmailAuditLog, Prisma } from '@prisma/client';

@Injectable()
export class EmailAuditLogService {
  constructor(private prisma: DatabaseService) {}

  async emailAuditLog(
    emailAuditLogWhereUniqueInput: Prisma.EmailAuditLogWhereUniqueInput,
  ): Promise<EmailAuditLog | null> {
    return this.prisma.emailAuditLog.findUnique({
      where: emailAuditLogWhereUniqueInput,
      include: {
        user: true,
        class: true,
      },
    });
  }

  async emailAuditLogs(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.EmailAuditLogWhereUniqueInput;
    where?: Prisma.EmailAuditLogWhereInput;
    orderBy?: Prisma.EmailAuditLogOrderByWithRelationInput;
  }): Promise<EmailAuditLog[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.emailAuditLog.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include: {
        user: true,
        class: true,
      },
    });
  }

  async createEmailAuditLog(
    data: Prisma.EmailAuditLogCreateInput,
  ): Promise<EmailAuditLog> {
    return this.prisma.emailAuditLog.create({
      data,
      include: {
        user: true,
        class: true,
      },
    });
  }

  async updateEmailAuditLog(params: {
    where: Prisma.EmailAuditLogWhereUniqueInput;
    data: Prisma.EmailAuditLogUpdateInput;
  }): Promise<EmailAuditLog> {
    const { where, data } = params;
    return this.prisma.emailAuditLog.update({
      data,
      where,
      include: {
        user: true,
        class: true,
      },
    });
  }

  async deleteEmailAuditLog(
    where: Prisma.EmailAuditLogWhereUniqueInput,
  ): Promise<EmailAuditLog> {
    return this.prisma.emailAuditLog.delete({
      where,
      include: {
        user: true,
        class: true,
      },
    });
  }

  async countEmailAuditLogs(
    where?: Prisma.EmailAuditLogWhereInput,
  ): Promise<number> {
    return this.prisma.emailAuditLog.count({ where });
  }

  async getEmailStats(params: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    classId?: string;
  }): Promise<{
    totalSent: number;
    totalFailed: number;
    totalTestMode: number;
    byEmailType: { emailType: string; count: number }[];
  }> {
    const { startDate, endDate, userId, classId } = params;

    const where: Prisma.EmailAuditLogWhereInput = {};

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    if (userId) where.userId = userId;
    if (classId) where.classId = classId;

    const [totalSent, totalFailed, totalTestMode, byEmailType] =
      await Promise.all([
        this.prisma.emailAuditLog.count({
          where: { ...where, status: 'sent' },
        }),
        this.prisma.emailAuditLog.count({
          where: { ...where, status: 'failed' },
        }),
        this.prisma.emailAuditLog.count({
          where: { ...where, status: 'test_mode' },
        }),
        this.prisma.emailAuditLog.groupBy({
          by: ['emailType'],
          where,
          _count: {
            emailType: true,
          },
        }),
      ]);

    return {
      totalSent,
      totalFailed,
      totalTestMode,
      byEmailType: byEmailType.map((item: any) => ({
        emailType: item.emailType,
        count: item._count.emailType,
      })),
    };
  }
}
