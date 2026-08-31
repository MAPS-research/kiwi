import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ChatCompletionMessageParam } from 'openai/resources';
import { DatabaseService } from 'src/common/database/database.service';
import { LlmService } from 'src/common/llm/llm.service';

// Chat interaction types that carry a student question in context.content.prompt
const CHAT_TYPES = [
  'frontend-interaction-chat',
  'frontend-interaction-chat-exercise',
];

// Topic extraction tuning. Batch size must leave the response (one assignment
// object per question, ~25 tokens each) comfortably inside max_tokens, or the
// JSON gets truncated and the whole run fails to parse.
const MAX_QUESTIONS_PER_LLM_CALL = 100;
const LLM_MAX_OUTPUT_TOKENS = 5000;
const MAX_QUESTIONS_PER_RUN = 600;
const QUESTION_TRUNCATE_CHARS = 300;
const STALE_NEW_QUESTION_THRESHOLD = 5;
const STALE_AGE_MS = 6 * 60 * 60 * 1000; // with >=1 new question, refresh after 6h
const PROCESSING_TIMEOUT_MS = 10 * 60 * 1000; // treat stuck 'processing' as crashed

// Messages with no academic content are filtered before reaching the LLM
const CHITCHAT_PATTERN =
  /^(hi|hello|hey|yo|sup|thanks?|thank you|thx|ok(ay)?|yes|no|nice|cool|good|great|test(ing)?|你好|哈喽|谢谢|好的)[\s!.?,~]*$/i;

export interface StoredTopic {
  id: string;
  label: string;
  questionIds: string[];
}

export interface StoredIntent {
  id: string;
  questionIds: string[];
}

// Fixed intent taxonomy. Ids are what the LLM must return; labels are what
// instructors see. Order defines display order.
const INTENT_DEFINITIONS: { id: string; label: string; description: string }[] =
  [
    {
      id: 'concept',
      label: 'Concept clarification',
      description:
        'wants to understand a concept, definition, or the why/how of course material',
    },
    {
      id: 'answer-seeking',
      label: 'Answer seeking',
      description:
        'wants the direct answer or solution to an exercise/worksheet/exam question',
    },
    {
      id: 'guidance',
      label: 'Guided practice',
      description:
        'wants step-by-step guidance, hints, or to be walked through a problem without the final answer',
    },
    {
      id: 'debugging',
      label: 'Debugging help',
      description:
        'wants help fixing code, an error message, or an unexpected result',
    },
    {
      id: 'logistics',
      label: 'Course logistics',
      description:
        'asks about deadlines, grading, files, tools, or other course administration',
    },
    {
      id: 'exploration',
      label: 'Exploration',
      description:
        'curiosity that goes beyond the course material or connects it to other fields',
    },
    {
      id: 'other',
      label: 'Other',
      description:
        'none of the above fits, including greetings and test messages',
    },
  ];

const INTENT_LABEL_BY_ID = new Map(
  INTENT_DEFINITIONS.map((i) => [i.id, i.label]),
);

interface StudentKeyEntry {
  key: string; // stable anonymous key, e.g. "s3"
  label: string; // display label, e.g. "Student 3"
}

@Injectable()
export class ClassAnalyticsService {
  private readonly logger = new Logger(ClassAnalyticsService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly llmService: LlmService,
  ) {}

  // ---------------------------------------------------------------------------
  // Student anonymization
  // ---------------------------------------------------------------------------

  /**
   * Deterministic per-class anonymization: students are numbered by the
   * timestamp of their first chat question, so keys are stable across requests
   * and real user IDs never leave the backend.
   */
  private async getStudentKeyMap(
    classId: string,
  ): Promise<Map<string, StudentKeyEntry>> {
    const grouped = await this.database.userInteraction.groupBy({
      by: ['userId'],
      where: { classId, type: { in: CHAT_TYPES } },
      _min: { timestamp: true },
    });

    grouped.sort((a, b) => {
      const ta = a._min.timestamp?.getTime() ?? 0;
      const tb = b._min.timestamp?.getTime() ?? 0;
      if (ta !== tb) return ta - tb;
      return a.userId.localeCompare(b.userId);
    });

    const map = new Map<string, StudentKeyEntry>();
    grouped.forEach((g, i) => {
      map.set(g.userId, { key: `s${i + 1}`, label: `Student ${i + 1}` });
    });
    return map;
  }

