import { z } from 'zod';

/**
 * The shareable Config JSON contract for a learning experiment.
 *
 * This zod schema is the SINGLE SOURCE OF TRUTH for experiment configuration.
 * It drives: backend validation, the MCP `get_experiment_schema` /
 * `validate_experiment_config` tools, and (via JSON Schema) the frontend
 * Approve-form. See EXPERIMENT_SYSTEM_DESIGN.md.
 *
 * Locked decisions: engine-only model control ({openai, qwen}), per-class
 * scope, deterministic-hash sticky assignment.
 */

export const ENGINE_CHOICES = ['openai', 'qwen'] as const;

/** Per-class system prompts override (mirrors ClassMetadata.systemPrompts). */
export const systemPromptsSchema = z
  .object({
    defaultSystemMessage: z.string().optional(),
    classMaterialsPrompt: z.string().optional(),
    recitationPrompt: z.string().optional(),
  })
  .strict();

/** The chat configuration a single variant (被试组 / arm) applies. */
export const variantConfigSchema = z
  .object({
    engine: z.enum(ENGINE_CHOICES),
    systemPrompts: systemPromptsSchema.optional(),
    toolsEnabled: z
      .object({
        rag: z.boolean().optional(),
        codeInterpreter: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const variantSchema = z
  .object({
    key: z
      .string()
      .min(1)
      .regex(/^[a-z0-9_]+$/, 'key must be lowercase alphanumeric/underscore'),
    label: z.string().min(1),
    allocation: z.number().min(0).max(1),
    config: variantConfigSchema,
    // Manual strategy: explicit roster of student emails assigned to this
    // variant. Resolved to enrolled students at activation. Ignored by the
    // auto strategies (deterministic_hash / random).
    members: z.array(z.string()).optional(),
  })
  .strict();

export const assignmentSchema = z
  .object({
    strategy: z
      .enum(['deterministic_hash', 'random', 'manual'])
      .default('deterministic_hash'),
    // Frozen seed makes deterministic_hash reproducible (required for it).
    seed: z.string().optional(),
    unit: z.enum(['user', 'session']).default('user'),
  })
  .strict();

export const experimentConfigSchema = z
  .object({
    schemaVersion: z.literal('1.0').default('1.0'),
    name: z.string().min(1),
    description: z.string().optional(),
    // null = a shareable template not yet bound to a class.
    classId: z.string().nullable().optional(),
    assignment: assignmentSchema,
    variants: z.array(variantSchema).min(2),
  })
  .strict()
  .superRefine((cfg, ctx) => {
    // Variant keys must be unique.
    const keys = cfg.variants.map((v) => v.key);
    if (new Set(keys).size !== keys.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'variant keys must be unique',
        path: ['variants'],
      });
    }
    // Allocations must sum to 1 for the auto strategies (within fp tolerance).
    // Under manual assignment, membership defines the groups, so allocation is
    // not meaningful and not constrained.
    if (cfg.assignment.strategy !== 'manual') {
      const sum = cfg.variants.reduce((acc, v) => acc + v.allocation, 0);
      if (Math.abs(sum - 1) > 1e-6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `variant allocations must sum to 1 (got ${sum})`,
          path: ['variants'],
        });
      }
    }
    // Deterministic assignment needs a seed to be reproducible.
    if (
      cfg.assignment.strategy === 'deterministic_hash' &&
      !cfg.assignment.seed?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'a seed is required for deterministic assignment',
        path: ['assignment', 'seed'],
      });
    }
  });

export type SystemPromptsConfig = z.infer<typeof systemPromptsSchema>;
export type ExperimentConfig = z.infer<typeof experimentConfigSchema>;

/**
 * Hand-authored JSON Schema mirror of the zod contract. Consumed by the MCP
 * `get_experiment_schema` tool (feeds the webmcp form) and by the frontend
 * @rjsf Approve-form. Keep in sync with the zod schema above.
 */
export const experimentConfigJsonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Experiment Config',
  type: 'object',
  required: ['name', 'assignment', 'variants'],
  properties: {
    schemaVersion: { type: 'string', const: '1.0', default: '1.0' },
    name: { type: 'string', title: 'Experiment name', minLength: 1 },
    description: { type: 'string', title: 'Description' },
    classId: {
      type: ['string', 'null'],
      title: 'Class ID (null = shareable template)',
    },
    assignment: {
      type: 'object',
      title: 'Assignment',
      required: ['strategy'],
      properties: {
        strategy: {
          type: 'string',
          // 'random' is deprecated: still accepted by the zod contract for
          // legacy stored configs, but no longer offered to the assistant/MCP
          // (the UI cannot represent it and its split isn't reproducible).
          enum: ['deterministic_hash', 'manual'],
          default: 'deterministic_hash',
        },
        seed: {
          type: 'string',
          title: 'Seed (required for deterministic; makes it reproducible)',
        },
        // Only per-user assignment is implemented (sticky ExperimentAssignment
        // rows keyed by userId; groups are fixed before any chat). 'session'
        // remains in the zod contract for legacy tolerance but is not offered
        // to the assistant/MCP.
        unit: { type: 'string', enum: ['user'], default: 'user' },
      },
    },
    variants: {
      type: 'array',
      title: 'Variants',
      minItems: 2,
      items: {
        type: 'object',
        required: ['key', 'label', 'allocation', 'config'],
        properties: {
          key: {
            type: 'string',
            title: 'Key',
            pattern: '^[a-z0-9_]+$',
          },
          label: { type: 'string', title: 'Label' },
          allocation: {
            type: 'number',
            title: 'Allocation (0..1; must sum to 1 across variants)',
            minimum: 0,
            maximum: 1,
          },
          members: {
            type: 'array',
            title: 'Member emails (manual strategy only)',
            items: { type: 'string' },
          },
          config: {
            type: 'object',
            required: ['engine'],
            properties: {
              engine: {
                type: 'string',
                title: 'Chat engine',
                enum: [...ENGINE_CHOICES],
              },
              systemPrompts: {
                type: 'object',
                title: 'System prompt (overrides the class default)',
                // Only defaultSystemMessage is injected by the chat. The legacy
                // classMaterials/recitation fields (retired v1 PDF chat) stay in
                // the zod contract for old configs but are not offered here.
                properties: {
                  defaultSystemMessage: { type: 'string' },
                },
              },
              toolsEnabled: {
                type: 'object',
                properties: {
                  rag: { type: 'boolean' },
                  codeInterpreter: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
export type ExperimentVariant = z.infer<typeof variantSchema>;
export type VariantConfig = z.infer<typeof variantConfigSchema>;
export type ExperimentAssignmentStrategy = z.infer<
  typeof assignmentSchema
>['strategy'];
