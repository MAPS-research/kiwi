import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { Experiment } from '@prisma/client';
import { ExperimentDatabaseService } from 'src/common/database/experiment.service';
import { EnrollmentService } from 'src/common/database/enrollment.service';
import { FeatureFlagService } from 'src/common/database/feature-flags.service';
import { ConfigService } from '@nestjs/config';
import { ClassService } from 'src/class/class.service';
import { DEFAULT_SYSTEM_PROMPTS } from 'src/student/student.prompts';
import { LlmService } from 'src/common/llm/llm.service';
import { EngineChoice } from 'src/common/llm/interfaces/engine-config';
import { experimentConfigJsonSchema } from './interfaces/experiment-config';
import {
  ENGINE_CHOICES,
  ExperimentConfig,
  ExperimentVariant,
  experimentConfigSchema,
  SystemPromptsConfig,
} from './interfaces/experiment-config';

/** What the chat path needs from an active experiment for the current student. */
export interface ResolvedExperimentConfig {
  experimentId: string;
  variantKey: string;
  engine: (typeof ENGINE_CHOICES)[number];
  systemPrompts?: SystemPromptsConfig;
}

@Injectable()
export class ExperimentService {
  private readonly logger = new Logger(ExperimentService.name);

  constructor(
    private readonly db: ExperimentDatabaseService,
    private readonly enrollmentService: EnrollmentService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly classService: ClassService,
    private readonly llmService: LlmService,
    private readonly configService: ConfigService,
  ) {}

  /** The chat engine that actually has an API key configured ("match the system"). */
  private assistantEngine(): EngineChoice {
    if (this.configService.get<string>('LLM_API_KEY')) return 'openai';
    if (this.configService.get<string>('QWEN_API_KEY')) return 'qwen';
    return 'openai';
  }

  /**
   * Conversational assistant that helps an instructor design an experiment.
   * Uses the system's default chat model. Replies naturally and, once the
   * design is complete, embeds a single fenced ```json block with the full
   * Config JSON. We extract + validate it and return it alongside the reply so
   * the frontend can open the pre-filled form. Returns config=null while the
   * design is still being discussed or the emitted JSON fails validation.
   */
  async assistantChat(
    classId: string,
    messages: { role: string; content: string }[],
  ): Promise<{ reply: string; config: ExperimentConfig | null }> {
    const defaults = await this.defaultSystemPrompts(classId);
    const roster = await this.db.studentRoster(classId);
    const emails = roster.map((r) => r.email);

    const system = [
      'You help an instructor design a learning experiment on the Kiwi platform.',
      'Students are split into variant groups; each group gets a chat engine (openai or qwen) and optional system-prompt overrides.',
      'Have a brief, focused design conversation: ask only the clarifying questions you need (groups, split, engines, prompt changes).',
      'When you have enough to propose a complete design, output a SHORT natural-language summary AND exactly one fenced ```json code block containing the full experiment Config JSON.',
      'The Config JSON MUST conform to this JSON Schema:',
      JSON.stringify(experimentConfigJsonSchema),
      'Rules: variant keys are lowercase_snake. Use only two assignment strategies: "deterministic_hash" (auto split; REQUIRES a non-empty assignment.seed and allocations summing to 1) or "manual" (put student emails in each variant.members; allocations ignored). NEVER use the deprecated "random" strategy.',
      'assignment.unit is ALWAYS "user" — each student is assigned to one group before they chat and stays there. Per-session assignment is not supported; do not ask about it or offer it.',
      'Every variant MUST include config.systemPrompts.defaultSystemMessage — the FULL system prompt for that group (the chat injects only this field). Do NOT emit classMaterialsPrompt or recitationPrompt: they are legacy fields of the retired v1 PDF chat and are ignored.',
      'IMPORTANT: when the instructor asks to customize a group\'s behavior/prompt, you MUST write the FULL customized prompt text for that group — it has to actually differ from the default and express exactly what they asked for. Do NOT just echo the default. For groups whose prompts were not discussed, copy the class default below as-is.',
      `Class default system prompt (defaultSystemMessage): ${JSON.stringify(defaults.defaultSystemMessage)}.`,
      emails.length
        ? `Enrolled student emails (only use these for manual member lists): ${emails.join(', ')}.`
        : 'No students are enrolled yet.',
      'Do not emit the JSON block until the design is actually ready; keep chatting until then.',
    ].join('\n');

    let completion;
    try {
      completion = await this.llmService.createChat(
        [
          { role: 'system', content: system },
          ...messages.map((m) => ({
            role:
              m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
            content: m.content,
          })),
        ],
        undefined,
        undefined,
        undefined,
        undefined,
        this.assistantEngine(),
      );
    } catch (err) {
      this.logger.error(`Assistant chat failed: ${err}`);
      return {
        reply:
          "The design assistant is unavailable — the server's chat model isn't configured. " +
          'Set LLM_API_KEY (or QWEN_API_KEY) in the backend .env and restart, then try again.',
        config: null,
      };
    }

    const reply = completion.choices[0]?.message?.content || '';
    const config = this.extractConfig(reply);
    return { reply, config };
  }

