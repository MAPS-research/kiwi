import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { UserSession, Prisma } from '@prisma/client';

@Injectable()
export class UserSessionService {
  constructor(private database: DatabaseService) {}

  async userSession(
    userSessionWhereUniqueInput: Prisma.UserSessionWhereUniqueInput,
  ): Promise<UserSession | null> {
    return this.database.userSession.findUnique({
      where: userSessionWhereUniqueInput,
    });
  }

  async userSessions(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserSessionWhereUniqueInput;
    where?: Prisma.UserSessionWhereInput;
    orderBy?: Prisma.UserSessionOrderByWithRelationInput;
  }): Promise<UserSession[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.database.userSession.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async findOrCreateUserSession(
    userId: string,
    researchNotesForSession?: { PN_STUDY: number },
  ): Promise<UserSession> {
    // Check for recent interactions within the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Find the most recent session with interactions in the last hour
    const recentSession = await this.database.userSession.findFirst({
      where: {
        userId: userId,
        interactions: {
          some: {
            timestamp: {
              gte: oneHourAgo,
            },
          },
        },
      },
      orderBy: {
        sessionStartTime: 'desc',
      },
    });

    // If we found a recent session, return it
    if (recentSession) {
      return recentSession;
    }

    // If no recent session found, create a new one
    return this.database.userSession.create({
      data: {
        userId: userId,
        researchNotesForSession: researchNotesForSession ?? undefined,
      },
    });
  }

  async createUserSession(
    userId: string,
    researchNotesForSession?: { PN_STUDY: number },
  ): Promise<UserSession> {
    // This method is kept for backward compatibility
    // but it's recommended to use findOrCreateUserSession instead
    return this.findOrCreateUserSession(userId, researchNotesForSession);
  }

  async updateUserSession(params: {
    where: Prisma.UserSessionWhereUniqueInput;
    data: Prisma.UserSessionUpdateInput;
  }): Promise<UserSession> {
    const { where, data } = params;
    return this.database.userSession.update({
      data,
      where,
    });
  }

  async incrementUserSessionTokensUsed(
    userSessionId: string,
    tokenCount: number,
  ): Promise<UserSession> {
    return this.database.userSession.update({
      where: {
        id: userSessionId,
      },
      data: {
        tokensUsed: {
          increment: tokenCount,
        },
      },
    });
  }
}
