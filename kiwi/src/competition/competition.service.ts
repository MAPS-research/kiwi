import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { CompetitionService as DatabaseCompetitionService } from '../common/database/competition.service';
import { StorageService } from '../common/storage/storage.service';

@Injectable()
export class CompetitionService {
  private readonly logger = new Logger(CompetitionService.name);
  constructor(
    private database: DatabaseCompetitionService,
    private storageService: StorageService,
  ) {}

  /**
   * Load a user model
   */
  async loadModel(
    userId: string,
    competitionId: string,
    targetUrl: string,
  ): Promise<string> {
    try {
      this.logger.log(
        `Loading model for user: ${userId}, competition: ${competitionId} at ${targetUrl}`,
      );
      const response = await axios.get(`${targetUrl}${userId}`);
      this.logger.log(`Model load response: ${JSON.stringify(response.data)}`);

      return response.data;
    } catch (error) {
      this.logger.error(
        `Error loading model for user: ${userId}, competition: ${competitionId}`,
        error.message,
      );
      throw new Error(
        `Failed to load model: ${error.response?.data?.detail || error.message}`,
      );
    }
  }

  /**
   * Launch inference on the user model
   */
  async runInference(
    userId: string,
    entryId: string,
    competitionId: string,
    targetUrl: string,
  ): Promise<string> {
    try {
      this.logger.log(
        `Running inference for user: ${userId}, entry ${entryId}, competition: ${competitionId} at ${targetUrl}`,
      );
      const response = await axios.post(`${targetUrl}${userId}/${entryId}`);
      this.logger.log(`Inference response: ${JSON.stringify(response.data)}`);

      return response.data.message;
    } catch (error) {
      this.logger.error(
        `Error laucnhing inference for user: ${userId}, competition: ${competitionId}`,
        error.message,
      );
      throw new Error(
        `Failed to launch inference: ${error.response?.data?.detail || error.message}`,
      );
    }
  }

  /**
   * Get the status of the inference
   */
  async getInferenceStatus(
    userId: string,
    entryId: string,
    targetUrl: string,
  ): Promise<Record<string, any>> {
    try {
      this.logger.log(
        `Querying inference status for user: ${userId}, entry ${entryId} at ${targetUrl}`,
      );
      const response = await axios.get(`${targetUrl}${userId}/${entryId}`);
      this.logger.log(
        `Inference status response: ${JSON.stringify(response.data)}`,
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Error querying inference status for user: ${userId}, `,
        error.message,
      );
      throw new Error(
        `Failed to query inference status: ${error.response?.data?.detail || error.message}`,
      );
    }
  }

  /**
   * Get the image file from the server, store it in S3, and generate a signed URL
   */
  async getImageFile(
    userId: string,
    entryId: string,
    imageIndex: number,
    targetUrl: string,
  ): Promise<string> {
    try {
      this.logger.log(
        `Retrieving image file for user: ${userId}, entryId: ${entryId}, imageIndex: ${imageIndex} at ${targetUrl}`,
      );
      const response = await axios.get(
        `${targetUrl}${userId}/${entryId}/${imageIndex}`,
        {
          responseType: 'arraybuffer',
        },
      );

      this.logger.log(
        `Image file retrieved for user: ${userId}, entryId: ${entryId}, imageIndex: ${imageIndex}`,
      );

      // Store the image file in S3
      const key = `${userId}/${entryId}/${imageIndex}.jpg`;
      const { key: s3Key } = await this.storageService.uploadFile(
        {
          buffer: Buffer.from(response.data),
          mimetype: 'image/jpeg',
        } as Express.Multer.File,
        key,
      );

      return s3Key;
    } catch (error) {
      this.logger.error(
        `Error retrieving or storing image file for user: ${userId}, entryId: ${entryId}, imageIndex: ${imageIndex}`,
        error.message,
      );
      throw new Error(
        `Failed to retrieve or store image file: ${error.response?.data?.detail || error.message}`,
      );
    }
  }

  /**
   * Get metrics for the inference
   */
  async getInferenceMetrics(
    userId: string,
    entryId: string,
    targetUrl: string,
  ): Promise<Record<string, any>> {
    try {
      this.logger.log(
        `Retrieving inference metrics for user: ${userId}, entryId: ${entryId} at ${targetUrl}`,
      );
      const response = await axios.get(`${targetUrl}${userId}/${entryId}`);
      this.logger.log(
        `Inference metrics response: ${JSON.stringify(response.data)}`,
      );

      return {
        accuracy: response.data.accuracy,
      };
    } catch (error) {
      this.logger.error(
        `Error retrieving inference metrics for user: ${userId}, entryId: ${entryId}`,
        error.message,
      );
      throw new Error(
        `Failed to retrieve inference metrics: ${error.response?.data?.detail || error.message}`,
      );
    }
  }

  async getInitializeModelStatus(
    userId: string,
    targetUrl: string,
  ): Promise<Record<string, any>> {
    try {
      this.logger.log(
        `Querying initialize status for user: ${userId}, at ${targetUrl}`,
      );
      const response = await axios.get(`${targetUrl}${userId}`);
      this.logger.log(
        `initialize status response: ${JSON.stringify(response.data)}`,
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Error querying initialize status for user: ${userId}, `,
        error.message,
      );
      throw new Error(
        `Failed to query initialize status: ${error.response?.data?.detail || error.message}`,
      );
    }
  }

  // helper function to count how many entries are of today
  countEntriesToday(entries: Record<string, any>[]): number {
    const now = new Date();
    const numEntries = entries.filter((entry) => {
      const entryDate = new Date(entry.timestamp);
      return (
        entryDate.getDate() === now.getDate() &&
        entryDate.getMonth() === now.getMonth() &&
        entryDate.getFullYear() === now.getFullYear()
      );
    }).length;

    return numEntries;
  }

  // helper function, given the daily limit, for a competitor, compute how many entries are left
  async getEntriesLeft(competitorId: string): Promise<Record<string, any>> {
    try {
      const competitor =
        await this.database.getCompetitorInfoComplete(competitorId);
      const dailyLimit = competitor.competition.dailyLimit;
      const entries = competitor.entries;
      const numEntriesToday = await this.countEntriesToday(entries);
      const entriesLeft = dailyLimit - numEntriesToday;
      this.logger.log(
        `Entries left for competitor: ${competitorId}: ${entriesLeft}`,
      );

      return {
        entriesLeft: entriesLeft,
        //start of tomorrow
        timeToRefresh:
          new Date(new Date().setHours(24, 0, 0, 0)).getTime() -
          new Date().getTime(),
        refreshNum: competitor.competition.dailyLimit,
      };
    } catch (error) {
      this.logger.error(
        `Error retrieving entries left for competitor: ${competitorId}`,
        error.message,
      );
      throw new Error(`Failed to retrieve entries left: ${error.message}`);
    }
  }

  // /**
  //  * Get the leaderboard for the competition
  //  */
  // async getLeaderboard(competitionId: string): Promise<Array<Record<string, any>>> {
  //   try {
  //     this.logger.log(`Retrieving leaderboard for competition: ${competitionId}`);
  //     const competitors = await this.database.getLeaderboard(competitionId);
  //     this.logger.log(`Leaderboard retrieved for competition: ${competitionId}`);
  //     return competitors;
  //   } catch (error) {
  //     this.logger.error(`Error retrieving leaderboard for competition: ${competitionId}`, error.message);
  //     throw new Error(`Failed to retrieve leaderboard: ${error.message}`);
  //   }
  // }
}
