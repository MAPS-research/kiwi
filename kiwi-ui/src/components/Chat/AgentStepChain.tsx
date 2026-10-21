import React from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import {
  Check as CheckIcon,
  WarningAmberOutlined as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  FormatListBulletedOutlined as StepsIcon,
  MoreHoriz as MoreHorizIcon,
  SearchOutlined as SearchIcon,
  CodeOutlined as CodeIcon,
  BuildOutlined as BuildIcon,
  MapOutlined as MapIcon,
  SchoolOutlined as SchoolIcon,
  OpenInNewOutlined as OpenInNewIcon,
  VisibilityOutlined as VisibilityIcon,
  TouchAppOutlined as TouchAppIcon,
  EditOutlined as EditIcon,
  InsightsOutlined as InsightsIcon,
  MenuBookOutlined as MenuBookIcon,
} from "@mui/icons-material";

/**
 * One step the agent took: a tool call, plus whatever it said on the way in.
 *
 * A multi-step turn used to render as one full chat bubble per tool — icon,
 * feedback buttons and all — so a three-tool answer pushed the actual answer off
 * screen behind a stack of "Using get_sitemap..." rows. These fold into a single
 * collapsible chain instead.
 */
export interface AgentStep {
  /** Tool name as the backend narrated it, e.g. "get_sitemap". */
  toolName: string | null;
  /** Anything the agent said before calling the tool ("I'll open analytics..."). */
  thinking?: string;
  status: "running" | "complete";
}

/**
 * The backend narrates each tool call by appending "Using <tool>..." to the
 * assistant bubble it is streaming. One browser round-trip = one such bubble, so
 * a multi-step turn arrives as a RUN of them — which is why a three-tool answer
 * rendered as three full bubbles with three sets of feedback buttons.
 *
 * Anchored at the END because that is where the backend appends it, and the tool
 * token is identifier-shaped: an answer that happens to say "using recursion..."
 * mid-sentence must not be mistaken for a tool step.
 *
 * Typed structurally rather than against ChatMessage so the chain module stays
 * free of a circular import back into ChatMessages.
 */
const AGENT_STEP_MARKER = /\n?\s*Using\s+([\w.-]+)\.\.\.\s*$/;

export interface NarratableMessage {
  isAi: boolean;
  content: string;
  typing?: boolean;
  error?: boolean;
}

export const agentStepOf = (message: NarratableMessage): AgentStep | null => {
  if (!message.isAi || message.typing || message.error) return null;
  const match = message.content?.match(AGENT_STEP_MARKER);
  if (!match || match.index === undefined) return null;
  return {
    toolName: match[1],
    thinking: message.content.slice(0, match.index).trim() || undefined,
    status: "complete",
  };
};

/**
 * Fold one streamed frame into the turn's step list.
 *
 * Frames repeat for the same tool while the agent narrates into the bubble, so a
 * matching in-flight step is refreshed — its thinking text grows live — rather
 * than appended, which would show one call as N steps. A different tool means the
 * previous one finished.
 */
export const foldAgentStep = (
  steps: AgentStep[],
  botResponse: string,
  streaming?: string,
): AgentStep[] => {
  let next = steps;
  const step = agentStepOf({ isAi: true, content: botResponse ?? "" });

  if (step) {
    const last = next[next.length - 1];
    if (last && last.toolName === step.toolName && last.status === "running") {
      next = [...next.slice(0, -1), { ...last, thinking: step.thinking ?? last.thinking }];
    } else {
      next = [
        ...next.map((s) => ({ ...s, status: "complete" as const })),
        { ...step, status: "running" as const },
      ];
    }
  } else if (botResponse?.trim() && next.some((s) => s.status === "running")) {
    // A frame of text with no tool call: the answer (or new narration) has begun, so
    // the step before it has finished. The backend overwrites the narration with the
    // answer and sends no step end, which left a server-side search "running" while
    // the answer streamed (and the status line naming it instead of "Jotting it down…").
    next = next.map((s) => (s.status === "running" ? { ...s, status: "complete" as const } : s));
  }

  if (streaming === "stop") {
    next = next.map((s) => ({ ...s, status: "complete" as const }));
  }
  return next;
};

export interface AgentStepChainProps {
  steps: AgentStep[];
  /** The turn is still in flight — keep the chain open and animated. */
  running: boolean;
}

const TOOL_ICONS: { match: RegExp; icon: React.ReactElement; label: string }[] = [
  { match: /sitemap/i, icon: <MapIcon fontSize="inherit" />, label: "Checking the page list" },
  { match: /list_classes/i, icon: <SchoolIcon fontSize="inherit" />, label: "Looking up your classes" },
  { match: /navigate/i, icon: <OpenInNewIcon fontSize="inherit" />, label: "Opening a page for you" },
  { match: /open_material/i, icon: <MenuBookIcon fontSize="inherit" />, label: "Opening class materials for you" },
  { match: /observe/i, icon: <VisibilityIcon fontSize="inherit" />, label: "Reading this page" },
  { match: /click/i, icon: <TouchAppIcon fontSize="inherit" />, label: "Clicking for you" },
  { match: /fill/i, icon: <EditIcon fontSize="inherit" />, label: "Filling in a field for you" },
  { match: /analytics/i, icon: <InsightsIcon fontSize="inherit" />, label: "Reading class analytics" },
  { match: /rag|search/i, icon: <SearchIcon fontSize="inherit" />, label: "Searching materials" },
  { match: /code|interpreter/i, icon: <CodeIcon fontSize="inherit" />, label: "Running code" },
];

/** A tool's own name in sentence case ("search_papers" → "Search papers"). */
const sentenceCase = (toolName: string) => {
  const words = toolName.split(/[\s_-]+/).filter(Boolean).map((w) => w.toLowerCase());
  if (!words.length) return toolName;
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  return words.join(" ");
};

