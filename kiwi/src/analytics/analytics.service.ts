import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InteractionService } from 'src/interaction/interaction.service';
import { UserInteractionService as DatabaseInteractionService } from 'src/common/database/user-interaction.service';
import { v4 as uuidv4 } from 'uuid';
import { Prisma, UserInteraction } from '@prisma/client';
import { unlink, writeFileSync } from 'fs';
import { group } from 'console';
import { DatabaseService } from 'src/common/database/database.service';
import {
  PricingTable,
  computeCost,
  loadPricingTable,
  resolveEngineModel,
  roundUsd,
} from 'src/common/llm/pricing';
import {
  ConversationLlmUsage,
  LlmUsageAggregate,
  UserLlmUsage,
} from './dto/analytics-response.dto';

/** Filters accepted by the agent-loop usage/cost aggregates. */
export interface LlmUsageQuery {
  startDate?: string;
  endDate?: string;
  classId?: string;
  userId?: string;
  limit?: number;
}

/**
 * One SQL group: usage summed for a single (grouping key, engine, model) tuple.
 * Grouping by model as well as by user/conversation is what lets a mixed-engine
 * user be priced correctly instead of at one blended rate.
 */
interface UsageGroupRow {
  userId: string;
  conversationId?: string;
  engineChoice: string | null;
  model: string | null;
  turns: number;
  promptTokens: number;
  cachedTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  firstTurnAt?: Date;
  lastTurnAt?: Date;
}

const DEFAULT_USAGE_LIMIT = 20;
const MAX_USAGE_LIMIT = 200;

/**
 * Phase B writes per-turn usage into this ServerAction's JSON context; it is the
 * only place cached/reasoning token counts are recorded.
 */
const AGENT_COMPLETE_TYPE = 'agent-loop-complete';

/**
 * Sums one numeric field out of the `agent-loop-complete` JSON context. The
 * `jsonb_typeof` guard keeps a legacy or hand-edited row that stored a string
 * from aborting the whole aggregate on a failed cast. Keys are compile-time
 * constants, never user input.
 */
function jsonNumberSum(key: string, alias: string): string {
  return `SUM(CASE WHEN jsonb_typeof(sa.context->'${key}') = 'number' THEN (sa.context->>'${key}')::float8 ELSE 0 END) AS "${alias}"`;
}