  /** Pull the first fenced ```json block from text and validate it; else null. */
  private extractConfig(text: string): ExperimentConfig | null {
    const match = text.match(/```json\s*([\s\S]*?)```/i);
    if (!match) return null;
    try {
      const parsed = experimentConfigSchema.safeParse(JSON.parse(match[1]));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  /**
   * The effective default system prompts for a class: the class's metadata
   * overrides merged over the platform defaults. Used by the form to pre-fill
   * each variant's prompts so the instructor sees the current baseline.
   */
  async defaultSystemPrompts(classId: string): Promise<{
    defaultSystemMessage: string;
    classMaterialsPrompt: string;
    recitationPrompt: string;
  }> {
    const classInfo = await this.classService.getClassById(classId);
    const meta = (classInfo?.classMetadata ?? {}) as {
      systemPrompts?: {
        defaultSystemMessage?: string;
        classMaterialsPrompt?: string;
        recitationPrompt?: string;
      };
    };
    return {
      defaultSystemMessage:
        meta.systemPrompts?.defaultSystemMessage ||
        DEFAULT_SYSTEM_PROMPTS.defaultSystemMessage,
      classMaterialsPrompt:
        meta.systemPrompts?.classMaterialsPrompt ||
        DEFAULT_SYSTEM_PROMPTS.classMaterialsPrompt,
      recitationPrompt:
        meta.systemPrompts?.recitationPrompt ||
        DEFAULT_SYSTEM_PROMPTS.recitationPrompt,
    };
  }

  /**
   * Validate an untrusted Config JSON against the zod contract.
   * Returns the parsed config or throws BadRequestException with details.
   */
  validateConfig(raw: unknown): ExperimentConfig {
    const result = experimentConfigSchema.safeParse(raw);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Invalid experiment config',
        issues: result.error.issues,
      });
    }
    return result.data;
  }

  async createExperiment(params: {
    classId: string;
    createdBy: string;
    config: unknown;
  }): Promise<Experiment> {
    const config = this.validateConfig({
      ...(params.config as object),
      classId: params.classId, // bind config to the target class
    });

    return this.db.createExperiment({
      classId: params.classId,
      name: config.name,
      description: config.description ?? null,
      status: 'draft',
      config: config as unknown as object,
      createdBy: params.createdBy,
    });
  }

  /**
   * Edit an existing experiment's config (name / description / variants / etc).
   * classId is preserved. If the experiment is currently active the new config
   * takes effect immediately for subsequent chats.
   */
  async updateExperiment(
    experimentId: string,
    rawConfig: unknown,
  ): Promise<Experiment> {
    const existing = await this.getById(experimentId);
    const config = this.validateConfig({
      ...(rawConfig as object),
      classId: existing.classId, // keep bound to its class
    });
    return this.db.updateExperiment({
      where: { id: experimentId },
      data: {
        name: config.name,
        description: config.description ?? null,
        config: config as unknown as object,
      },
    });
  }

  async listForClass(classId: string): Promise<Experiment[]> {
    return this.db.experiments({
      where: { classId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Enrolled students {userId, email} — for the form's email validation + random assign. */
  async studentRoster(
    classId: string,
  ): Promise<{ userId: string; email: string }[]> {
    return this.db.studentRoster(classId);
  }

  async getById(id: string): Promise<Experiment> {
    const experiment = await this.db.experiment({ id });
    if (!experiment) {
      throw new NotFoundException('Experiment not found');
    }
    return experiment;
  }

  /**
   * Export an experiment's config as a shareable template (classId nulled).
   * The returned JSON can be re-imported into any class via createExperiment.
   */
  async exportConfig(experimentId: string): Promise<ExperimentConfig> {
    const experiment = await this.getById(experimentId);
    const parsed = experimentConfigSchema.safeParse(experiment.config);
    if (!parsed.success) {
      throw new BadRequestException('Stored experiment config is invalid.');
    }
    // Shareable template: unbind from the class and strip the per-student
    // group detail (member lists). The seed is kept so a seeded split stays
    // reproducible if re-imported for the same roster.
    return {
      ...parsed.data,
      classId: null,
      variants: parsed.data.variants.map(
        ({ members: _members, ...variant }) => variant,
      ),
    };
  }

  /** Per-variant assignment counts for the detail view / analytics. */
  async assignmentCounts(
    experimentId: string,
  ): Promise<{ variantKey: string; count: number }[]> {
    return this.db.countByVariant(experimentId);
  }

  /** Per-variant student + chat-interaction stats for the analytics view. */
  async analytics(
    experimentId: string,
  ): Promise<{ variantKey: string; students: number; interactions: number }[]> {
    const experiment = await this.getById(experimentId);
    return this.db.chatStatsByVariant(experimentId, experiment.classId);
  }

  // --- Assignment ------------------------------------------------------

  /**
   * Deterministic, sticky variant selection: hash(userId + seed) → [0,1) →
   * weighted pick. Reproducible across environments without reading the DB.
   */
  pickVariant(
    userId: string,
    seed: string,
    variants: ExperimentVariant[],
  ): ExperimentVariant {
    const hash = createHash('sha256').update(`${userId}:${seed}`).digest('hex');
    const r = parseInt(hash.slice(0, 8), 16) / 0xffffffff; // 0..1
    let acc = 0;
    for (const v of variants) {
      acc += v.allocation;
      if (r < acc) return v;
    }
    return variants[variants.length - 1];
  }

  private pickRandomVariant(variants: ExperimentVariant[]): ExperimentVariant {
    const r = Math.random();
    let acc = 0;
    for (const v of variants) {
      acc += v.allocation;
      if (r < acc) return v;
    }
    return variants[variants.length - 1];
  }

  /**
   * Integer per-variant head-counts for a roster of size `total`, using the
   * largest-remainder (Hamilton) method so the counts sum to exactly `total`
   * while staying as close as integers allow to each `allocation` share.
   */
  private quotaCounts(allocations: number[], total: number): number[] {
    const raw = allocations.map((a) => a * total);
    const counts = raw.map((x) => Math.floor(x));
    let remaining = total - counts.reduce((s, x) => s + x, 0);
    // Hand the leftover seats to the largest fractional remainders; ties break
    // by variant order so the result is fully deterministic.
    const byRemainder = raw
      .map((x, idx) => ({ idx, frac: x - Math.floor(x) }))
      .sort((a, b) => b.frac - a.frac || a.idx - b.idx);
    for (let j = 0; j < byRemainder.length && remaining > 0; j++, remaining--) {
      counts[byRemainder[j].idx]++;
    }
    return counts;
  }

  /**
   * Exact-proportion, reproducible split of an entire roster. Orders users by
   * sha256(`${userId}:${seed}`) — a seeded shuffle — then hands out variants by
   * exact per-variant quotas, so the head-count matches `allocation` as closely
   * as integer counts permit (e.g. 60 students at 0.6/0.4 → exactly 36/24).
   * Deterministic: the same (roster set, seed, variants) always yields the same
   * split, so the client-side preview can reproduce it without a DB round-trip.
   * Returns a map of userId → variantKey.
   */
  assignRosterByQuota(
    userIds: string[],
    seed: string,
    variants: ExperimentVariant[],
  ): Map<string, string> {
    const ordered = userIds
      .map((u) => ({
        u,
        h: createHash('sha256').update(`${u}:${seed}`).digest('hex'),
      }))
      .sort((a, b) =>
        a.h < b.h ? -1 : a.h > b.h ? 1 : a.u < b.u ? -1 : a.u > b.u ? 1 : 0,
      )
      .map((x) => x.u);

    const counts = this.quotaCounts(
      variants.map((v) => v.allocation),
      ordered.length,
    );
    const result = new Map<string, string>();
    let i = 0;
    variants.forEach((v, idx) => {
      for (let k = 0; k < counts[idx]; k++) {
        result.set(ordered[i++], v.key);
      }
    });
    return result;
  }

  /**
   * Resolve the chat config the active experiment (if any) dictates for this
   * student in this class. Returns null when there is no active experiment, the
   * stored config is invalid, or a manual-assignment experiment has not yet
   * assigned this student — in all those cases the caller keeps class defaults.
   *
   * On first hit (auto strategies) a sticky ExperimentAssignment row is written.
   */
  async resolveActiveConfig(
    userId: string,
    classId?: string,
  ): Promise<ResolvedExperimentConfig | null> {
    if (!classId) return null;

    const experiment = await this.db.activeExperimentForClass(classId);
    if (!experiment) return null;

    const parsed = experimentConfigSchema.safeParse(experiment.config);
    if (!parsed.success) {
      this.logger.error(
        `Active experiment ${experiment.id} has invalid config; ignoring override.`,
      );
      return null;
    }
    const cfg = parsed.data;

    // Sticky: reuse an existing assignment if present.
    let variantKey: string;
    const existing = await this.db.assignment(experiment.id, userId);
    if (existing) {
      variantKey = existing.variantKey;
    } else if (cfg.assignment.strategy === 'manual') {
      // Manual strategy: only an instructor-created assignment counts; if none
      // exists yet, do not auto-assign — fall back to class defaults.
      return null;
    } else {
      // Reaching here means the student wasn't part of the roster pre-assigned
      // at activation (e.g. enrolled afterwards). We can't re-run the exact-
      // quota split without disturbing everyone else's sticky assignment, so a
      // late seeded-split student is bucketed by their own hash — reproducible
      // and roughly proportional, just not counted into the exact quota.
      const chosen =
        cfg.assignment.strategy === 'random'
          ? this.pickRandomVariant(cfg.variants)
          : this.pickVariant(userId, cfg.assignment.seed ?? "", cfg.variants);
      await this.db.upsertAssignment({
        experimentId: experiment.id,
        userId,
        variantKey: chosen.key,
        method: 'auto',
      });
      // Option A: keep the permission model honest — a student steered into a
      // qwen variant genuinely gets qwen access via the existing flag.
      if (chosen.config.engine === 'qwen') {
        await this.ensureQwenAccess(userId);
      }
      variantKey = chosen.key;
    }

    const variant =
      cfg.variants.find((v) => v.key === variantKey) ?? cfg.variants[0];

    return {
      experimentId: experiment.id,
      variantKey: variant.key,
      engine: variant.config.engine,
      systemPrompts: variant.config.systemPrompts,
    };
  }

  /**
   * Instructor/admin preview path: resolve a specific experiment variant without
   * writing assignments. Used by student-view experiment mode so staff can
   * simulate how each variant would answer in chat.
   */
  async resolveVariantConfig(
    experimentId: string,
    classId: string,
    variantKey: string,
  ): Promise<ResolvedExperimentConfig> {
    const experiment = await this.getById(experimentId);
    if (experiment.classId !== classId) {
      throw new BadRequestException('Experiment does not belong to this class.');
    }

    const parsed = experimentConfigSchema.safeParse(experiment.config);
    if (!parsed.success) {
      throw new BadRequestException('Experiment config is invalid.');
    }

    const variant = parsed.data.variants.find((v) => v.key === variantKey);
    if (!variant) {
      throw new BadRequestException(`Variant ${variantKey} was not found.`);
    }

    return {
      experimentId: experiment.id,
      variantKey: variant.key,
      engine: variant.config.engine,
      systemPrompts: variant.config.systemPrompts,
    };
  }

  // --- Lifecycle -------------------------------------------------------

  /**
   * Activate an experiment. Enforces one active experiment per class. For auto
   * strategies, pre-assigns the current student roster (deterministic, so it
   * matches the lazy chat-time assignment) and grants qwen access (option A) to
   * students in qwen variants. Manual strategy activates without pre-assigning.
   */
  async activate(experimentId: string): Promise<Experiment> {
    const experiment = await this.getById(experimentId);
    const parsed = experimentConfigSchema.safeParse(experiment.config);
    if (!parsed.success) {
      throw new BadRequestException(
        'Experiment config is invalid; cannot activate.',
      );
    }
    const cfg = parsed.data;

    const active = await this.db.activeExperimentForClass(experiment.classId);
    if (active && active.id !== experiment.id) {
      throw new BadRequestException(
        `Class already has an active experiment (${active.id}); complete it first.`,
      );
    }

    let updated: Experiment;
    try {
      updated = await this.db.updateExperiment({
        where: { id: experiment.id },
        // Setting activeClassId trips the unique constraint if another
        // experiment in this class is already active (race-safe DB guarantee).
        data: { status: 'active', activeClassId: experiment.classId },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new BadRequestException(
          'Class already has an active experiment; complete it first.',
        );
      }
      throw err;
    }

    if (cfg.assignment.strategy === 'manual') {
      // Resolve each variant's member email list to enrolled students and write
      // sticky manual assignments. Emails not on the roster are skipped.
      const roster = await this.db.studentRoster(experiment.classId);
      const emailToUser = new Map(
        roster.map((r) => [r.email.toLowerCase(), r.userId]),
      );
      for (const variant of cfg.variants) {
        for (const rawEmail of variant.members ?? []) {
          const userId = emailToUser.get(rawEmail.trim().toLowerCase());
          if (!userId) continue;
          await this.db.upsertAssignment({
            experimentId: experiment.id,
            userId,
            variantKey: variant.key,
            method: 'manual',
          });
          if (variant.config.engine === 'qwen') {
            await this.ensureQwenAccess(userId);
          }
        }
      }
    } else {
      const enrollments = await this.enrollmentService.enrollments({
        where: { classId: experiment.classId, role: 'student' },
      });
      // Seeded split: assign the WHOLE roster by exact quota in one pass, so the
      // head-count matches `allocation` precisely and equals the instructor's
      // preview. (random still picks per-user.) Existing assignments are kept
      // below for stickiness; a fresh activation has none, so the split is exact.
      const quota =
        cfg.assignment.strategy === 'deterministic_hash'
          ? this.assignRosterByQuota(
              enrollments.map((e) => e.userId),
              cfg.assignment.seed ?? '',
              cfg.variants,
            )
          : null;
      for (const enrollment of enrollments) {
        const existing = await this.db.assignment(
          experiment.id,
          enrollment.userId,
        );
        const chosen = existing
          ? cfg.variants.find((v) => v.key === existing.variantKey) ??
            cfg.variants[0]
          : cfg.assignment.strategy === 'random'
            ? this.pickRandomVariant(cfg.variants)
            : cfg.variants.find(
                (v) => v.key === quota?.get(enrollment.userId),
              ) ?? cfg.variants[0];
        if (!existing) {
          await this.db.upsertAssignment({
            experimentId: experiment.id,
            userId: enrollment.userId,
            variantKey: chosen.key,
            method: 'auto',
          });
        }
        if (chosen.config.engine === 'qwen') {
          await this.ensureQwenAccess(enrollment.userId);
        }
      }
    }

    return updated;
  }

  /** Mark an experiment completed, freeing the class to activate another. */
  async complete(experimentId: string): Promise<Experiment> {
    await this.getById(experimentId);
    return this.db.updateExperiment({
      where: { id: experimentId },
      // Clear activeClassId so the class can activate another experiment.
      data: { status: 'completed', activeClassId: null },
    });
  }

  /** Idempotently grant the user-scoped QwenModel flag (validUntil = always). */
  private async ensureQwenAccess(userId: string): Promise<void> {
    const existing = await this.featureFlagService.checkFeatureFlagByName({
      feature: 'QwenModel',
      userId,
    });
    if (existing.length > 0) return;
    await this.featureFlagService.createFeatureFlag({
      feature: 'QwenModel',
      user: { connect: { id: userId } },
      validUntil: null,
    });
  }
}
