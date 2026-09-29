import {
  AddOutlined as Plus,
  ChatBubbleOutlined as MessageSquare,
  DataObjectOutlined as FileJson,
  DeleteOutlined as DeleteIcon,
  DownloadOutlined as Download,
  CloudUploadOutlined as Upload,
  GroupOutlined as Users,
  RestoreOutlined as RotateCcw,
  ScienceOutlined as FlaskConical,
  SettingsOutlined as Settings2,
  ShuffleOutlined as Shuffle,
} from "@mui/icons-material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMoreOutlined";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  blankConfig,
  Engine,
  Experiment,
  experimentApi,
  ExperimentConfig,
  exportableConfig,
  RosterEntry,
  SystemPromptDefaults,
  Variant,
} from "../../../utils/experimentApi.ts";
import ExperimentAssistant from "./ExperimentAssistant.tsx";
import {
  ExperimentTheme,
  HoverCard,
  PageHeader,
  PROMPT_FIELDS,
  VIOLET,
  violetGradient
} from "./experimentUi.tsx";
import { computeGroups, isReproducibleStrategy } from "./grouping.ts";

/** A titled section card. */
const Section: React.FC<{
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ icon, title, action, children }) => (
  <HoverCard sx={{ p: { xs: 2, sm: 3 } }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
      <Box sx={{ color: VIOLET, display: "grid", placeItems: "center" }}>{icon}</Box>
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 700,
          flexGrow: 1
        }}>
        {title}
      </Typography>
      {action}
    </Box>
    {children}
  </HoverCard>
);

const ENGINES: Engine[] = ["openai", "qwen"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const parseEmails = (text: string): string[] =>
  text
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);

// "random" is intentionally omitted: it can't be reproduced/shown as a stable
// group list before chat (decided server-side at activation). The backend still
// understands it for any legacy experiment, but instructors can no longer pick
// it — seeded split covers the "auto-assign" case reproducibly.
const STRATEGY_OPTIONS = [
  {
    value: "manual",
    label: "Manual lists",
    caption: "Paste student emails for each group",
  },
  {
    value: "deterministic_hash",
    label: "Seeded split",
    caption:
      "Random split by your allocation %, exact counts. Same seed reproduces it; Reshuffle re-rolls.",
  },
] as const;

type PromptKey = (typeof PROMPT_FIELDS)[number]["key"];

// The UI no longer offers the legacy "random" strategy; configs that still
// carry it (old exports, stale AI drafts) are converted to a seeded split so
// the form can always represent them.
const coerceLegacyStrategy = (cfg: ExperimentConfig): ExperimentConfig =>
  (cfg.assignment?.strategy as string) === "random"
    ? {
        ...cfg,
        assignment: {
          ...cfg.assignment,
          strategy: "deterministic_hash",
          seed: cfg.assignment.seed || `seed-${Date.now().toString(36)}`,
        },
      }
    : cfg;

// Pre-fill a blank variant prompt with the class default, so the instructor
// always sees the effective baseline text (never an empty box). Only
// defaultSystemMessage is managed — it is the one prompt v2 chat injects;
// legacy classMaterials/recitation values pass through untouched (unused).
const fillPrompts = (
  cfg: ExperimentConfig,
  d: SystemPromptDefaults,
): ExperimentConfig => ({
  ...cfg,
  variants: cfg.variants.map((v) => ({
    ...v,
    config: {
      ...v.config,
      systemPrompts: {
        ...v.config.systemPrompts,
        defaultSystemMessage:
          v.config.systemPrompts?.defaultSystemMessage || d.defaultSystemMessage,
      },
    },
  })),
});

/**
 * Experiment-design form. An instructor reviews/edits the config and clicks
 * submit to create or update an experiment. Populatable by the webmcp chat flow via
 * `window.__kiwiFillExperimentForm(config)`. Nothing is created until Approve.
 *
 * Assignment modes (strategy):
 *  - deterministic_hash: students auto-assigned by seeded hash; no member lists.
 *  - manual: per-variant email rosters (typed or one-click random), validated
 *    against the class roster — malformed / non-enrolled emails are flagged.
 *  - (legacy "random" configs are coerced to deterministic_hash on load.)
 */
const ExperimentForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { classID, experimentId } = useParams<{ classID: string; experimentId?: string }>();
  const [config, setConfig] = useState<ExperimentConfig>(blankConfig());
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [memberText, setMemberText] = useState<Record<string, string>>({});
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [rosterLoaded, setRosterLoaded] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [defaults, setDefaults] = useState<SystemPromptDefaults | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingExperiment, setLoadingExperiment] = useState(false);
  const [activateOnSubmit, setActivateOnSubmit] = useState(false);
  const [preview, setPreview] = useState<Record<string, string[]> | null>(null);
  const [previewing, setPreviewing] = useState(false);
  // Snapshot of the AI-drafted config. Fields the instructor changes afterwards
  // are marked red until submit; null when the form wasn't AI-drafted.
  const [aiBaseline, setAiBaseline] = useState<ExperimentConfig | null>(null);
  const isEdit = Boolean(experimentId);

  // Latest values for callbacks/effects registered once.
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  });
  const defaultsRef = useRef<SystemPromptDefaults | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rosterSet = useMemo(
    () => new Set(roster.map((r) => r.email.toLowerCase())),
    [roster],
  );

  const syncMemberText = useCallback((cfg: ExperimentConfig) => {
    const next: Record<string, string> = {};
    cfg.variants.forEach((v) => {
      if (v.members && v.members.length) next[v.key] = v.members.join("\n");
    });
    setMemberText(next);
  }, []);

  // Merge an externally-produced config (AI draft, pasted/imported JSON) into
  // the form: coerce the legacy "random" strategy, fill blank prompts with the
  // class defaults, and — for AI drafts — remember the result as the baseline
  // for red change-marking.
  const applyExternalConfig = useCallback(
    (raw: ExperimentConfig, note: string, markAsAiDraft: boolean) => {
      const wasRandom = (raw.assignment?.strategy as string) === "random";
      const merged = coerceLegacyStrategy({ ...configRef.current, ...raw });
      const filled = defaultsRef.current
        ? fillPrompts(merged, defaultsRef.current)
        : merged;
      setConfig(filled);
      setAiBaseline(markAsAiDraft ? filled : null);
      syncMemberText(filled);
      setError(null);
      setInfo(
        (wasRandom
          ? 'Legacy "random" strategy was converted to a seeded split. '
          : "") + note,
      );
    },
    [syncMemberText],
  );

  // webmcp fill hook.
  useEffect(() => {
    (window as any).__kiwiFillExperimentForm = (cfg: ExperimentConfig) => {
      applyExternalConfig(
        cfg,
        "Form filled from chat. Anything you change is marked red until you submit.",
        true,
      );
    };
    return () => {
      delete (window as any).__kiwiFillExperimentForm;
    };
  }, [applyExternalConfig]);

  // Pre-fill from the floating assistant. Runs on every location.state change
  // (not just mount) so it also works when the assistant is used while already
  // on this form — navigating to the same route would otherwise not remount and
  // the new draft would be ignored. Ref-guards against re-applying the same one.
  const appliedPrefillRef = useRef<unknown>(null);
  useEffect(() => {
    const prefill = (location.state as any)?.prefillConfig as
      | ExperimentConfig
      | undefined;
    if (prefill && appliedPrefillRef.current !== prefill) {
      appliedPrefillRef.current = prefill;
      applyExternalConfig(
        prefill,
        "Drafted by the assistant. Anything you change is marked red until you submit.",
        true,
      );
    }
  }, [location.state, applyExternalConfig]);

  useEffect(() => {
    if (!classID || !experimentId) return;
    let ignore = false;
    setLoadingExperiment(true);
    setError(null);
    experimentApi
      .get(classID, experimentId)
      .then((exp) => {
        if (ignore) return;
        setExperiment(exp);
        setConfig(exp.config);
        syncMemberText(exp.config);
        setActivateOnSubmit(false);
      })
      .catch((e: any) => {
        if (!ignore) setError(e.message);
      })
      .finally(() => {
        if (!ignore) setLoadingExperiment(false);
      });
    return () => {
      ignore = true;
    };
  }, [classID, experimentId, syncMemberText]);

  // Load class roster + default prompts; pre-fill blank variant prompts so the
  // instructor sees the current baseline.
  useEffect(() => {
    if (!classID) return;
    setRosterError(null);
    experimentApi
      .roster(classID)
      .then((r) => {
        setRoster(r);
        setRosterLoaded(true);
      })
      .catch((e: any) => {
        // Surface the failure instead of silently leaving an empty roster —
        // an empty roster is why "Preview groups" used to look permanently dead.
        setRosterError(e?.message || "Failed to load the class roster.");
        setRosterLoaded(true);
      });
    experimentApi
      .defaults(classID)
      .then((d) => {
        setDefaults(d);
        defaultsRef.current = d;
        setConfig((prev) => fillPrompts(prev, d));
        // Apply the same fill to the AI baseline so default-filled prompts
        // don't light up as user edits.
        setAiBaseline((prev) => (prev ? fillPrompts(prev, d) : prev));
      })
      .catch(() => { });
  }, [classID]);

  const allocationSum = useMemo(
    () => config.variants.reduce((s, v) => s + (Number(v.allocation) || 0), 0),
    [config.variants],
  );

  const update = (patch: Partial<ExperimentConfig>) =>
    setConfig((c) => ({ ...c, ...patch }));

  const updateVariant = (i: number, patch: Partial<Variant>) =>
    setConfig((c) => {
      const variants = [...c.variants];
      variants[i] = { ...variants[i], ...patch };
      return { ...c, variants };
    });

  const updateVariantConfig = (i: number, patch: Partial<Variant["config"]>) =>
    setConfig((c) => {
      const variants = [...c.variants];
      variants[i] = {
        ...variants[i],
        config: { ...variants[i].config, ...patch },
      };
      return { ...c, variants };
    });

  const updateSystemPrompt = (
    i: number,
    field: "defaultSystemMessage" | "classMaterialsPrompt" | "recitationPrompt",
    value: string,
  ) =>
    setConfig((c) => {
      const variants = [...c.variants];
      const sp = { ...(variants[i].config.systemPrompts || {}) };
      sp[field] = value;
      variants[i] = {
        ...variants[i],
        config: { ...variants[i].config, systemPrompts: sp },
      };
      return { ...c, variants };
    });

  // Manual mode: parse a variant's email textarea, store the valid+enrolled
  // ones into config.members; malformed/non-enrolled are surfaced as feedback.
  const onMembersChange = (i: number, key: string, text: string) => {
    setMemberText((m) => ({ ...m, [key]: text }));
    const emails = parseEmails(text);
    const valid = emails.filter(
      (e) => EMAIL_RE.test(e) && rosterSet.has(e.toLowerCase()),
    );
    updateVariant(i, { members: Array.from(new Set(valid)) });
  };

  const memberFeedback = (text: string) => {
    const emails = parseEmails(text);
    const badFormat = emails.filter((e) => !EMAIL_RE.test(e));
    const notEnrolled = emails.filter(
      (e) => EMAIL_RE.test(e) && !rosterSet.has(e.toLowerCase()),
    );
    return { badFormat, notEnrolled };
  };

  // Compute the group -> student emails split for the chosen strategy, so the
  // instructor sees exactly who lands in each group before anyone chats. Seeded
  // split reproduces the backend's assignment exactly; manual uses the typed
  // member lists. (Random is decided server-side at activation — not shown.)
  const runPreview = async () => {
    setPreviewing(true);
    try {
      setPreview(await computeGroups(config, roster));
    } finally {
      setPreviewing(false);
    }
  };

  // Signature of the inputs that actually change the grouping, so we only
  // recompute on seed/allocation/member/roster changes — not on every keystroke
  // in unrelated fields (name, description, prompts).
  const groupingSignature = useMemo(
    () =>
      JSON.stringify({
        strategy: config.assignment.strategy,
        seed: config.assignment.seed,
        variants: config.variants.map((v) => ({
          key: v.key,
          allocation: v.allocation,
          members: v.members ?? [],
        })),
        roster: roster.map((r) => r.userId),
      }),
    [config.assignment.strategy, config.assignment.seed, config.variants, roster],
  );

  // Keep a stable grouping visible at all times for reproducible strategies, so
  // every time the form is opened the current split is shown without a click.
  // Random can't be reproduced client-side, so we clear it and show a note.
  useEffect(() => {
    if (!isReproducibleStrategy(config)) {
      setPreview(null);
      return;
    }
    let ignore = false;
    computeGroups(config, roster).then((groups) => {
      if (!ignore) setPreview(groups);
    });
    return () => {
      ignore = true;
    };
    // groupingSignature captures every relevant input; config/roster are read
    // inside but only re-run when the signature changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupingSignature]);

  // How many of a variant's prompts differ from the class defaults.
  const customizedCount = (v: Variant) =>
    defaults
      ? PROMPT_FIELDS.filter(
        (f) => (v.config.systemPrompts?.[f.key] ?? "") !== (defaults[f.key] ?? ""),
      ).length
      : 0;

  // Per-field diff against the AI draft; drives the red change markers.
  // Variants are matched by index; one added after the draft counts as fully
  // changed. Cleared (null) when the form wasn't AI-drafted or after submit.
  const draftDiff = useMemo(() => {
    if (!aiBaseline) return null;
    const promptsDiff = (v: Variant, bv?: Variant) =>
      Object.fromEntries(
        PROMPT_FIELDS.map((f) => [
          f.key,
          (v.config.systemPrompts?.[f.key] ?? "") !==
          (bv?.config.systemPrompts?.[f.key] ?? ""),
        ]),
      ) as Record<PromptKey, boolean>;
    const sortedMembers = (m?: string[]) => JSON.stringify([...(m ?? [])].sort());
    return {
      name: config.name !== aiBaseline.name,
      description: (config.description ?? "") !== (aiBaseline.description ?? ""),
      strategy: config.assignment.strategy !== aiBaseline.assignment.strategy,
      seed: (config.assignment.seed ?? "") !== (aiBaseline.assignment.seed ?? ""),
      variants: config.variants.map((v, i) => {
        const bv = aiBaseline.variants[i];
        if (!bv)
          return {
            key: true,
            label: true,
            allocation: true,
            engine: true,
            members: true,
            prompts: promptsDiff(v),
          };
        return {
          key: v.key !== bv.key,
          label: v.label !== bv.label,
          allocation: Number(v.allocation) !== Number(bv.allocation),
          engine: v.config.engine !== bv.config.engine,
          members: sortedMembers(v.members) !== sortedMembers(bv.members),
          prompts: promptsDiff(v, bv),
        };
      }),
    };
  }, [config, aiBaseline]);

  const randomAssign = () => {
    if (!roster.length) {
      setError("No students on the class roster to assign.");
      return;
    }
    const emails = roster.map((r) => r.email);
    for (let k = emails.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [emails[k], emails[j]] = [emails[j], emails[k]];
    }
    const n = emails.length;
    // Distribute by allocation weights when they sum to ~1, else split evenly.
    const weightSum = config.variants.reduce(
      (s, v) => s + (Number(v.allocation) || 0),
      0,
    );
    const useWeights = Math.abs(weightSum - 1) < 1e-6;
    let idx = 0;
    const variants = config.variants.map((v, k) => {
      const weight = useWeights
        ? Number(v.allocation) || 0
        : 1 / config.variants.length;
      const count =
        k === config.variants.length - 1
          ? n - idx
          : Math.min(n - idx, Math.round(weight * n));
      const slice = emails.slice(idx, idx + count);
      idx += count;
      return { ...v, members: slice };
    });
    const next = { ...config, variants };
    setConfig(next);
    syncMemberText(next);
    setInfo(`Randomly assigned ${n} students across ${variants.length} groups.`);
  };

  const variantWithDefaults = (index: number): Variant => ({
    key: `variant_${index + 1}`,
    label: `Variant ${index + 1}`,
    allocation: 0,
    config: {
      engine: "openai",
      systemPrompts: defaults
        ? { defaultSystemMessage: defaults.defaultSystemMessage }
        : undefined,
    },
  });

  const addVariant = () =>
    setConfig((c) => ({
      ...c,
      variants: [...c.variants, variantWithDefaults(c.variants.length)],
    }));

  const removeVariant = (i: number) =>
    setConfig((c) => ({
      ...c,
      variants: c.variants.filter((_, idx) => idx !== i),
    }));

  const applyJson = () => {
    try {
      applyExternalConfig(
        JSON.parse(jsonText),
        "Applied pasted JSON. Review before approving.",
        false,
      );
    } catch (e: any) {
      setError(`Invalid JSON: ${e.message}`);
    }
  };

  const importJsonFile = async (file: File) => {
    try {
      applyExternalConfig(
        JSON.parse(await file.text()),
        `Imported ${file.name}. Review before approving.`,
        false,
      );
    } catch (e: any) {
      setError(`Invalid JSON file: ${e.message}`);
    }
  };

  // Download the current form config; member lists are stripped (no student
  // group detail in shared JSON) but the seed is kept.
  const exportJson = () => {
    const blob = new Blob(
      [JSON.stringify(exportableConfig(config), null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.name || "experiment"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApprove = async () => {
    if (!classID) return;
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      await experimentApi.validate(classID, config);
      const saved =
        isEdit && experimentId
          ? await experimentApi.update(classID, experimentId, config)
          : await experimentApi.create(classID, config);
      if (activateOnSubmit && saved.status !== "active") {
        await experimentApi.activate(classID, saved.id);
      }
      // Submitted: the red "changed from AI draft" markers are no longer needed.
      setAiBaseline(null);
      navigate(`/admin/class/${classID}/experiments/${saved.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isManual = config.assignment.strategy === "manual";
  const isRandom = config.assignment.strategy === "random";
  const canActivateAfterSubmit = !isEdit || experiment?.status !== "active";

  if (loadingExperiment)
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 10 }}>
        <CircularProgress sx={{ color: VIOLET }} />
      </Box>
    );

  return (
    <ExperimentTheme>
      <Box sx={{ px: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 }, pb: 4, maxWidth: 900, mx: "auto" }}>
        <PageHeader
          icon={<FlaskConical />}
          title={isEdit ? "Edit Experiment" : "New Experiment"}
          subtitle={
            isEdit
              ? "Update groups, assignment, and prompts. Active experiments use saved changes on future chats."
              : "Design variant groups, then review and submit. The AI assistant can draft this for you."
          }
          onBack={() => navigate(`/admin/class/${classID}/experiments`)}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {info && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setInfo(null)}>
            {info}
          </Alert>
        )}

        <Stack spacing={2.5}>
          <Section icon={<Settings2 sx={{ fontSize: 18 }} />} title="Basics">
            <Stack spacing={2}>
              <TextField
                label="Experiment name"
                value={config.name}
                onChange={(e) => update({ name: e.target.value })}
                fullWidth
                error={!!draftDiff?.name}
              />
              <TextField
                label="Description"
                value={config.description || ""}
                onChange={(e) => update({ description: e.target.value })}
                fullWidth
                multiline
                minRows={2}
                error={!!draftDiff?.description}
              />
            </Stack>
          </Section>

          <Section icon={<Shuffle sx={{ fontSize: 18 }} />} title="Group Assignment">
            <RadioGroup
              value={config.assignment.strategy}
              onChange={(e) => {
                setPreview(null);
                update({
                  assignment: {
                    ...config.assignment,
                    strategy: e.target.value as any,
                  },
                });
              }}
            >
              {STRATEGY_OPTIONS.map((o) => (
                <FormControlLabel
                  key={o.value}
                  value={o.value}
                  sx={{ alignItems: "flex-start", mb: 0.5 }}
                  control={
                    <Radio
                      size="small"
                      sx={{ pt: 0.5, color: alpha(VIOLET, 0.5), "&.Mui-checked": { color: VIOLET } }}
                    />
                  }
                  label={
                    <Box sx={{ py: 0.25 }}>
                      <Typography
                        variant="body2"
                        color={
                          draftDiff?.strategy &&
                            config.assignment.strategy === o.value
                            ? "error.main"
                            : undefined
                        }
                        sx={{
                          fontWeight: 600
                        }}
                      >
                        {o.label}
                      </Typography>
                      <Typography variant="caption" sx={{
                        color: "text.secondary"
                      }}>
                        {o.caption}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </RadioGroup>

            {config.assignment.strategy === "deterministic_hash" && (
              <TextField
                label="Seed"
                helperText="The random seed. Keep it to reproduce the same split; edit it or click Reshuffle for a new one."
                error={!!draftDiff?.seed}
                value={config.assignment.seed}
                onChange={(e) =>
                  update({
                    assignment: { ...config.assignment, seed: e.target.value },
                  })
                }
                sx={{ mt: 1, maxWidth: 460 }}
                fullWidth
              />
            )}

            {rosterError && (
              <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
                Couldn't load the class roster: {rosterError}. Group preview is
                unavailable until it loads.
              </Alert>
            )}

            <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
              <Typography variant="subtitle2" sx={{
                fontWeight: 700
              }}>
                Student groups
              </Typography>
              {!isRandom && (
                <Button
                  size="small"
                  variant="text"
                  startIcon={<RotateCcw sx={{ fontSize: 14 }} />}
                  onClick={() => {
                    // Seeded split: "Reshuffle" re-rolls the seed → a fresh random
                    // split that still honours the exact allocation proportions.
                    // The new seed is saved, so the split stays reproducible.
                    // Manual: just recompute from the current member lists.
                    if (config.assignment.strategy === "deterministic_hash") {
                      update({
                        assignment: {
                          ...config.assignment,
                          seed: `seed-${Date.now().toString(36)}-${Math.random()
                            .toString(36)
                            .slice(2, 8)}`,
                        },
                      });
                    } else {
                      runPreview();
                    }
                  }}
                  disabled={previewing}
                  sx={{ color: VIOLET, fontWeight: 600 }}
                >
                  {previewing
                    ? "Computing…"
                    : config.assignment.strategy === "deterministic_hash"
                      ? "Reshuffle"
                      : "Recompute"}
                </Button>
              )}
              <Box sx={{ flexGrow: 1 }} />
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                {isManual
                  ? "From the email lists below."
                  : isRandom
                    ? "Assigned server-side at activation."
                    : "Reproducible — matches what students actually get."}
              </Typography>
            </Box>

            {isRandom ? (
              <Alert
                severity="info"
                icon={false}
                sx={{ mt: 1.5, borderRadius: 2, bgcolor: alpha(VIOLET, 0.05) }}
              >
                “Random on first chat” is decided on the server when you activate,
                so it can’t be shown as a stable list here. To fix each student’s
                group (and which config they get) <b>before</b> they chat, use{" "}
                <b>Seeded split</b> above.
              </Alert>
            ) : rosterLoaded && !isManual && roster.length === 0 && !rosterError ? (
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  mt: 1.5
                }}>
                No students are enrolled in this class yet, so there is nobody to
                group.
              </Typography>
            ) : preview ? (
              <Stack spacing={1.5} sx={{ mt: 2 }}>
                {config.variants.map((v) => {
                  const members = preview[v.key] ?? [];
                  return (
                    <Box
                      key={v.key}
                      sx={{
                        border: `1px solid ${alpha(VIOLET, 0.15)}`,
                        borderRadius: 3,
                        p: 1.5,
                        borderLeft: `4px solid ${v.config.engine === "qwen" ? "#6366f1" : "#10b981"}`,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: members.length ? 1 : 0 }}>
                        <Typography variant="body2" sx={{
                          fontWeight: 700
                        }}>
                          {v.label}
                        </Typography>
                        <Chip
                          size="small"
                          label={v.config.engine}
                          sx={{
                            height: 20,
                            fontWeight: 600,
                            bgcolor: v.config.engine === "qwen" ? "#eef2ff" : "#ecfdf5",
                            color: v.config.engine === "qwen" ? "#4338ca" : "#047857",
                          }}
                        />
                        <Box sx={{ flexGrow: 1 }} />
                        <Chip
                          size="small"
                          label={
                            isManual
                              ? `${members.length} students`
                              : `${members.length} students · target ${Math.round(
                                  (Number(v.allocation) || 0) * 100,
                                )}%`
                          }
                          sx={{ height: 20, fontWeight: 600, bgcolor: alpha(VIOLET, 0.08), color: VIOLET }}
                        />
                      </Box>
                      {members.length ? (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                          {members.map((m) => (
                            <Chip key={m} size="small" variant="outlined" label={m} sx={{ height: 22 }} />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="caption" sx={{
                          color: "text.secondary"
                        }}>
                          No students
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Stack>
            ) : null}
          </Section>

          <Section
            icon={<Users sx={{ fontSize: 18 }} />}
            title="Variants"
            action={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                {isManual && (
                  <Button
                    size="small"
                    startIcon={<Shuffle sx={{ fontSize: 14 }} />}
                    onClick={randomAssign}
                    sx={{ color: VIOLET, fontWeight: 600 }}
                  >
                    Random assign
                  </Button>
                )}
                {isManual ? (
                  <Chip
                    size="small"
                    label={`${config.variants.reduce((s, v) => s + (v.members?.length ?? 0), 0)} / ${roster.length} assigned`}
                    sx={{ bgcolor: alpha(VIOLET, 0.08), color: VIOLET, fontWeight: 600 }}
                  />
                ) : (
                  <Chip
                    size="small"
                    variant="outlined"
                    color={Math.abs(allocationSum - 1) < 1e-6 ? "success" : "error"}
                    label={`Σ ${allocationSum.toFixed(2)}`}
                  />
                )}
              </Box>
            }
          >
            <Stack spacing={2}>
              {config.variants.map((v, i) => {
                const fb = isManual ? memberFeedback(memberText[v.key] || "") : null;
                const vd = draftDiff?.variants[i];
                return (
                  <Paper
                    key={i}
                    variant="outlined"
                    sx={{
                      p: 2.5,
                      borderRadius: 4,
                      borderColor: alpha(VIOLET, 0.15),
                      borderLeft: `4px solid ${v.config.engine === "qwen" ? "#6366f1" : "#10b981"}`,
                    }}
                  >
                    <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                      <TextField
                        label="Key"
                        value={v.key}
                        onChange={(e) => updateVariant(i, { key: e.target.value })}
                        error={!!vd?.key}
                      />
                      <TextField
                        label="Label"
                        value={v.label}
                        onChange={(e) => updateVariant(i, { label: e.target.value })}
                        error={!!vd?.label}
                      />
                      <TextField
                        label="Allocation"
                        type="number"
                        value={v.allocation}
                        onChange={(e) =>
                          updateVariant(i, { allocation: Number(e.target.value) })
                        }
                        sx={{ width: 130 }}
                        disabled={isManual}
                        helperText={isManual ? "set by roster" : undefined}
                        error={!!vd?.allocation}
                        slotProps={{
                          htmlInput: { step: 0.05, min: 0, max: 1 }
                        }}
                      />
                      <TextField
                        select
                        label="Engine"
                        value={v.config.engine}
                        onChange={(e) =>
                          updateVariantConfig(i, { engine: e.target.value as Engine })
                        }
                        sx={{ minWidth: 120 }}
                        error={!!vd?.engine}
                      >
                        {ENGINES.map((eng) => (
                          <MenuItem key={eng} value={eng}>
                            {eng}
                          </MenuItem>
                        ))}
                      </TextField>
                      <IconButton
                        onClick={() => removeVariant(i)}
                        disabled={config.variants.length <= 2}
                        aria-label="remove variant"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>

                    {isManual && (
                      <Accordion disableGutters defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="body2">
                            Members — {v.members?.length ?? 0} student(s)
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <TextField
                            value={memberText[v.key] || ""}
                            onChange={(e) =>
                              onMembersChange(i, v.key, e.target.value)
                            }
                            placeholder="student emails, comma or newline separated"
                            multiline
                            minRows={3}
                            fullWidth
                            error={!!vd?.members}
                          />
                          {fb && fb.badFormat.length > 0 && (
                            <Typography
                              variant="caption"
                              color="error"
                              sx={{
                                display: "block",
                                mt: 0.5
                              }}>
                              Invalid email format (ignored): {fb.badFormat.join(", ")}
                            </Typography>
                          )}
                          {fb && fb.notEnrolled.length > 0 && (
                            <Typography
                              variant="caption"
                              color="error"
                              sx={{
                                display: "block",
                                mt: 0.5
                              }}>
                              Not enrolled in this class (ignored):{" "}
                              {fb.notEnrolled.join(", ")}
                            </Typography>
                          )}
                          {v.members && v.members.length > 0 && (
                            <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                              {v.members.map((m) => (
                                <Chip key={m} size="small" label={m} />
                              ))}
                            </Box>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    )}

                    <Accordion
                      disableGutters
                      elevation={0}
                      sx={{
                        mt: 1.5,
                        border: `1px solid ${alpha(VIOLET, 0.12)}`,
                        borderRadius: 3,
                        bgcolor: alpha(VIOLET, 0.015),
                        overflow: "hidden",
                        "&:before": { display: "none" },
                      }}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", pr: 1 }}>
                          <MessageSquare sx={{ fontSize: 16, color: VIOLET }} />
                          <Typography variant="body2" sx={{
                            fontWeight: 600
                          }}>
                            System prompt
                          </Typography>
                          <Box sx={{ flexGrow: 1 }} />
                          {(() => {
                            const n = customizedCount(v);
                            return (
                              <Chip
                                size="small"
                                label={n ? "Customized" : "Using default"}
                                sx={{
                                  height: 22,
                                  fontWeight: 600,
                                  bgcolor: n ? alpha(VIOLET, 0.1) : "action.hover",
                                  color: n ? VIOLET : "text.secondary",
                                }}
                              />
                            );
                          })()}
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ pt: 0 }}>
                        <Stack spacing={2.5}>
                          {PROMPT_FIELDS.map((f) => {
                            const value = v.config.systemPrompts?.[f.key] || "";
                            const isCustom = defaults
                              ? value !== (defaults[f.key] || "")
                              : false;
                            return (
                              <Box key={f.key}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.75 }}>
                                  <Typography variant="caption" sx={{
                                    fontWeight: 700
                                  }}>
                                    {f.label}
                                  </Typography>
                                  <Typography variant="caption" sx={{
                                    color: "text.secondary"
                                  }}>
                                    · {f.caption}
                                  </Typography>
                                  <Box sx={{ flexGrow: 1 }} />
                                  {isCustom && (
                                    <Button
                                      size="small"
                                      startIcon={<RotateCcw sx={{ fontSize: 12 }} />}
                                      onClick={() =>
                                        updateSystemPrompt(i, f.key, defaults?.[f.key] || "")
                                      }
                                      sx={{ minWidth: 0, px: 1, color: "text.secondary", fontSize: 11 }}
                                    >
                                      Reset
                                    </Button>
                                  )}
                                  <Chip
                                    size="small"
                                    label={isCustom ? "Customized" : "Default"}
                                    sx={{
                                      height: 18,
                                      fontSize: 10,
                                      fontWeight: 600,
                                      bgcolor: isCustom ? alpha(VIOLET, 0.1) : "action.hover",
                                      color: isCustom ? VIOLET : "text.secondary",
                                    }}
                                  />
                                </Box>
                                <TextField
                                  value={value}
                                  onChange={(e) => updateSystemPrompt(i, f.key, e.target.value)}
                                  multiline
                                  minRows={2}
                                  fullWidth
                                  error={!!vd?.prompts[f.key]}
                                  sx={{
                                    "& .MuiOutlinedInput-root": {
                                      bgcolor: "#fff",
                                      fontSize: 13,
                                      lineHeight: 1.5,
                                    },
                                  }}
                                />
                              </Box>
                            );
                          })}
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  </Paper>
                );
              })}

              <Button
                onClick={addVariant}
                variant="outlined"
                startIcon={<Plus sx={{ fontSize: 16 }} />}
                sx={{ alignSelf: "flex-start", borderColor: alpha(VIOLET, 0.4), color: VIOLET }}
              >
                Add variant
              </Button>
            </Stack>
          </Section>

          <Section icon={<FileJson sx={{ fontSize: 18 }} />} title="Import / export config JSON">
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                mb: 1.5
              }}>
              Paste or import a config JSON to fill the form (this is also how the
              chat assistant fills it). Exported JSON contains no student group
              detail — member lists are stripped; the seed is kept.
            </Typography>
            <TextField
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='{"name": "...", "assignment": {...}, "variants": [...]}'
              multiline
              minRows={5}
              fullWidth
              sx={{ "& .MuiInputBase-root": { fontFamily: "monospace", fontSize: 12 } }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importJsonFile(file);
                // Allow re-picking the same file.
                e.target.value = "";
              }}
            />
            <Stack direction="row" spacing={1.5} sx={{ mt: 1.5, flexWrap: "wrap" }}>
              <Button onClick={applyJson} variant="outlined" sx={{ borderColor: alpha(VIOLET, 0.4), color: VIOLET }}>
                Apply JSON
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outlined"
                startIcon={<Upload sx={{ fontSize: 16 }} />}
                sx={{ borderColor: alpha(VIOLET, 0.4), color: VIOLET }}
              >
                Import file
              </Button>
              <Button
                onClick={exportJson}
                variant="outlined"
                startIcon={<Download sx={{ fontSize: 16 }} />}
                sx={{ borderColor: alpha(VIOLET, 0.4), color: VIOLET }}
              >
                Export JSON
              </Button>
            </Stack>
          </Section>

          <HoverCard
            sx={{
              p: 2,
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexWrap: "wrap",
              position: "sticky",
              bottom: -10,
              zIndex: 10,
              boxShadow: `0 6px 20px ${alpha(VIOLET, 0.1)}`,
            }}
          >
            <Button
              variant="contained"
              onClick={handleApprove}
              disabled={submitting}
              sx={{ background: violetGradient, fontWeight: 700, px: 3, "&.Mui-disabled": { background: alpha(VIOLET, 0.3), color: "#fff" } }}
            >
              {submitting
                ? "Submitting…"
                : isEdit
                  ? `Save${activateOnSubmit ? " & activate" : ""}`
                  : `Submit${activateOnSubmit ? " & activate" : " (draft)"}`}
            </Button>
            {canActivateAfterSubmit && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={activateOnSubmit}
                    onChange={(e) => setActivateOnSubmit(e.target.checked)}
                    sx={{ color: VIOLET, "&.Mui-checked": { color: VIOLET } }}
                  />
                }
                label={isEdit ? "Activate after saving" : "Activate immediately"}
              />
            )}
            <Box sx={{ flexGrow: 1 }} />
            <Button color="inherit" onClick={() => navigate(`/admin/class/${classID}/experiments`)}>
              Cancel
            </Button>
          </HoverCard>
        </Stack>

        <ExperimentAssistant />
      </Box>
    </ExperimentTheme>
  );
};

export default ExperimentForm;
