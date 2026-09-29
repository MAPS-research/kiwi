import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from './database.service';

// import {
//   database,
//   UserInteraction,
//   ServerAction,
//   UpvoteInteraction,
//   DiscussionRoot,
//   Discussion,
//   UpvoteDiscussion,
// } from '@database/client';

@Injectable()
export class CompetitionService {
  constructor(private database: DatabaseService) {}
  private readonly logger = new Logger(CompetitionService.name);

  /**
   * Create a new competition
   */
  async createCompetition(
    name: string,
    dailyLimit: number,
    description: string,
    metaData: Record<string, any>,
    startDate: Date,
    endDate?: Date,
  ): Promise<string> {
    try {
      const competition = await this.database.competition.create({
        data: {
          name,
          startDate,
          endDate,
          dailyLimit,
          description,
          metaData,
        },
      });
      this.logger.log(`Competition created: ${competition.id}`);
      return competition.id;
    } catch (error) {
      this.logger.error('Error creating competition', error.message);
      throw new Error(`Failed to create competition: ${error.message}`);
    }
  }

  // update competition
  async updateCompetition(
    competitionId: string,
    name: string,
    dailyLimit: number,
    description: string,
    metaData: Record<string, any>,
    startDate: Date,
    endDate?: Date,
  ): Promise<string> {
    try {
      const competition = await this.database.competition.update({
        where: { id: competitionId },
        data: {
          name,
          dailyLimit,
          description,
          metaData,
          startDate,
          endDate,
        },
      });
      this.logger.log(`Competition updated: ${competition.id}`);
      return competition.id;
    } catch (error) {
      this.logger.error('Error updating competition', error.message);
      throw new Error(`Failed to update competition: ${error.message}`);
    }
  }

  // get all competitions if no user provided
  async getCompetitions(
    userId: string | null,
  ): Promise<Array<Record<string, any>>> {
    try {
      if (userId) {
        // get all competitors for the user
        const competitors = await this.database.competitor.findMany({
          where: { userId },
        });
        // get all competitions for the competitors
        const competitionIds = competitors.map(
          (competitor) => competitor.competitionId,
        );
        const competitions = await this.database.competition.findMany({
          where: { id: { in: competitionIds } },
        });
        return competitions;
      }
      // if no userId provided, get all competitions
      const competitions = await this.database.competition.findMany();
      this.logger.log(`Competitions retrieved: ${competitions.length}`);
      return competitions;
    } catch (error) {
      this.logger.error('Error retrieving competitions', error.message);
      throw new Error(`Failed to retrieve competitions: ${error.message}`);
    }
  }

  /**
   * Enroll a user into a competition as a competitor
   */
  async enrollCompetitor(
    competitionId: string,
    userId: string,
    name: string,
    metaData: Record<string, any>,
  ): Promise<any> {
    try {
      const competitor = await this.database.competitor.create({
        data: {
          competitionId,
          userId,
          name,
          metaData,
        },
      });
      this.logger.log(`Competitor enrolled: ${competitor.id}`);
      return competitor;
    } catch (error) {
      this.logger.error('Error enrolling competitor', error.message);
      throw new Error(`Failed to enroll competitor: ${error.message}`);
    }
  }

  /**
   * Get the leaderboard of a competition
   */
  async getLeaderboard(
    competitionId: string,
  ): Promise<Array<Record<string, any>>> {
    // get all competitors and their bestScores from db
    // best score is stored in competitor.bestScore
    try {
      const competitors = await this.database.competitor.findMany({
        where: { competitionId },
        include: {
          entries: {
            select: {
              id: true,
            },
          },
        },
      });
      this.logger.log(
        `Leaderboard retrieved for competition: ${competitionId}`,
      );
      return competitors.map((competitor) => ({
        id: competitor.id,
        name: competitor.name,
        bestScore: competitor.bestScore,
        timestamp: competitor.bestScoreTime,
        num_entries: competitor.entries.length,
        imageSnippetUrl:
          (competitor.metaData as Record<string, any>)?.imageSnippetUrl || '',
        metaData: competitor.metaData,
        status: 'done',
      }));
    } catch (error) {
      this.logger.error('Error retrieving leaderboard', error.message);
      throw new Error(`Failed to retrieve leaderboard: ${error.message}`);
    }
  }

  /**
   * Get entries of a user in a competition
   */
  async getUserEntries(
    competitionId: string,
    userId: string,
  ): Promise<Array<Record<string, any>>> {
    try {
      const entries = await this.database.competitorEntry.findMany({
        where: {
          competitor: {
            competitionId,
            userId,
          },
        },
        include: {
          competitor: {
            select: {
              name: true,
            },
          },
        },
      });
      this.logger.log(
        `Entries retrieved for user: ${userId} in competition: ${competitionId}`,
      );
      return entries;
    } catch (error) {
      this.logger.error('Error retrieving user entries', error.message);
      throw new Error(`Failed to retrieve user entries: ${error.message}`);
    }
  }

