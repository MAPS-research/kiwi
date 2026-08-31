// Thin typed wrapper over the generated OpenAPI client for the experiment
// endpoints. Delegating to `apiClient` reuses the project's shared auth token,
// basePath, and unauthorized-handling middleware (see utils/api.ts).
//
// The generated `config` field is a loose object (Prisma Json), so we cast
// to the precise interfaces below for use in the experiment pages.

import apiClient, { basePath } from "./api.ts";

export type Engine = "openai" | "qwen";

export interface SystemPrompts {
  defaultSystemMessage?: string;
  classMaterialsPrompt?: string;
  recitationPrompt?: string;
}

export interface VariantConfig {
  engine: Engine;
  systemPrompts?: SystemPrompts;
  toolsEnabled?: { rag?: boolean; codeInterpreter?: boolean };
}

export interface Variant {
  key: string;
  label: string;
  allocation: number;
  config: VariantConfig;
  /** Manual strategy: student emails assigned to this variant. */
  members?: string[];
}

export interface SystemPromptDefaults {
  defaultSystemMessage: string;
  classMaterialsPrompt: string;
  recitationPrompt: string;
}

export interface RosterEntry {
  userId: string;
  email: string;
}

export interface AssistantMsg {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantReply {
  reply: string;
  config?: ExperimentConfig | null;
}

export interface AssignmentSpec {
  strategy: "deterministic_hash" | "random" | "manual";
  seed: string;
  /** Backward compatibility for configs created before salt was renamed. */
  salt?: string;
  unit: "user" | "session";
}

export interface ExperimentConfig {
  schemaVersion?: "1.0";
  name: string;
  description?: string;
  classId?: string | null;
  assignment: AssignmentSpec;
  variants: Variant[];
}

export interface Experiment {
  id: string;
  classId: string;
  name: string;
  description?: string | null;
  status: "draft" | "active" | "completed";
  config: ExperimentConfig;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Run a generated-client call and, on a ResponseError, surface the server's
 * JSON message/issues (the generated client otherwise throws a generic error).
 * Also casts the loosely-typed result to the precise interface T.
 */
async function call<T>(p: Promise<any>): Promise<T> {
  try {
    return (await p) as T;
  } catch (e: any) {
    if (e?.response && typeof e.response.json === "function") {
      try {
        const body = await e.response.json();
        const msg = body?.message ?? body?.error ?? body?.issues;
        throw new Error(
          typeof msg === "string" ? msg : JSON.stringify(msg ?? body),
        );
      } catch (inner: any) {
        if (inner instanceof Error) throw inner;
      }
    }
    throw e instanceof Error ? e : new Error(String(e));
  }
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const token = localStorage.getItem("authToken");
  const response = await fetch(`${basePath}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    let msg = response.statusText;
    try {
      const body = await response.json();
      msg =
        body?.message ??
        body?.error ??
        (body?.issues ? JSON.stringify(body.issues) : msg);
    } catch {
      const text = await response.text().catch(() => "");
      if (text) msg = text;
    }
    throw new Error(msg);
  }

  return (await response.json()) as T;
}

/**
 * Shareable/downloadable form of a config: strips the per-student group detail
 * (variant member lists) and the class binding, but keeps the assignment seed
 * so a seeded split stays reproducible after re-import.
 */
export function exportableConfig(config: ExperimentConfig): ExperimentConfig {
  return {
    ...config,
    classId: null,
    variants: config.variants.map(({ members: _members, ...variant }) => ({
      ...variant,
    })),
  };
}

export function normalizeExperimentConfig(config: ExperimentConfig): ExperimentConfig {
  const assignment = (config.assignment ?? {}) as AssignmentSpec;
  const { salt: _salt, ...restAssignment } = assignment;
  return {
    ...config,
    assignment: {
      strategy: restAssignment.strategy ?? "deterministic_hash",
      seed: restAssignment.seed ?? assignment.salt ?? "",
      unit: restAssignment.unit ?? "user",
    },
  };
}

function normalizeExperiment(experiment: Experiment): Experiment {
  return {
    ...experiment,
    config: normalizeExperimentConfig(experiment.config),
  };
}

export const experimentApi = {
  list: (classID: string) =>
    call<Experiment[]>(apiClient.experimentControllerList({ classID })).then(
      (experiments) => experiments.map(normalizeExperiment),
    ),

  get: (classID: string, experimentId: string) =>
    call<Experiment>(
      apiClient.experimentControllerGet({ classID, experimentId }),
    ).then(normalizeExperiment),

  create: (classID: string, config: ExperimentConfig) =>
    call<Experiment>(
      apiClient.experimentControllerCreate({
        classID,
        experimentConfigBody: {
          config: normalizeExperimentConfig(config) as unknown as { [key: string]: any },
        },
      }),
    ).then(normalizeExperiment),

  update: (classID: string, experimentId: string, config: ExperimentConfig) =>
    request<Experiment>(
      `/class/${encodeURIComponent(classID)}/experiments/${encodeURIComponent(experimentId)}`,
      {
        method: "PUT",
        body: JSON.stringify({
          config: normalizeExperimentConfig(config) as unknown as {
            [key: string]: any;
          },
        }),
      },
    ).then(normalizeExperiment),

  validate: (classID: string, config: unknown) =>
    call<ExperimentConfig>(
      apiClient.experimentControllerValidate({
        classID,
        experimentConfigBody: {
          config: normalizeExperimentConfig(config as ExperimentConfig) as {
            [key: string]: any;
          },
        },
      }),
    ).then(normalizeExperimentConfig),

  activate: (classID: string, experimentId: string) =>
    call<Experiment>(
      apiClient.experimentControllerActivate({ classID, experimentId }),
    ).then(normalizeExperiment),

  complete: (classID: string, experimentId: string) =>
    call<Experiment>(
      apiClient.experimentControllerComplete({ classID, experimentId }),
    ).then(normalizeExperiment),

  assignmentCounts: (classID: string, experimentId: string) =>
    call<{ variantKey: string; count: number }[]>(
      apiClient.experimentControllerAssignmentCounts({ classID, experimentId }),
    ),

  analytics: (classID: string, experimentId: string) =>
    call<{ variantKey: string; students: number; interactions: number }[]>(
      apiClient.experimentControllerAnalytics({ classID, experimentId }),
    ),

  exportConfig: (classID: string, experimentId: string) =>
    call<ExperimentConfig>(
      apiClient.experimentControllerExport({ classID, experimentId }),
    ).then(normalizeExperimentConfig),

  defaults: (classID: string) =>
    call<SystemPromptDefaults>(
      apiClient.experimentControllerDefaults({ classID }),
    ),

  roster: (classID: string) =>
    call<RosterEntry[]>(apiClient.experimentControllerRoster({ classID })),

  assistant: (classID: string, messages: AssistantMsg[]) =>
    call<AssistantReply>(
      apiClient.experimentControllerAssistant({
        classID,
        assistantChatBody: { messages },
      }),
    ).then((reply) => ({
      ...reply,
      config: reply.config ? normalizeExperimentConfig(reply.config) : reply.config,
    })),
};

/** A fresh two-variant draft config to seed the form. */
export function blankConfig(): ExperimentConfig {
  return {
    schemaVersion: "1.0",
    name: "",
    description: "",
    assignment: { strategy: "deterministic_hash", seed: "", unit: "user" },
    variants: [
      { key: "control", label: "Control", allocation: 0.5, config: { engine: "openai" } },
      { key: "treatment", label: "Treatment", allocation: 0.5, config: { engine: "qwen" } },
    ],
  };
}
