import React from "react";
import {
  Box,
  ButtonBase,
  Collapse,
  CircularProgress,
  Typography,
} from "@mui/material";
import {
  AutoAwesome as AutoAwesomeIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutlined as ErrorOutlineIcon,
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  Code as CodeIcon,
  Build as BuildIcon,
  Map as MapIcon,
  School as SchoolIcon,
  OpenInNew as OpenInNewIcon,
  Visibility as VisibilityIcon,
  TouchApp as TouchAppIcon,
  Edit as EditIcon,
  Insights as InsightsIcon,
  MenuBook as MenuBookIcon,
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
  { match: /sitemap/i, icon: <MapIcon fontSize="inherit" />, label: "Reading the sitemap" },
  { match: /list_classes/i, icon: <SchoolIcon fontSize="inherit" />, label: "Looking up classes" },
  { match: /navigate/i, icon: <OpenInNewIcon fontSize="inherit" />, label: "Navigating" },
  { match: /open_material/i, icon: <MenuBookIcon fontSize="inherit" />, label: "Opening class content" },
  { match: /observe/i, icon: <VisibilityIcon fontSize="inherit" />, label: "Looking at the page" },
  { match: /click/i, icon: <TouchAppIcon fontSize="inherit" />, label: "Clicking" },
  { match: /fill/i, icon: <EditIcon fontSize="inherit" />, label: "Filling a field" },
  { match: /analytics/i, icon: <InsightsIcon fontSize="inherit" />, label: "Reading class analytics" },
  { match: /rag|search/i, icon: <SearchIcon fontSize="inherit" />, label: "Searching materials" },
  { match: /code|interpreter/i, icon: <CodeIcon fontSize="inherit" />, label: "Running code" },
];

const describe = (toolName: string | null) => {
  if (!toolName) {
    return { icon: <AutoAwesomeIcon fontSize="inherit" />, label: "Thinking" };
  }
  const hit = TOOL_ICONS.find((t) => t.match.test(toolName));
  if (hit) return { icon: hit.icon, label: hit.label };
  return {
    icon: <BuildIcon fontSize="inherit" />,
    label: toolName
      .split(/[\s_-]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" "),
  };
};

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
 * Three staggered dots for the step currently in flight. A tool call can sit for
 * seconds (a class lookup, a page navigation) with nothing else moving on screen,
 * so the row needs to say "still working" on its own.
 */
const WorkingDots: React.FC = () => (
  <Box
    component="span"
    aria-label="working"
    sx={{
      display: "inline-flex",
      alignItems: "flex-end",
      gap: "2px",
      ml: 0.25,
      "& > span": {
        width: 3,
        height: 3,
        borderRadius: "50%",
        bgcolor: "primary.main",
        animation: "kiwiStepDot 1.2s ease-in-out infinite",
      },
      "& > span:nth-of-type(2)": { animationDelay: "0.15s" },
      "& > span:nth-of-type(3)": { animationDelay: "0.3s" },
      "@keyframes kiwiStepDot": {
        "0%, 60%, 100%": { opacity: 0.25, transform: "translateY(0)" },
        "30%": { opacity: 1, transform: "translateY(-2px)" },
      },
    }}
  >
    <span />
    <span />
    <span />
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
    <Box sx={{ mb: 1 }}>
      <ButtonBase
        onClick={() => setOverride(!expanded)}
        aria-expanded={expanded}
        aria-label={expanded ? "Hide agent steps" : "Show agent steps"}
        sx={{
          justifyContent: "flex-start",
          gap: 0.75,
          py: 0.25,
          borderRadius: 1,
          textAlign: "left",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            fontSize: 18,
            color: running ? "primary.main" : "text.secondary",
            ...(running && {
              animation: "kiwiChainPulse 1.4s ease-in-out infinite",
              "@keyframes kiwiChainPulse": {
                "0%, 100%": { opacity: 1 },
                "50%": { opacity: 0.35 },
              },
            }),
          }}
        >
          <AutoAwesomeIcon fontSize="inherit" />
        </Box>

        <Typography
          variant="body2"
          sx={{ fontWeight: 500, color: "text.primary" }}
        >
          {summary}
          {looping && !running && (
            <Typography
              component="span"
              variant="caption"
              sx={{ ml: 1, color: "warning.main" }}
            >
              repeated steps
            </Typography>
          )}
        </Typography>

        <ExpandMoreIcon
          fontSize="small"
          sx={{
            color: "text.secondary",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        />

        {running && <CircularProgress size={14} thickness={5} />}
      </ButtonBase>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ pl: 0.25, pb: 0.5, pt: 0.5 }}>
          {rows.map((step, i) => {
            const { icon, label } = describe(step.toolName);
            const isLast = i === rows.length - 1;
            return (
              <Box key={i} sx={{ display: "flex", gap: 1.25, position: "relative" }}>
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
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      bgcolor: "background.paper",
                      border: 1,
                      borderColor:
                        step.status === "running" ? "primary.main" : "divider",
                      color:
                        step.status === "running" ? "primary.main" : "text.secondary",
                    }}
                  >
                    {icon}
                  </Box>
                  {!isLast && (
                    <Box sx={{ width: "1px", flexGrow: 1, minHeight: 12, bgcolor: "divider" }} />
                  )}
                </Box>

                <Box sx={{ pb: isLast ? 0 : 1, minWidth: 0, flexGrow: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <Typography variant="body2" sx={{ color: "text.primary" }}>
                      {label}
                    </Typography>
                    {step.repeats > 1 && (
                      <Typography
                        variant="caption"
                        sx={{
                          px: 0.6,
                          borderRadius: 0.75,
                          bgcolor: step.repeats > 2 ? "warning.light" : "action.selected",
                          color: step.repeats > 2 ? "warning.contrastText" : "text.secondary",
                        }}
                      >
                        ×{step.repeats}
                      </Typography>
                    )}
                    {step.status === "running" ? (
                      <WorkingDots />
                    ) : (
                      <CheckCircleIcon sx={{ fontSize: 14, color: "success.main" }} />
                    )}
                  </Box>
                  {step.thinking && (
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        color: "text.secondary",
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
              <ErrorOutlineIcon sx={{ fontSize: 14, color: "warning.main" }} />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                The same step repeated — the agent may be stuck.
              </Typography>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default AgentStepChain;