  // add entry for a competitor
  async addEntryForCompetitor(
    competitorId: string,
    metrics: Record<string, any>,
    metaData: Record<string, any>,
  ): Promise<string> {
    try {
      const entry = await this.database.competitorEntry.create({
        data: {
          competitorId: competitorId,
          metrics: metrics,
          metaData: metaData,
          status: 'submitted',
        },
      });
      this.logger.log(`New entry inserted for competitor: ${competitorId}`);

      if (metrics.score) {
        // Update the competitor's best score if this entry is better
        const competitor = await this.database.competitor.findUnique({
          where: { id: competitorId },
        });
        if (competitor && competitor.bestScore > metrics.score) {
          await this.database.competitor.update({
            where: { id: competitorId },
            data: { bestScore: metrics.score },
          });
          this.logger.log(`Updated best score for competitor: ${competitorId}`);
        }
      }

      return entry.id;
    } catch (error) {
      this.logger.error('Error inserting entry', error.message);
      throw new Error(`Failed to insert entry: ${error.message}`);
    }
  }

  // update entry for a competitor
  async updateEntry(
    entryId: string,
    metrics: Record<string, any>,
    metaData: Record<string, any>,
    status: string,
  ): Promise<string> {
    try {
      const entry = await this.database.competitorEntry.update({
        where: { id: entryId },
        data: {
          metrics: metrics,
          metaData: metaData,
          status: status,
        },
      });
      this.logger.log(`Entry updated for competitor: ${entryId}`);

      if (metrics.score) {
        // Update the competitor's best score if this entry is better
        const competitor = await this.database.competitor.findUnique({
          where: { id: entry.competitorId },
        });
        if (competitor && competitor.bestScore > metrics.score) {
          await this.database.competitor.update({
            where: { id: entry.competitorId },
            data: {
              bestScore: metrics.score,
              metaData: metaData,
            },
          });
          this.logger.log(
            `Updated best score for competitor: ${entry.competitorId}`,
          );
        }
      }

      return entry.id;
    } catch (error) {
      this.logger.error('Error updating entry', error.message);
      throw new Error(`Failed to update entry: ${error.message}`);
    }
  }

  // get competitorId by userId
  async getCompetitorIdByUserCompetitionId(
    userId: string,
    competitionId: string,
  ): Promise<string> {
    try {
      const competitor = await this.database.competitor.findUnique({
        where: {
          userId_competitionId: {
            userId,
            competitionId,
          },
        },
      });
      if (!competitor) {
        throw new Error(`Competitor not found for userId: ${userId}`);
      }
      return competitor.id;
    } catch (error) {
      this.logger.error(
        'Error retrieving competitorId by userId',
        error.message,
      );
      throw new Error(`Failed to retrieve competitorId: ${error.message}`);
    }
  }

  /**
   * Get competitor info for a user in a competition
   */
  async getCompetitorInfo(
    userId: string,
    competitionId: string,
  ): Promise<Record<string, any>> {
    try {
      const competitor = await this.database.competitor.findUnique({
        where: {
          userId_competitionId: {
            userId,
            competitionId,
          },
        },
      });
      if (!competitor) {
        throw new Error(
          `Competitor not found for userId: ${userId} in competitionId: ${competitionId}`,
        );
      }
      this.logger.log(
        `Competitor info retrieved for user: ${userId} in competition: ${competitionId}`,
      );
      return competitor;
    } catch (error) {
      this.logger.error('Error retrieving competitor info', error.message);
      throw new Error(`Failed to retrieve competitor info: ${error.message}`);
    }
  }

  /**
   * Update competitor info
   */
  async updateCompetitorInfo(
    competitorId: string,
    name: string,
    imageSnippetUrl: string | null,
  ): Promise<Record<string, any>> {
    try {
      const competitor = await this.database.competitor.findUnique({
        where: { id: competitorId },
      });
      if (!competitor) {
        throw new Error(`Competitor not found for id: ${competitorId}`);
      }

      // generate the updated metaData
      const metaData = competitor.metaData as Record<string, any>;
      // If imageSnippetUrl is not null, append it to the existing metaData
      // Otherwise, keep the existing metaData
      if (imageSnippetUrl) {
        metaData.imageSnippetUrl = imageSnippetUrl;
      }

      this.logger.log(metaData);
      const updatedCompetitor = await this.database.competitor.update({
        where: { id: competitorId },
        data: {
          name: name,
          metaData: metaData,
        },
      });
      this.logger.log(
        `Competitor info updated for competitorId: ${competitorId}`,
      );
      return updatedCompetitor;
    } catch (error) {
      this.logger.error('Error updating competitor info', error.message);
      throw new Error(`Failed to update competitor info: ${error.message}`);
    }
  }

  // get competition info and competitor info from competitorId
  async getCompetitorInfoComplete(
    competitorId: string,
  ): Promise<Record<string, any>> {
    try {
      const competitor = await this.database.competitor.findUnique({
        where: { id: competitorId },
        include: {
          competition: true,
          entries: true,
        },
      });
      if (!competitor) {
        throw new Error(`Competitor not found for id: ${competitorId}`);
      }
      this.logger.log(
        `Competition info retrieved for competitorId: ${competitorId}`,
      );
      return competitor;
    } catch (error) {
      this.logger.error('Error retrieving competition info', error.message);
      throw new Error(`Failed to retrieve competition info: ${error.message}`);
    }
  }
}
