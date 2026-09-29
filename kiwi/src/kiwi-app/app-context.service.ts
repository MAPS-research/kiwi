import { Injectable, Logger } from '@nestjs/common';
import { UserInteractionService } from 'src/common/database/user-interaction.service';
import { KeywordService } from 'src/common/database/keyword.service';
import { UserService } from 'src/common/database/user.service';
import { ClassService } from 'src/class/class.service';

export type ContextInclude =
  'recent_questions' | 'weak_concepts' | 'relevant_materials';

export interface AssembledContext {
  contextText: string;
  included: ContextInclude[];
  omitted: ContextInclude[];
}

// Chat interaction types that carry student turns; mirrors the filter used by
// StudentService.getChatHistory.
const CHAT_TYPES = [
  'frontend-interaction-chat',
  'frontend-interaction-chat-exercise',
  'exercise_chat',
  'chat-query',
];

const MAX_INTERACTIONS = 100;
const MAX_QUESTIONS = 30;
const MAX_QUESTION_CHARS = 500;
const MAX_KEYWORDS = 30;
const MAX_MATERIALS_CHARS = 8000;
const MAX_CONTEXT_CHARS = 16000;
const FALLBACK_RETRIEVAL_QUERY = 'key concepts covered in this course';

/**
 * Assembles private, platform-held student learning context for host-mediated
 * Kiwi App LLM requests (issue #217). The assembled text is injected into the
 * LLM prompt server-side and is NEVER returned to the requesting app — only
 * the model output leaves the platform.
 *
 * Consent: `recent_questions` is personal interaction data and is only
 * included when the student has consented (`User.consent === true`); otherwise
 * it is dropped and reported in `omitted`. `weak_concepts` (class-wide
 * LectureKeyword aggregates) and `relevant_materials` (class documents) are
 * class-level data and are always allowed.
 */
@Injectable()
export class AppContextService {
  private readonly logger = new Logger(AppContextService.name);

  constructor(
    private readonly userInteractionService: UserInteractionService,
    private readonly keywordService: KeywordService,
    private readonly userService: UserService,
    private readonly classService: ClassService,
  ) {}

  async assembleStudentLearningContext(params: {
    userId: string;
    classId: string;
    timeWindowDays: number;
    include: ContextInclude[];
    retrievalQuery?: string;
  }): Promise<AssembledContext> {
    const { userId, classId, timeWindowDays } = params;
    const wants = new Set(params.include);
    const included: ContextInclude[] = [];
    const omitted: ContextInclude[] = [];
    const sections: string[] = [];

    let recentQuestions: string[] = [];
    if (wants.has('recent_questions')) {
      const user = await this.userService.user({ id: userId });
      if (user?.consent === true) {
        recentQuestions = await this.getRecentQuestions(
          userId,
          classId,
          timeWindowDays,
        );
        sections.push(
          `## Recent student questions (last ${timeWindowDays} days)\n` +
            (recentQuestions.length
              ? recentQuestions.map((q) => `- ${q}`).join('\n')
              : 'No questions recorded in this period.'),
        );
        included.push('recent_questions');
      } else {
        omitted.push('recent_questions');
      }
    }

    if (wants.has('weak_concepts')) {
      const concepts = await this.getWeakConcepts(classId);
      sections.push(
        '## Concepts students ask about most (class-wide aggregate)\n' +
          (concepts.length
            ? concepts.map((c) => `- ${c}`).join('\n')
            : 'No keyword data available yet.'),
      );
      included.push('weak_concepts');
    }

    if (wants.has('relevant_materials')) {
      const query =
        params.retrievalQuery?.trim() ||
        recentQuestions.join(' ').slice(0, MAX_QUESTION_CHARS) ||
        FALLBACK_RETRIEVAL_QUERY;
      const materials = await this.getRelevantMaterials(query, classId);
      sections.push('## Relevant class material excerpts\n' + materials);
      included.push('relevant_materials');
    }

    return {
      contextText: sections.join('\n\n').slice(0, MAX_CONTEXT_CHARS),
      included,
      omitted,
    };
  }

  private async getRecentQuestions(
    userId: string,
    classId: string,
    timeWindowDays: number,
  ): Promise<string[]> {
    const since = new Date(Date.now() - timeWindowDays * 24 * 60 * 60 * 1000);
    const interactions =
      await this.userInteractionService.userInteractionsWithServerActions({
        where: {
          userId,
          classId,
          type: { in: CHAT_TYPES },
          timestamp: { gte: since },
        },
        orderBy: { timestamp: 'desc' },
        take: MAX_INTERACTIONS,
      });

    // Two storage patterns (see StudentService.flattenInteractionsToMessages):
    // single-turn interactions keep the prompt at context.content.prompt;
    // exercise chats keep a context.messages[] array of role/content turns.
    const questions: string[] = [];
    for (const interaction of interactions) {
      if (questions.length >= MAX_QUESTIONS) break;
      const context = interaction.context as any;
      const prompt = context?.content?.prompt;
      if (typeof prompt === 'string' && prompt.trim()) {
        questions.push(prompt.trim().slice(0, MAX_QUESTION_CHARS));
      }
      const messages = context?.messages;
      if (Array.isArray(messages)) {
        for (const message of messages) {
          if (questions.length >= MAX_QUESTIONS) break;
          if (
            message?.role === 'user' &&
            typeof message.content === 'string' &&
            message.content.trim()
          ) {
            questions.push(message.content.trim().slice(0, MAX_QUESTION_CHARS));
          }
        }
      }
    }
    return questions.slice(0, MAX_QUESTIONS);
  }

  private async getWeakConcepts(classId: string): Promise<string[]> {
    const lectureKeywords =
      await this.keywordService.getLectureKeywordsByClassId(classId);

    // keywords JSON entries: { text, count, questions, relatedQuestions }
    // (see StudentService.generateKeywordsFromQuestions). Aggregate across
    // lectures by keyword text.
    const counts = new Map<string, number>();
    for (const lecture of lectureKeywords) {
      if (lecture.status !== 'completed') continue;
      const keywords = lecture.keywords;
      if (!Array.isArray(keywords)) continue;
      for (const keyword of keywords as any[]) {
        const text =
          typeof keyword?.text === 'string' ? keyword.text.trim() : '';
        if (!text) continue;
        const count = typeof keyword.count === 'number' ? keyword.count : 1;
        counts.set(text, (counts.get(text) ?? 0) + count);
      }
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_KEYWORDS)
      .map(([text, count]) => `${text} (${count} mentions)`);
  }

  private async getRelevantMaterials(
    query: string,
    classId: string,
  ): Promise<string> {
    try {
      const results = await this.classService.queryClassDocuments(
        query,
        classId,
        5,
      );
      if (!results?.length) {
        return 'No matching class material found.';
      }
      const parts = results.map((result: any, i: number) => {
        const source = `document ${result.documentId}, page ${result.documentPageNumber}`;
        return `[${i + 1}] (${source})\n${result.text}`;
      });
      return parts.join('\n\n').slice(0, MAX_MATERIALS_CHARS);
    } catch (error) {
      // Retrieval failure (e.g. embedding provider down) degrades the section,
      // not the whole request.
      this.logger.warn(
        `Material retrieval failed for class ${classId}: ${error instanceof Error ? error.message : error}`,
      );
      return 'Class material retrieval is currently unavailable.';
    }
  }
}