const describe = (toolName: string | null) => {
  if (!toolName) {
    return { icon: <MoreHorizIcon fontSize="inherit" />, label: "Working…" };
  }
  const hit = TOOL_ICONS.find((t) => t.match.test(toolName));
  if (hit) return { icon: hit.icon, label: hit.label };
  return { icon: <BuildIcon fontSize="inherit" />, label: sentenceCase(toolName) };
};

/** The words for a step: what the chain shows, and what the status line builds on. */
export const stepLabel = (toolName: string | null) => describe(toolName).label;

/**
 * The same tool repeating back-to-back is the signature of an agent going in
 * circles. Showing "Reading the sitemap ×3" makes that legible at a glance
 * instead of burying it in a wall of identical rows.
 */
const collapseRepeats = (steps: AgentStep[]) => {
  const out: (AgentStep & { repeats: number })[] = [];
  for (const step of steps) {
    const last = out[out.length - 1];
    if (last && last.toolName === step.toolName && !step.thinking && !last.thinking) {
      last.repeats += 1;
      last.status = step.status;
      continue;
    }
    out.push({ ...step, repeats: 1 });
  }
  return out;
};

/**
 * The step in flight. The chat's status line already moves while Kiwi works, and
 * one thing moves at a time, so the chain marks the running step with a still
 * ellipsis instead of animated dots.
 */
const WorkingDots: React.FC = () => (
  <Box component="span" aria-label="Still working" role="img" sx={{ ml: 0.25, color: "var(--in-progress-text)" }}>
    …
  </Box>
);

export const AgentStepChain: React.FC<AgentStepChainProps> = ({ steps, running }) => {
  // Open while working so progress is visible; fold away once the answer lands.
  // A deliberate click wins over both.
  const [override, setOverride] = React.useState<boolean | null>(null);
  const expanded = override ?? running;

  const rows = collapseRepeats(steps);
  const toolCount = steps.filter((s) => s.toolName).length;
  const looping = rows.some((r) => r.repeats > 2);

  const summary = running
    ? "Working…"
    : `${toolCount} step${toolCount === 1 ? "" : "s"}`;

  return (
    <Box sx={{ mb: "var(--tutor-message-block-gap)" }}>
      <ButtonBase
        onClick={() => setOverride(!expanded)}
        aria-expanded={expanded}
        aria-label={expanded ? "Hide Kiwi's steps" : "Show Kiwi's steps"}
        sx={{
          justifyContent: "flex-start",
          gap: "var(--space-2)",
          minHeight: "var(--tutor-message-toolbar-line)",
          borderRadius: "var(--radius-small)",
          textAlign: "left",
          color: "var(--text-secondary)",
          "&:hover": { color: "var(--text)" },
        }}
      >
        <StepsIcon aria-hidden sx={{ fontSize: "var(--size-icon-sm)", color: "var(--icon-default)" }} />

        <Typography variant="body2" component="span" sx={{ fontWeight: "var(--weight-semibold)", color: "inherit" }}>
          {summary}
          {looping && !running && (
            <Typography
              component="span"
              variant="caption"
              sx={{ ml: 1, color: "var(--status-warning-text)" }}
            >
              repeated steps
            </Typography>
          )}
        </Typography>

        <ExpandMoreIcon
          aria-hidden
          sx={{
            fontSize: "var(--size-icon-sm)",
            color: "var(--icon-default)",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </ButtonBase>

      {expanded && (
        <Box sx={{ pt: "var(--space-2)" }}>
          {rows.map((step, i) => {
            const { icon, label } = describe(step.toolName);
            const isLast = i === rows.length - 1;
            return (
              <Box key={i} sx={{ display: "flex", gap: "var(--space-3)", position: "relative" }}>
                {/* rail */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <Box
                    aria-hidden
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      bgcolor: "var(--surface)",
                      border: "1px solid",
                      borderColor: step.status === "running" ? "var(--border-interactive)" : "var(--border)",
                      color: step.status === "running" ? "var(--text)" : "var(--icon-default)",
                    }}
                  >
                    {icon}
                  </Box>
                  {!isLast && (
                    <Box sx={{ width: "1px", flexGrow: 1, minHeight: 12, bgcolor: "var(--border-subtle)" }} />
                  )}
                </Box>

                <Box sx={{ pb: isLast ? 0 : 1, minWidth: 0, flexGrow: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <Typography variant="body2" sx={{ color: "var(--text)" }}>
                      {label}
                    </Typography>
                    {step.repeats > 1 && (
                      <Typography
                        variant="caption"
                        sx={{
                          px: 0.75,
                          borderRadius: "var(--radius-small)",
                          fontVariantNumeric: "tabular-nums",
                          bgcolor: step.repeats > 2 ? "var(--status-warning-surface)" : "var(--surface-active)",
                          color: step.repeats > 2 ? "var(--status-warning-text)" : "var(--text-secondary)",
                        }}
                      >
                        ×{step.repeats}
                      </Typography>
                    )}
                    {step.status === "running" ? (
                      <WorkingDots />
                    ) : (
                      <CheckIcon aria-hidden sx={{ fontSize: 14, color: "var(--icon-default)" }} />
                    )}
                  </Box>
                  {step.thinking && (
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        color: "var(--text-secondary)",
                        whiteSpace: "pre-wrap",
                        mt: 0.25,
                      }}
                    >
                      {step.thinking}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}

          {looping && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 1 }}>
              <WarningIcon aria-hidden sx={{ fontSize: 14, color: "var(--status-warning-text)" }} />
              <Typography variant="caption" sx={{ color: "var(--text-secondary)" }}>
                Kiwi repeated this step. It may be stuck.
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default AgentStepChain;