  private resolveStudentKey(
    map: Map<string, StudentKeyEntry>,
    studentKey: string,
  ): string | null {
    for (const [userId, entry] of map.entries()) {
      if (entry.key === studentKey) return userId;
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Overview
  // ---------------------------------------------------------------------------

  async getOverview(classId: string) {
    const where = { classId, type: { in: CHAT_TYPES } };

    const [totalQuestions, students, perLecture, documents, weeklyRows] =
      await Promise.all([
        this.database.userInteraction.count({ where }),
        this.database.userInteraction.groupBy({ by: ['userId'], where }),
        this.database.userInteraction.groupBy({
          by: ['pdfId'],
          where,
          _count: { _all: true },
          _max: { timestamp: true },
        }),
        this.database.document.findMany({
          where: { classMaterial: { classId } },
          orderBy: { uploadedDate: 'asc' },
          select: {
            id: true,
            fileName: true,
            sortIndex: true,
            isStudent: true,
            classMaterialId: true,
            classMaterial: { select: { materialType: true } },
          },
        }),
        // Weekly volume aggregated in SQL — never ships N timestamps to Node
        this.database.$queryRaw<{ week: Date; count: number }[]>`
          SELECT date_trunc('week', "timestamp") AS week, COUNT(*)::int AS count
          FROM "UserInteraction"
          WHERE "classId" = ${classId} AND "type" = ANY(${CHAT_TYPES})
          GROUP BY 1
          ORDER BY 1
        `,
      ]);

    // Distinct students per lecture in one grouped query
    const perLectureStudents = await this.database.userInteraction.groupBy({
      by: ['pdfId', 'userId'],
      where,
    });
    const studentsByPdf = new Map<string, number>();
    for (const row of perLectureStudents) {
      if (!row.pdfId) continue;
      studentsByPdf.set(row.pdfId, (studentsByPdf.get(row.pdfId) ?? 0) + 1);
    }

    const statsByPdf = new Map(
      perLecture.filter((p) => p.pdfId).map((p) => [p.pdfId as string, p]),
    );

    // A material can have several document variants (student copy, LLM copy).
    // Mirror the class page: list the student-facing variant per material —
    // plus any other variant that actually has questions, so no data hides.
    const chosenByMaterial = new Map<string, (typeof documents)[number]>();
    for (const doc of documents) {
      const key = doc.classMaterialId ?? doc.id;
      const current = chosenByMaterial.get(key);
      if (!current || (doc.isStudent && !current.isStudent)) {
        chosenByMaterial.set(key, doc);
      }
    }
    const chosenIds = new Set(
      [...chosenByMaterial.values()].map((d) => d.id),
    );
    const visibleDocuments = documents.filter(
      (doc) =>
        chosenIds.has(doc.id) || (statsByPdf.get(doc.id)?._count._all ?? 0) > 0,
    );

    const lectures = visibleDocuments
      .map((doc) => {
        const stats = statsByPdf.get(doc.id);
        return {
          pdfId: doc.id,
          fileName: doc.fileName,
          materialType: doc.classMaterial?.materialType ?? null,
          sortIndex: doc.sortIndex,
          questionCount: stats?._count._all ?? 0,
          studentCount: studentsByPdf.get(doc.id) ?? 0,
          lastActivity: stats?._max.timestamp?.toISOString() ?? null,
        };
      })
      .sort((a, b) => b.questionCount - a.questionCount);

    const weeklyActivity = weeklyRows.map((row) => ({
      weekStart: row.week.toISOString(),
      questionCount: row.count,
    }));

    return {
      classId,
      totalQuestions,
      activeStudents: students.length,
      lectureCount: visibleDocuments.length,
      lectures,
      weeklyActivity,
    };
  }

  // ---------------------------------------------------------------------------
  // Chat browser
  // ---------------------------------------------------------------------------

  async getChatGroups(
    classId: string,
    by: 'student' | 'page',
    lectureId?: string,
  ) {
    const where: Prisma.UserInteractionWhereInput = {
      classId,
      type: { in: CHAT_TYPES },
      ...(lectureId ? { pdfId: lectureId } : {}),
    };

    if (by === 'student') {
      const [grouped, keyMap] = await Promise.all([
        this.database.userInteraction.groupBy({
          by: ['userId'],
          where,
          _count: { _all: true },
          _max: { timestamp: true },
        }),
        this.getStudentKeyMap(classId),
      ]);

      const groups = grouped
        .map((g) => {
          const entry = keyMap.get(g.userId);
          return {
            key: entry?.key ?? 'unknown',
            label: entry?.label ?? 'Unknown Student',
            questionCount: g._count._all,
            lastActivity: g._max.timestamp?.toISOString() ?? null,
          };
        })
        .sort((a, b) => b.questionCount - a.questionCount);

      return { by, groups };
    }

    // by === 'page'
    const grouped = await this.database.userInteraction.groupBy({
      by: ['pdfId', 'pdfPage'],
      where,
      _count: { _all: true },
      _max: { timestamp: true },
    });

    const pdfIds = [
      ...new Set(grouped.map((g) => g.pdfId).filter((id): id is string => !!id)),
    ];
    const docs = await this.database.document.findMany({
      where: { id: { in: pdfIds } },
      select: { id: true, fileName: true },
    });
    const nameByPdf = new Map(docs.map((d) => [d.id, d.fileName]));

    const groups = grouped
      .filter((g) => g.pdfId)
      .map((g) => ({
        key: `${g.pdfId}:${g.pdfPage ?? 0}`,
        pdfId: g.pdfId as string,
        fileName: nameByPdf.get(g.pdfId as string) ?? g.pdfId,
        pdfPage: g.pdfPage ?? null,
        questionCount: g._count._all,
        lastActivity: g._max.timestamp?.toISOString() ?? null,
      }))
      .sort((a, b) => {
        if (a.fileName !== b.fileName)
          return String(a.fileName).localeCompare(String(b.fileName));
        return (a.pdfPage ?? 0) - (b.pdfPage ?? 0);
      });

    return { by, groups };
  }

  async getChats(
    classId: string,
    options: {
      lectureId?: string;
      studentKey?: string;
      pdfPage?: number;
      offset?: number;
      limit?: number;
      order?: 'asc' | 'desc';
    },
  ) {
    const keyMap = await this.getStudentKeyMap(classId);

    const where: Prisma.UserInteractionWhereInput = {
      classId,
      type: { in: CHAT_TYPES },
    };
    if (options.lectureId) where.pdfId = options.lectureId;
    if (options.pdfPage !== undefined) where.pdfPage = options.pdfPage;
    if (options.studentKey) {
      const userId = this.resolveStudentKey(keyMap, options.studentKey);
      if (!userId) return { total: 0, offset: 0, limit: 0, chats: [] };
      where.userId = userId;
    }

    const limit = Math.min(options.limit ?? 50, 200);
    const offset = options.offset ?? 0;

    const [total, interactions] = await Promise.all([
      this.database.userInteraction.count({ where }),
      this.database.userInteraction.findMany({
        where,
        orderBy: { timestamp: options.order ?? 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          userId: true,
          pdfId: true,
          pdfPage: true,
          timestamp: true,
          context: true,
          // "Has an answer" must mean an actual reply, not merely "some
          // ServerAction exists". v2 turns also write bookkeeping rows with an
          // empty botResponse (context snapshots, agent-loop-complete records),
          // so counting rows marks every chat as answered — including ones that
          // errored before saying anything — and the expand then shows nothing.
          // Mirrors the truthiness filter getChatAnswer already applies.
          serverActions: {
            where: { botResponse: { not: '' } },
            select: { id: true },
            take: 1,
          },
        },
      }),
    ]);

    const chats = interactions.map((i) => {
      const context = i.context as any;
      const question =
        typeof context?.content?.prompt === 'string'
          ? context.content.prompt
          : '';
      return {
        id: i.id,
        student: keyMap.get(i.userId)?.label ?? 'Unknown Student',
        studentKey: keyMap.get(i.userId)?.key ?? 'unknown',
        question,
        pdfId: i.pdfId,
        pdfPage: i.pdfPage,
        timestamp: i.timestamp.toISOString(),
        hasAnswer: i.serverActions.length > 0,
      };
    });

    return { total, offset, limit, chats };
  }

  /** AI answers are fetched lazily, one interaction at a time, on expand. */
  async getChatAnswer(classId: string, interactionId: string) {
    const interaction = await this.database.userInteraction.findUnique({
      where: { id: interactionId },
      select: {
        classId: true,
        serverActions: {
          select: { botResponse: true, engineChoice: true, timestamp: true },
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!interaction || interaction.classId !== classId) {
      throw new NotFoundException('Chat not found in this class');
    }

    return {
      answers: interaction.serverActions
        .filter((a) => a.botResponse)
        .map((a) => ({
          content: a.botResponse,
          engine: a.engineChoice ?? null,
          timestamp: a.timestamp.toISOString(),
        })),
    };
  }

  // ---------------------------------------------------------------------------
  // Topics (class-level, incremental LLM extraction)
  // ---------------------------------------------------------------------------

  async getTopics(classId: string, lectureId?: string) {
    let record = await this.database.classAnalyticsTopics.findUnique({
      where: { classId },
    });

    const staleInfo = await this.checkStaleness(classId, record);
    if (staleInfo.shouldRefresh) {
      record = await this.kickRefresh(classId, staleInfo.fullRegen);
    }

    const stored = this.parseStored(record?.topics);
    const storedTopics = stored.topics.filter(
      (t) => t && Array.isArray(t.questionIds),
    );
    const storedIntents = stored.intents.filter(
      (i) => i && Array.isArray(i.questionIds),
    );

    // Hydrate minimal question metadata so counts follow the current
    // lecture/student filters instead of being frozen at generation time.
    const allIds = [
      ...new Set([
        ...storedTopics.flatMap((t) => t.questionIds),
        ...storedIntents.flatMap((i) => i.questionIds),
      ]),
    ];
    const meta = allIds.length
      ? await this.database.userInteraction.findMany({
          where: { id: { in: allIds } },
          select: { id: true, userId: true, pdfId: true, pdfPage: true },
        })
      : [];
    const metaById = new Map(meta.map((m) => [m.id, m]));

    const topics = storedTopics
      .map((t) => {
        let questionIds = t.questionIds.filter((id) => metaById.has(id));
        if (lectureId) {
          questionIds = questionIds.filter(
            (id) => metaById.get(id)?.pdfId === lectureId,
          );
        }
        const students = new Set(
          questionIds.map((id) => metaById.get(id)?.userId),
        );
        const pageCounts = new Map<string, number>();
        for (const id of questionIds) {
          const m = metaById.get(id);
          if (m?.pdfId && m.pdfPage != null) {
            const key = `${m.pdfId}:${m.pdfPage}`;
            pageCounts.set(key, (pageCounts.get(key) ?? 0) + 1);
          }
        }
        const topPages = [...pageCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([key, count]) => {
            const [pdfId, page] = key.split(':');
            return { pdfId, pdfPage: Number(page), count };
          });

        return {
          id: t.id,
          label: t.label,
          questionCount: questionIds.length,
          studentCount: students.size,
          topPages,
        };
      })
      .filter((t) => t.questionCount > 0)
      .sort((a, b) => b.questionCount - a.questionCount);

    // Intent analysis: what students are trying to do, and the key topics
    // inside each intent. Same hydrated metadata, same lecture filter.
    const filterIds = (ids: string[]) => {
      let out = ids.filter((id) => metaById.has(id));
      if (lectureId) {
        out = out.filter((id) => metaById.get(id)?.pdfId === lectureId);
      }
      return out;
    };

    const topicIdSets = storedTopics.map((t) => ({
      id: t.id,
      label: t.label,
      ids: new Set(filterIds(t.questionIds)),
    }));

    const intents = INTENT_DEFINITIONS.map((def) => {
      const storedIntent = storedIntents.find((i) => i.id === def.id);
      const questionIds = filterIds(storedIntent?.questionIds ?? []);
      const students = new Set(
        questionIds.map((id) => metaById.get(id)?.userId),
      );
      const topTopics = topicIdSets
        .map((t) => ({
          id: t.id,
          label: t.label,
          count: questionIds.filter((id) => t.ids.has(id)).length,
        }))
        .filter((t) => t.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
      return {
        id: def.id,
        label: def.label,
        questionCount: questionIds.length,
        studentCount: students.size,
        topTopics,
      };
    }).filter((i) => i.questionCount > 0);

    return {
      status: record?.status ?? 'pending',
      generating:
        record?.status === 'processing' || record?.status === 'pending',
      updatedAt: record?.updatedAt?.toISOString() ?? null,
      questionCount: record?.questionCount ?? 0,
      pendingNewQuestions: staleInfo.newCount,
      error: record?.status === 'failed' ? record?.error ?? null : null,
      topics,
      intents,
    };
  }

  async getTopicQuestions(
    classId: string,
    topicId: string,
    lectureId?: string,
    limit = 100,
  ) {
    const record = await this.database.classAnalyticsTopics.findUnique({
      where: { classId },
    });
    if (!record) throw new NotFoundException('No topics for this class');

    const topic = this.parseStored(record.topics).topics.find(
      (t) => t.id === topicId,
    );
    if (!topic) throw new NotFoundException('Topic not found');

    return {
      topicId: topic.id,
      label: topic.label,
      totalQuestions: topic.questionIds.length,
      questions: await this.hydrateQuestionList(
        classId,
        topic.questionIds,
        lectureId,
        limit,
      ),
    };
  }

  async getIntentQuestions(
    classId: string,
    intentId: string,
    lectureId?: string,
    limit = 100,
  ) {
    const record = await this.database.classAnalyticsTopics.findUnique({
      where: { classId },
    });
    if (!record) throw new NotFoundException('No analysis for this class');

    const label = INTENT_LABEL_BY_ID.get(intentId);
    if (!label) throw new NotFoundException('Intent not found');

    const intent = this.parseStored(record.topics).intents.find(
      (i) => i.id === intentId,
    );

    return {
      intentId,
      label,
      totalQuestions: intent?.questionIds.length ?? 0,
      questions: await this.hydrateQuestionList(
        classId,
        intent?.questionIds ?? [],
        lectureId,
        limit,
      ),
    };
  }

  private async hydrateQuestionList(
    classId: string,
    questionIds: string[],
    lectureId?: string,
    limit = 100,
  ) {
    if (questionIds.length === 0) return [];
    const keyMap = await this.getStudentKeyMap(classId);
    // `take` bounds the context-payload fetch: a topic can reference thousands
    // of interactions in a large class, but callers only display a page.
    const interactions = await this.database.userInteraction.findMany({
      where: {
        id: { in: questionIds },
        ...(lectureId ? { pdfId: lectureId } : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
      select: {
        id: true,
        userId: true,
        pdfId: true,
        pdfPage: true,
        timestamp: true,
        context: true,
      },
    });

    return interactions.map((i) => ({
      id: i.id,
      student: keyMap.get(i.userId)?.label ?? 'Unknown Student',
      studentKey: keyMap.get(i.userId)?.key ?? 'unknown',
      question:
        typeof (i.context as any)?.content?.prompt === 'string'
          ? (i.context as any).content.prompt
          : '',
      pdfId: i.pdfId,
      pdfPage: i.pdfPage,
      timestamp: i.timestamp.toISOString(),
    }));
  }

  /**
   * The `topics` Json column holds `{ topics, intents }`. Legacy rows stored a
   * bare topics array (pre-intent); normalize both shapes.
   */
  private parseStored(json: unknown): {
    topics: StoredTopic[];
    intents: StoredIntent[];
  } {
    if (Array.isArray(json)) {
      return { topics: json as StoredTopic[], intents: [] };
    }
    const obj = (json ?? {}) as {
      topics?: StoredTopic[];
      intents?: StoredIntent[];
    };
    return {
      topics: Array.isArray(obj.topics) ? obj.topics : [],
      intents: Array.isArray(obj.intents) ? obj.intents : [],
    };
  }

  async getTopicsStatus(classId: string) {
    const record = await this.database.classAnalyticsTopics.findUnique({
      where: { classId },
      select: {
        status: true,
        questionCount: true,
        updatedAt: true,
        error: true,
      },
    });
    return {
      status: record?.status ?? 'pending',
      questionCount: record?.questionCount ?? 0,
      updatedAt: record?.updatedAt?.toISOString() ?? null,
      error: record?.error ?? null,
    };
  }

  async forceRefreshTopics(classId: string) {
    const record = await this.kickRefresh(classId, true);
    return {
      status: record?.status ?? 'processing',
      message: 'Topic refresh started',
    };
  }

  private async checkStaleness(
    classId: string,
    record: {
      status: string;
      updatedAt: Date;
      lastProcessedAt: Date | null;
      questionCount: number;
      topics: unknown;
    } | null,
  ): Promise<{
    shouldRefresh: boolean;
    newCount: number;
    fullRegen: boolean;
  }> {
    const newCount = await this.database.userInteraction.count({
      where: {
        classId,
        type: { in: CHAT_TYPES },
        ...(record?.lastProcessedAt
          ? { timestamp: { gt: record.lastProcessedAt } }
          : {}),
      },
    });

    if (!record) {
      return { shouldRefresh: newCount > 0, newCount, fullRegen: false };
    }

    if (record.status === 'processing') {
      // Allow re-kick only if a previous run looks crashed
      const stuck =
        Date.now() - record.updatedAt.getTime() > PROCESSING_TIMEOUT_MS;
      return { shouldRefresh: stuck && newCount > 0, newCount, fullRegen: false };
    }

    if (record.status === 'failed') {
      return { shouldRefresh: newCount > 0, newCount, fullRegen: false };
    }

    // Records analyzed before intent classification existed have no intents:
    // reprocess everything once so intents cover the full history.
    if (
      record.questionCount > 0 &&
      this.parseStored(record.topics).intents.length === 0
    ) {
      return { shouldRefresh: true, newCount, fullRegen: true };
    }

    const isStale =
      newCount >= STALE_NEW_QUESTION_THRESHOLD ||
      (newCount > 0 &&
        Date.now() - record.updatedAt.getTime() > STALE_AGE_MS);
    return { shouldRefresh: isStale, newCount, fullRegen: false };
  }

  private async kickRefresh(classId: string, force = false) {
    const record = await this.database.classAnalyticsTopics.upsert({
      where: { classId },
      create: { classId, status: 'processing' },
      update: { status: 'processing', error: null },
    });

    // Fire and forget; status polling reports progress to the client
    void this.processTopics(classId, force).catch((error) => {
      this.logger.error(`Topic processing crashed for class ${classId}`, error);
    });

    return record;
  }

  private async processTopics(classId: string, force = false) {
    try {
      let record = await this.database.classAnalyticsTopics.findUnique({
        where: { classId },
      });
      if (!record) return;

      const since = force ? null : record.lastProcessedAt;
      const topicsById = new Map<string, StoredTopic>();
      const intentsById = new Map<string, StoredIntent>();
      if (!force) {
        const stored = this.parseStored(record.topics);
        for (const t of stored.topics) {
          if (t?.id) {
            topicsById.set(t.id, {
              id: t.id,
              label: t.label,
              questionIds: [...(t.questionIds ?? [])],
            });
          }
        }
        for (const i of stored.intents) {
          if (i?.id) {
            intentsById.set(i.id, {
              id: i.id,
              questionIds: [...(i.questionIds ?? [])],
            });
          }
        }
      }

      const interactions = await this.database.userInteraction.findMany({
        where: {
          classId,
          type: { in: CHAT_TYPES },
          ...(since ? { timestamp: { gt: since } } : {}),
        },
        orderBy: { timestamp: 'asc' },
        take: MAX_QUESTIONS_PER_RUN,
        select: { id: true, timestamp: true, context: true },
      });

      if (interactions.length === 0) {
        await this.database.classAnalyticsTopics.update({
          where: { classId },
          data: { status: 'completed' },
        });
        return;
      }

      // Compress before the LLM sees anything: extract prompt text, drop
      // chit-chat, truncate long questions, and dedupe identical texts while
      // remembering every interaction ID behind each unique text.
      const idsByText = new Map<string, string[]>();
      for (const i of interactions) {
        const raw = (i.context as any)?.content?.prompt;
        if (typeof raw !== 'string') continue;
        const text = raw.replace(/\s+/g, ' ').trim();
        if (text.length < 3 || CHITCHAT_PATTERN.test(text)) continue;
        const truncated = text.slice(0, QUESTION_TRUNCATE_CHARS);
        const key = truncated.toLowerCase();
        const ids = idsByText.get(key) ?? [];
        ids.push(i.id);
        idsByText.set(key, ids);
      }

      const uniqueQuestions = [...idsByText.entries()].map(
        ([key, ids]) => ({ text: key, ids }),
      );

      let totalUsage = 0;
      for (
        let start = 0;
        start < uniqueQuestions.length;
        start += MAX_QUESTIONS_PER_LLM_CALL
      ) {
        const batch = uniqueQuestions.slice(
          start,
          start + MAX_QUESTIONS_PER_LLM_CALL,
        );
        const usage = await this.assignBatchToTopics(
          batch,
          topicsById,
          intentsById,
        );
        totalUsage += usage;
      }

      const lastTimestamp = interactions[interactions.length - 1].timestamp;
      const analyzedIds = new Set<string>();
      for (const t of topicsById.values())
        t.questionIds.forEach((id) => analyzedIds.add(id));
      for (const i of intentsById.values())
        i.questionIds.forEach((id) => analyzedIds.add(id));

      await this.database.classAnalyticsTopics.update({
        where: { classId },
        data: {
          topics: {
            topics: [...topicsById.values()],
            intents: [...intentsById.values()],
          } as unknown as Prisma.InputJsonValue,
          status: 'completed',
          questionCount: analyzedIds.size,
          lastProcessedAt: lastTimestamp,
          error: null,
        },
      });

      this.logger.log(
        `Topics updated for class ${classId}: ${topicsById.size} topics, ` +
          `${interactions.length} interactions processed, ~${totalUsage} tokens`,
      );

      // More questions may remain beyond the per-run cap; the next visit's
      // staleness check picks them up automatically.
    } catch (error: any) {
      this.logger.error(`Topic processing failed for class ${classId}`, error);
      await this.database.classAnalyticsTopics
        .update({
          where: { classId },
          data: {
            status: 'failed',
            error: String(error?.message ?? error).slice(0, 500),
          },
        })
        .catch(() => undefined);
    }
  }

  /**
   * One LLM call: for each numbered question, classify the student's intent
   * (fixed taxonomy) and assign an academic topic, creating new topics only
   * when nothing fits. Mutates topicsById and intentsById.
   * Returns total tokens used.
   */
  private async assignBatchToTopics(
    batch: { text: string; ids: string[] }[],
    topicsById: Map<string, StoredTopic>,
    intentsById: Map<string, StoredIntent>,
  ): Promise<number> {
    const existingList = [...topicsById.values()]
      .map((t) => `- ${t.id}: ${t.label}`)
      .join('\n');

    const intentList = INTENT_DEFINITIONS.map(
      (i) => `- ${i.id}: ${i.description}`,
    ).join('\n');

    const numbered = batch.map((q, i) => `${i + 1}. ${q.text}`).join('\n');

    const systemPrompt = `You are analyzing student questions from a university course to build an overview for the instructor.

${topicsById.size > 0 ? `Existing topics (id: label):\n${existingList}` : 'There are no existing topics yet.'}

Intent taxonomy (use exactly these ids):
${intentList}

Task: for EVERY numbered question decide (a) the student's INTENT — what they are trying to get from the AI — and (b) the academic TOPIC the question is about.

Intent rules:
- Judge intent from how the question is phrased, not from its topic. "give me the answer to Q1" is answer-seeking; "walk me through Q1" is guidance; "why does X happen" is concept.
- Every question gets an intent. Use "other" only when nothing else fits (greetings, test messages).

Topic rules:
- Prefer an existing topic when the question fits it; only create a new topic when none fits.
- A new topic must be a specific academic concept: label in Title Case with 1-4 words (e.g. "Gradient Descent", "Bayes Theorem"), id in kebab-case (e.g. "gradient-descent"). Never create vague topics like "General Question", "Homework Help", or "Lecture Content".
- Merge synonyms, abbreviations and translations into ONE topic (e.g. "PCA" and "principal component analysis" belong to the same topic).
- Questions with no identifiable academic subject (e.g. "give me the answer of question 1", greetings): use the special topic id "_skip". They still get an intent.
- Create at most 10 new topics per response. When in doubt, reuse an existing topic.

Respond with STRICT JSON only, in this exact shape:
{"newTopics":[{"id":"topic-id","label":"Topic Label"}],"assignments":[{"q":1,"topic":"topic-id","intent":"intent-id"}]}`;

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Student questions (${batch.length}):\n${numbered}`,
      },
    ];

    const response = await this.llmService.createChat(
      messages,
      0,
      LLM_MAX_OUTPUT_TOKENS,
      undefined,
      { type: 'json_object' },
      'openai',
    );

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty LLM response during topic extraction');

    const parsed = JSON.parse(
      content.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim(),
    );

    const newTopics: { id: string; label: string }[] = Array.isArray(
      parsed.newTopics,
    )
      ? parsed.newTopics
      : [];
    for (const t of newTopics) {
      if (!t?.id || !t?.label || typeof t.id !== 'string') continue;
      const id = t.id.toLowerCase().trim();
      if (id === '_skip' || topicsById.has(id)) continue;
      topicsById.set(id, { id, label: String(t.label).trim(), questionIds: [] });
    }

    const assignments: { q: number; topic: string; intent?: string }[] =
      Array.isArray(parsed.assignments) ? parsed.assignments : [];
    for (const a of assignments) {
      const index = Number(a?.q) - 1;
      if (index < 0 || index >= batch.length) continue;

      const topicId = String(a?.topic ?? '').toLowerCase().trim();
      if (topicId !== '_skip') {
        const topic = topicsById.get(topicId);
        if (topic) {
          for (const id of batch[index].ids) {
            if (!topic.questionIds.includes(id)) topic.questionIds.push(id);
          }
        }
      }

      const intentId = String(a?.intent ?? '').toLowerCase().trim();
      if (INTENT_LABEL_BY_ID.has(intentId)) {
        let intent = intentsById.get(intentId);
        if (!intent) {
          intent = { id: intentId, questionIds: [] };
          intentsById.set(intentId, intent);
        }
        for (const id of batch[index].ids) {
          if (!intent.questionIds.includes(id)) intent.questionIds.push(id);
        }
      }
    }

    return response.usage?.total_tokens ?? 0;
  }
}