const USAGE_SUMS = [
  jsonNumberSum('promptTokens', 'promptTokens'),
  jsonNumberSum('cachedTokens', 'cachedTokens'),
  jsonNumberSum('completionTokens', 'completionTokens'),
  jsonNumberSum('reasoningTokens', 'reasoningTokens'),
  jsonNumberSum('totalTokensUsed', 'totalTokens'),
].join(',\n        ');

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  constructor(
    private interactionService: InteractionService,
    private databaseInteractionService: DatabaseInteractionService,
    private database: DatabaseService,
    private configService: ConfigService,
  ) { }

  writeInteractionsToFile(interactions: UserInteraction[]) {
    const fileId = uuidv4();
    const responseFilePath = `/tmp/interactions-${fileId}.json`;
    const responseFileContent = JSON.stringify(interactions, null, 2);

    this.logger.log('Writing interactions to file');

    writeFileSync(responseFilePath, responseFileContent);

    // delete the file after 100 seconds
    setTimeout(() => {
      unlink(responseFilePath, (err) => {
        if (err) {
          this.logger.error(`Error deleting file: ${err}`);
        } else {
          this.logger.log(`File ${responseFilePath} deleted successfully.`);
        }
      });
    }, 100000);

    return responseFilePath;
  }

  async presentAllInteractions() {
    // Here I will get all the interactions
    const allInteractions = await this.interactionService.getAllInteractions();
    const responseFileName = this.writeInteractionsToFile(allInteractions);

    return { interactionsFileName: responseFileName };
  }

  async presentUserInteractions(userId: string) {
    // Here I will get the interaction
    const interactions =
      await this.interactionService.getInteractionsByUser(userId);
    const count = interactions.length;
    return { interactions: interactions, count: count };
  }

  async presentSessionInteractions(sessionId: string) {
    // Here I will get the interaction
    const interactions =
      await this.interactionService.getInteractionsBySession(sessionId);
    const count = interactions.length;
    return { interactions: interactions, count: count };
  }

  async presentDateFilteredInteractions(
    StartDate: string,
    EndDate: string,
    classId?: string,
    allowedClassIds?: string[] | null,
  ) {
    // Here I will get the interaction

    const start = new Date(StartDate);
    const end = new Date(EndDate);

    if (
      start.toString() === 'Invalid Date' ||
      end.toString() === 'Invalid Date'
    ) {
      throw new BadRequestException('Invalid date format');
    }

    this.logger.log('The time period is', start, end);
    if (classId) {
      this.logger.log('Filtering by classId:', classId);
    }

    const whereCondition: any = {
      timestamp: {
        gte: start,
        lte: end,
      },
    };

    if (Array.isArray(allowedClassIds)) {
      if (classId) {
        if (!allowedClassIds.includes(classId)) {
          throw new ForbiddenException(
            'You do not have access to analytics for this class',
          );
        }
        whereCondition.classId = classId;
      } else {
        whereCondition.classId = { in: allowedClassIds };
      }
    } else if (classId) {
      whereCondition.classId = classId;
    }

    // Include serverActions so engineChoice can be analyzed downstream
    const interactions = await this.databaseInteractionService.findMany({
      where: whereCondition,
      include: { serverActions: true },
      orderBy: { timestamp: 'asc' },
    });

    this.logger.log(`Found ${interactions.length} interactions${classId ? ' for classId: ' + classId : ''}`);
    const responseFileName = this.writeInteractionsToFile(interactions as unknown as UserInteraction[]);

    return { interactionsFileName: responseFileName };
  }

  // ----- tokens usage analytics -----
  async topTokenUsers(limit: number = 10) {
    // 先检查总的session数量和token使用情况
    const totalStats = await this.database.userSession.aggregate({
      _count: { id: true },
      _sum: { tokensUsed: true },
      _max: { tokensUsed: true },
      _min: { tokensUsed: true },
    });

    this.logger.log(`Total session stats: ${JSON.stringify(totalStats)}`);

    // group sessions by userId and sum tokensUsed
    const grouped = await this.database.userSession.groupBy({
      by: ['userId'],
      _sum: {
        tokensUsed: true,
      },
      _count: {
        id: true, // 每个用户的session数量
      },
      orderBy: {
        _sum: {
          tokensUsed: 'desc',
        },
      },
      take: limit,
    });

    this.logger.log(`Top token users query result: ${JSON.stringify(grouped)}`);

    // 补充邮箱信息
    const userIds = grouped.map((g: any) => g.userId);
    const users = await this.database.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    });
    const idToEmail: Record<string, string> = {};
    users.forEach((u: any) => { idToEmail[u.id] = u.email; });

    return grouped.map((g: any) => ({
      userId: g.userId,
      email: idToEmail[g.userId] || '',
      tokensUsed: g._sum.tokensUsed || 0,
      sessionCount: g._count.id // 添加session数量信息
    }));
  }

  async userTokenUsageDetails(userId: string) {
    // list sessions for a user with tokensUsed > 0, latest first
    const sessions = await this.database.userSession.findMany({
      where: { userId },
      orderBy: { sessionStartTime: 'desc' },
      select: {
        id: true,
        sessionStartTime: true,
        sessionEndTime: true,
        tokensUsed: true,
      },
    });

    // group interactions by sessionId and type for this user, only LLM-related interactions
    const groupedInteractions = await this.database.userInteraction.groupBy({
      by: ['sessionId', 'type'],
      where: {
        userId,
        type: {
          startsWith: 'frontend-interaction-chat',
        },
      },
      _count: { _all: true },
    });

    const sessionIdToTypeCount: Record<string, Record<string, number>> = {};
    groupedInteractions.forEach((g: any) => {
      const sid = g.sessionId as string;
      const type = g.type as string;
      const count = g._count._all as number;
      if (!sessionIdToTypeCount[sid]) sessionIdToTypeCount[sid] = {};
      sessionIdToTypeCount[sid][type] = count;
    });

    return sessions.map((s: any) => ({
      ...s,
      actionSummary: sessionIdToTypeCount[s.id] || {},
    }));
  }

  // ----- agent-loop usage & cost analytics (#130, #103) -----

  /**
   * Per-user usage and cost over `agent-loop-complete` turns.
   *
   * `UserSession.tokensUsed` (see `topTokenUsers`) is one undifferentiated
   * counter; these rows split cached from fresh input, which is the only way
   * the cost means anything when prompts cache at ~88%.
   */
  async llmUsageByUser(query: LlmUsageQuery = {}): Promise<UserLlmUsage[]> {
    const limit = this.resolveUsageLimit(query.limit);
    const where = this.usageWhere(query);

    // Ranked and limited in SQL: only the top N users' pre-aggregated rows ever
    // reach Node, never the underlying turns.
    const rows = await this.database.$queryRaw<UsageGroupRow[]>(Prisma.sql`
      WITH grouped AS (
        SELECT
          ui."userId" AS "userId",
          COALESCE(sa.context->>'engineChoice', sa."engineChoice") AS "engineChoice",
          sa.context->>'model' AS "model",
          COUNT(*)::int AS "turns",
          ${Prisma.raw(USAGE_SUMS)}
        FROM "ServerAction" sa
        JOIN "UserInteraction" ui ON ui.id = sa."interactionId"
        WHERE ${where}
        GROUP BY 1, 2, 3
      ),
      ranked AS (
        SELECT
          g.*,
          SUM(g."promptTokens" + g."completionTokens") OVER (PARTITION BY g."userId") AS "groupTotal"
        FROM grouped g
      ),
      top AS (
        SELECT r.*, DENSE_RANK() OVER (ORDER BY r."groupTotal" DESC, r."userId") AS rk
        FROM ranked r
      )
      SELECT
        "userId", "engineChoice", "model", "turns", "promptTokens", "cachedTokens",
        "completionTokens", "reasoningTokens", "totalTokens", "groupTotal"
      FROM top
      WHERE rk <= ${limit}
      ORDER BY "groupTotal" DESC, "userId"
    `);

    const pricing = this.pricingTable();
    const byUser = new Map<string, UsageGroupRow[]>();
    for (const row of rows) {
      const bucket = byUser.get(row.userId);
      if (bucket) bucket.push(row);
      else byUser.set(row.userId, [row]);
    }

    const users = await this.database.user.findMany({
      where: { id: { in: [...byUser.keys()] } },
      select: { id: true, email: true },
    });
    const idToEmail = new Map(users.map((u) => [u.id, u.email]));

    return [...byUser.entries()].map(([userId, group]) => ({
      userId,
      email: idToEmail.get(userId) ?? '',
      ...this.foldUsage(group, pricing),
    }));
  }

  /**
   * Per-conversation usage and cost. Conversations are keyed by
   * `UserInteraction.stringTag` falling back to the interaction id — the same
   * convention `StudentService.getChatHistory` uses, because `stringTag` is
   * empty on chats whose client never sent a `conversationId`.
   */
  async llmUsageByConversation(
    query: LlmUsageQuery = {},
  ): Promise<ConversationLlmUsage[]> {
    const limit = this.resolveUsageLimit(query.limit);
    const where = this.usageWhere(query);

    const rows = await this.database.$queryRaw<UsageGroupRow[]>(Prisma.sql`
      WITH grouped AS (
        SELECT
          COALESCE(NULLIF(ui."stringTag", ''), ui.id) AS "conversationId",
          ui."userId" AS "userId",
          COALESCE(sa.context->>'engineChoice', sa."engineChoice") AS "engineChoice",
          sa.context->>'model' AS "model",
          COUNT(*)::int AS "turns",
          MIN(sa."timestamp") AS "firstTurnAt",
          MAX(sa."timestamp") AS "lastTurnAt",
          ${Prisma.raw(USAGE_SUMS)}
        FROM "ServerAction" sa
        JOIN "UserInteraction" ui ON ui.id = sa."interactionId"
        WHERE ${where}
        GROUP BY 1, 2, 3, 4
      ),
      ranked AS (
        SELECT
          g.*,
          SUM(g."promptTokens" + g."completionTokens") OVER (PARTITION BY g."conversationId") AS "groupTotal"
        FROM grouped g
      ),
      top AS (
        SELECT r.*, DENSE_RANK() OVER (ORDER BY r."groupTotal" DESC, r."conversationId") AS rk
        FROM ranked r
      )
      SELECT
        "conversationId", "userId", "engineChoice", "model", "turns", "firstTurnAt",
        "lastTurnAt", "promptTokens", "cachedTokens", "completionTokens",
        "reasoningTokens", "totalTokens", "groupTotal"
      FROM top
      WHERE rk <= ${limit}
      ORDER BY "groupTotal" DESC, "conversationId"
    `);

    const pricing = this.pricingTable();
    const byConversation = new Map<string, UsageGroupRow[]>();
    for (const row of rows) {
      const key = row.conversationId as string;
      const bucket = byConversation.get(key);
      if (bucket) bucket.push(row);
      else byConversation.set(key, [row]);
    }

    return [...byConversation.entries()].map(([conversationId, group]) => ({
      conversationId,
      userId: group[0].userId,
      firstTurnAt: group.reduce(
        (min, r) => (r.firstTurnAt! < min ? r.firstTurnAt! : min),
        group[0].firstTurnAt!,
      ),
      lastTurnAt: group.reduce(
        (max, r) => (r.lastTurnAt! > max ? r.lastTurnAt! : max),
        group[0].lastTurnAt!,
      ),
      ...this.foldUsage(group, pricing),
    }));
  }

  /** Totals row for a page of per-user or per-conversation aggregates. */
  totalsFor(aggregates: LlmUsageAggregate[]): LlmUsageAggregate {
    const totals: LlmUsageAggregate = {
      turns: 0,
      promptTokens: 0,
      cachedTokens: 0,
      freshInputTokens: 0,
      completionTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0,
      cacheHitRate: 0,
      models: [],
      cost: {
        inputUsd: null,
        cachedInputUsd: null,
        outputUsd: null,
        totalUsd: null,
        complete: true,
        unpricedModels: [],
      },
    };

    const models = new Set<string>();
    const unpriced = new Set<string>();
    let priced = false;
    let inputUsd = 0;
    let cachedInputUsd = 0;
    let outputUsd = 0;

    for (const a of aggregates) {
      totals.turns += a.turns;
      totals.promptTokens += a.promptTokens;
      totals.cachedTokens += a.cachedTokens;
      totals.freshInputTokens += a.freshInputTokens;
      totals.completionTokens += a.completionTokens;
      totals.reasoningTokens += a.reasoningTokens;
      totals.totalTokens += a.totalTokens;
      a.models.forEach((m) => models.add(m));
      a.cost.unpricedModels.forEach((m) => unpriced.add(m));
      if (!a.cost.complete) totals.cost.complete = false;
      if (a.cost.totalUsd !== null) {
        priced = true;
        inputUsd += a.cost.inputUsd ?? 0;
        cachedInputUsd += a.cost.cachedInputUsd ?? 0;
        outputUsd += a.cost.outputUsd ?? 0;
      }
    }

    totals.cacheHitRate = this.hitRate(totals.cachedTokens, totals.promptTokens);
    totals.models = [...models].sort();
    totals.cost.unpricedModels = [...unpriced].sort();
    if (priced) {
      totals.cost.inputUsd = roundUsd(inputUsd);
      totals.cost.cachedInputUsd = roundUsd(cachedInputUsd);
      totals.cost.outputUsd = roundUsd(outputUsd);
      totals.cost.totalUsd = roundUsd(inputUsd + cachedInputUsd + outputUsd);
    }
    return totals;
  }

  /**
   * Collapses one entity's per-model rows into a single aggregate, pricing each
   * model separately. Cache hit rate is recomputed from the token sums rather
   * than averaged over the per-turn `cacheHitRate` values, so a long turn counts
   * for more than a short one.
   */
  private foldUsage(
    rows: UsageGroupRow[],
    pricing: PricingTable,
  ): LlmUsageAggregate {
    const aggregate: LlmUsageAggregate = {
      turns: 0,
      promptTokens: 0,
      cachedTokens: 0,
      freshInputTokens: 0,
      completionTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0,
      cacheHitRate: 0,
      models: [],
      cost: {
        inputUsd: null,
        cachedInputUsd: null,
        outputUsd: null,
        totalUsd: null,
        complete: true,
        unpricedModels: [],
      },
    };

    const models = new Set<string>();
    const unpriced = new Set<string>();
    let priced = false;
    let inputUsd = 0;
    let cachedInputUsd = 0;
    let outputUsd = 0;

    for (const row of rows) {
      const model = row.model ?? this.modelForEngine(row.engineChoice);
      const cost = computeCost(
        {
          promptTokens: row.promptTokens,
          cachedTokens: row.cachedTokens,
          completionTokens: row.completionTokens,
        },
        model,
        pricing,
      );

      aggregate.turns += row.turns;
      aggregate.promptTokens += row.promptTokens;
      aggregate.cachedTokens += cost.cachedInputTokens;
      aggregate.freshInputTokens += cost.freshInputTokens;
      aggregate.completionTokens += row.completionTokens;
      aggregate.reasoningTokens += row.reasoningTokens;
      // Pre-Phase-B rows have no totalTokensUsed; derive it so they still count.
      aggregate.totalTokens +=
        row.totalTokens || row.promptTokens + row.completionTokens;

      models.add(cost.model);
      if (cost.priced) {
        priced = true;
        inputUsd += cost.inputUsd ?? 0;
        cachedInputUsd += cost.cachedInputUsd ?? 0;
        outputUsd += cost.outputUsd ?? 0;
      } else {
        unpriced.add(cost.model);
        aggregate.cost.complete = false;
      }
    }

    aggregate.cacheHitRate = this.hitRate(
      aggregate.cachedTokens,
      aggregate.promptTokens,
    );
    aggregate.models = [...models].sort();
    aggregate.cost.unpricedModels = [...unpriced].sort();
    if (priced) {
      aggregate.cost.inputUsd = roundUsd(inputUsd);
      aggregate.cost.cachedInputUsd = roundUsd(cachedInputUsd);
      aggregate.cost.outputUsd = roundUsd(outputUsd);
      aggregate.cost.totalUsd = roundUsd(inputUsd + cachedInputUsd + outputUsd);
    }
    return aggregate;
  }

  /**
   * `agent-loop-complete` records the engine choice, not the model id, so the
   * model has to come back from the same config `LlmService` reads. Rows
   * predating a model switch are therefore attributed to today's configured
   * model; once the loop persists `model` in its context, that field wins.
   */
  private modelForEngine(engineChoice: string | null): string | null {
    return resolveEngineModel(engineChoice, (key) =>
      this.configService.get<string>(key),
    );
  }

  private pricingTable(): PricingTable {
    return loadPricingTable((key) => this.configService.get<string>(key));
  }

  private hitRate(cached: number, prompt: number): number {
    return prompt > 0 ? Math.round((cached / prompt) * 1e4) / 1e4 : 0;
  }

  private resolveUsageLimit(limit?: number): number {
    if (!limit || !Number.isFinite(limit) || limit < 1) return DEFAULT_USAGE_LIMIT;
    return Math.min(Math.floor(limit), MAX_USAGE_LIMIT);
  }

  private usageWhere(query: LlmUsageQuery): Prisma.Sql {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`sa."type" = ${AGENT_COMPLETE_TYPE}`,
    ];

    const start = this.parseUsageDate(query.startDate, 'startDate');
    if (start) conditions.push(Prisma.sql`sa."timestamp" >= ${start}`);

    const end = this.parseUsageDate(query.endDate, 'endDate');
    if (end) conditions.push(Prisma.sql`sa."timestamp" <= ${end}`);

    if (query.classId) {
      conditions.push(Prisma.sql`ui."classId" = ${query.classId}`);
    }
    if (query.userId) {
      conditions.push(Prisma.sql`ui."userId" = ${query.userId}`);
    }

    return Prisma.join(conditions, ' AND ');
  }

  private parseUsageDate(value: string | undefined, field: string): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    if (parsed.toString() === 'Invalid Date') {
      throw new BadRequestException(`Invalid ${field} format`);
    }
    return parsed;
  }
}
