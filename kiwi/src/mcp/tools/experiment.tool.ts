import { Injectable, Logger } from '@nestjs/common';
import { Tool, Context } from '@rekog/mcp-nest';
import { z } from 'zod';
import { Request } from 'express';
import { ExperimentService } from 'src/experiment/experiment.service';
import { experimentConfigJsonSchema } from 'src/experiment/interfaces/experiment-config';

/**
 * MCP tools for the learning-experiment system. These feed the webmcp
 * chat -> form-fill flow: the agent fetches the schema, drafts a config,
 * validates it, and (on instructor approval) creates a draft experiment.
 * Activation remains a separate, manual instructor action.
 */
@Injectable()
export class ExperimentTool {
  private readonly logger = new Logger(ExperimentTool.name);

  constructor(private readonly experimentService: ExperimentService) {}

  @Tool({
    name: 'get_experiment_schema',
    description:
      'Return the JSON Schema describing a learning-experiment Config (variants, ' +
      'engine choice, system prompts, assignment strategy). Use this to build or ' +
      'fill an experiment-design form.',
    parameters: z.object({}),
    annotations: {
      title: 'Get Experiment Schema',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
  })
  async getExperimentSchema() {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(experimentConfigJsonSchema),
        },
      ],
    };
  }

  @Tool({
    name: 'validate_experiment_config',
    description:
      'Validate an experiment Config JSON against the contract (variant keys ' +
      'unique, allocations sum to 1, engine in {openai, qwen}). Returns ok=true ' +
      'with the parsed config, or ok=false with the list of issues.',
    parameters: z.object({
      config: z
        .any()
        .describe('The experiment Config JSON object to validate'),
    }),
    annotations: {
      title: 'Validate Experiment Config',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
  })
  async validateExperimentConfig({ config }: { config: unknown }) {
    try {
      const parsed = this.experimentService.validateConfig(config);
      return {
        content: [
          { type: 'text', text: JSON.stringify({ ok: true, config: parsed }) },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ok: false,
              issues: err?.response?.issues ?? err?.message ?? 'invalid',
            }),
          },
        ],
      };
    }
  }

  @Tool({
    name: 'create_experiment',
    description:
      'Create a DRAFT learning experiment for a class from a Config JSON. The ' +
      'experiment is not activated; an instructor must review and activate it ' +
      'separately. Returns the created experiment.',
    parameters: z.object({
      classId: z.string().nonempty('Class ID is required'),
      config: z.any().describe('The experiment Config JSON object'),
    }),
    annotations: {
      title: 'Create Experiment (Draft)',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    },
  })
  async createExperiment(
    { classId, config }: { classId: string; config: unknown },
    context: Context,
    request: Request,
  ) {
    const userId = (request as any).user?.sub;
    if (!userId) {
      return {
        content: [{ type: 'text', text: 'Error: User not authenticated' }],
        isError: true,
      };
    }
    try {
      const experiment = await this.experimentService.createExperiment({
        classId,
        createdBy: userId,
        config,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(experiment) }],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error creating experiment: ${
              err?.response?.message ?? err?.message ?? 'unknown'
            }`,
          },
        ],
        isError: true,
      };
    }
  }
}
