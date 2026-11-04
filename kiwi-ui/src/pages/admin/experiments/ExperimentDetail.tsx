import ExpandMoreIcon from "@mui/icons-material/ExpandMoreOutlined";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import {
  ChatBubbleOutlined as MessageSquare,
  DownloadOutlined as Download,
  EditOutlined as Pencil,
  GroupOutlined as Users,
  ScienceOutlined as FlaskConical,
} from "@mui/icons-material";
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Experiment,
  experimentApi,
  exportableConfig,
  SystemPromptDefaults,
  Variant,
} from "../../../utils/experimentApi.ts";
import ExperimentAssistant from "./ExperimentAssistant.tsx";
import { computeGroups, isReproducibleStrategy } from "./grouping.ts";
import { HoverCard, PageHeader, PROMPT_FIELDS, StatusChip } from "./experimentUi.tsx";

const StatPill: React.FC<{ icon: React.ReactNode; label: string; value: number }> = ({
  icon,
  label,
  value,
}) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1,
      px: 1.5,
      py: 0.75,
      borderRadius: "var(--radius-small)",
      bgcolor: "action.hover",
    }}
  >
    <Box sx={{ color: "var(--icon-default)", display: "grid", placeItems: "center" }}>{icon}</Box>
    <Box>
      <Typography
        sx={{
          fontWeight: 600,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {label}
      </Typography>
    </Box>
  </Box>
);

const ExperimentDetail: React.FC = () => {
  const navigate = useNavigate();
  const { classID, experimentId } = useParams<{ classID: string; experimentId: string }>();
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [interactions, setInteractions] = useState<Record<string, number>>({});
  // Stable, reproducible student→group split (seeded/manual). Computed on the
  // client the same way the backend assigns, so it shows the real grouping.
  const [groups, setGroups] = useState<Record<string, string[]> | null>(null);
  // Class default prompts, to mark which variant prompts are customized.
  const [defaults, setDefaults] = useState<SystemPromptDefaults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!classID || !experimentId) return;
    try {
      setLoading(true);
      setError(null);
      const [exp, assignmentCounts, stats, roster, promptDefaults] = await Promise.all([
        experimentApi.get(classID, experimentId),
        experimentApi.assignmentCounts(classID, experimentId).catch(() => []),
        experimentApi.analytics(classID, experimentId).catch(() => []),
        experimentApi.roster(classID).catch(() => []),
        experimentApi.defaults(classID).catch(() => null),
      ]);
      setDefaults(promptDefaults);
      setExperiment(exp);
      const map: Record<string, number> = {};
      assignmentCounts.forEach((c) => (map[c.variantKey] = c.count));
      setCounts(map);
      const imap: Record<string, number> = {};
      stats.forEach((s) => (imap[s.variantKey] = s.interactions));
      setInteractions(imap);
      setGroups(
        isReproducibleStrategy(exp.config)
          ? await computeGroups(exp.config, roster)
          : null,
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [classID, experimentId]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleExport = async () => {
    if (!classID || !experimentId) return;
    try {
      // Strip the per-student group detail (members); keep the seed so a
      // seeded split stays reproducible on re-import.
      const cfg = exportableConfig(
        await experimentApi.exportConfig(classID, experimentId),
      );
      const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cfg.name || "experiment"}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading)
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  if (!experiment)
    return <Alert severity="error" sx={{ m: 4 }}>{error || "Not found"}</Alert>;

  const cfg = experiment.config;
  const assignmentLabel =
    cfg.assignment.strategy === "deterministic_hash"
      ? "Seeded split"
      : cfg.assignment.strategy === "random"
        ? "Random on first chat"
        : "Manual lists";
  const assignmentSubtitle =
    cfg.assignment.strategy === "deterministic_hash"
      ? `${assignmentLabel} · seed "${cfg.assignment.seed}" · by ${cfg.assignment.unit}`
      : `${assignmentLabel} · by ${cfg.assignment.unit}`;

  // How many of a variant's prompts differ from the class defaults (mirrors the
  // edit form's "N customized" chip).
  const customizedCount = (v: Variant) =>
    defaults
      ? PROMPT_FIELDS.filter(
          (f) => (v.config.systemPrompts?.[f.key] ?? "") !== (defaults[f.key] ?? ""),
        ).length
      : 0;

  // Collapsible sub-section style shared by the two accordions in each card:
  // the theme draws the accordion's hairline and sheet radius.
  const accordionSx = {
    mt: 1.5,
    overflow: "hidden",
  } as const;

  return (
    <>
      <Box sx={{ px: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 }, pb: 4, maxWidth: 920, mx: "auto" }}>
        <PageHeader
          icon={<FlaskConical />}
          title={experiment.name}
          subtitle={assignmentSubtitle}
          status={<StatusChip status={experiment.status} />}
          onBack={() => navigate(`/admin/class/${classID}/experiments`)}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
          <Button
            variant="outlined"
            startIcon={<Pencil sx={{ fontSize: 16 }} />}
            onClick={() => navigate(`/admin/class/${classID}/experiments/${experimentId}/edit`)}
          >
            Edit
          </Button>
          {experiment.status === "draft" && (
            <Button variant="contained" onClick={() => act(() => experimentApi.activate(classID!, experimentId!))}>
              Activate
            </Button>
          )}
          {experiment.status === "completed" && (
            <Button variant="contained" onClick={() => act(() => experimentApi.activate(classID!, experimentId!))}>
              Re-activate
            </Button>
          )}
          {experiment.status === "active" && (
            <Button variant="outlined" color="error" onClick={() => act(() => experimentApi.complete(classID!, experimentId!))}>
              Turn off
            </Button>
          )}
          <Button variant="outlined" startIcon={<Download sx={{ fontSize: 16 }} />} onClick={handleExport}>
            Export JSON
          </Button>
        </Stack>

        {experiment.description && (
          <Typography
            sx={{
              color: "text.secondary",
              mb: 3
            }}>
            {experiment.description}
          </Typography>
        )}

        <Typography
          variant="overline"
          sx={{
            color: "text.secondary",
          }}>
          Variants · {cfg.variants.length}
        </Typography>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          {cfg.variants.map((v) => (
            <Box key={v.key}>
              <HoverCard sx={{ p: 2.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                  <Typography sx={{
                    fontWeight: 600
                  }}>{v.label}</Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontFamily: "var(--font-mono)"
                    }}>
                    {v.key}
                  </Typography>
                  <Chip
                    size="small"
                    label={v.config.engine}
                    sx={{ height: 22 }}
                  />
                  <Box sx={{ flexGrow: 1 }} />
                  <Chip
                    size="small"
                    label={`${Math.round(v.allocation * 100)}%`}
                    sx={{ height: 22, fontVariantNumeric: "tabular-nums" }}
                  />
                </Box>

                <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                  <StatPill
                    icon={<Users sx={{ fontSize: 16 }} />}
                    label="students"
                    value={groups ? (groups[v.key]?.length ?? 0) : counts[v.key] ?? 0}
                  />
                  <StatPill icon={<MessageSquare sx={{ fontSize: 16 }} />} label="chats" value={interactions[v.key] ?? 0} />
                </Stack>

                {groups && (
                  <Accordion disableGutters elevation={0} sx={accordionSx}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", pr: 1 }}>
                        <Users sx={{ fontSize: 16, color: "var(--icon-default)" }} />
                        <Typography variant="body2" sx={{
                          fontWeight: 600
                        }}>
                          Students in this group
                        </Typography>
                        <Box sx={{ flexGrow: 1 }} />
                        <Chip
                          size="small"
                          label={`${groups[v.key]?.length ?? 0} students`}
                          sx={{ height: 22, fontVariantNumeric: "tabular-nums" }}
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
                      {(groups[v.key]?.length ?? 0) > 0 ? (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                          {groups[v.key].map((email) => (
                            <Chip key={email} size="small" label={email} sx={{ height: 22 }} />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" sx={{
                          color: "text.secondary"
                        }}>
                          No students
                        </Typography>
                      )}
                    </AccordionDetails>
                  </Accordion>
                )}

                <Accordion disableGutters elevation={0} sx={accordionSx}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", pr: 1 }}>
                      <MessageSquare sx={{ fontSize: 16, color: "var(--icon-default)" }} />
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
                            sx={{ height: 22 }}
                          />
                        );
                      })()}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    <Stack spacing={2}>
                      {PROMPT_FIELDS.map((f) => {
                        const value = v.config.systemPrompts?.[f.key] || "";
                        const isCustom = defaults
                          ? value !== (defaults[f.key] || "")
                          : false;
                        return (
                          <Box key={f.key}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.75 }}>
                              <Typography variant="caption" sx={{
                                fontWeight: 600
                              }}>
                                {f.label}
                              </Typography>
                              <Typography variant="caption" sx={{
                                color: "text.secondary"
                              }}>
                                · {f.caption}
                              </Typography>
                              <Box sx={{ flexGrow: 1 }} />
                              <Chip
                                size="small"
                                label={isCustom ? "Customized" : "Default"}
                                sx={{
                                  height: 18,
                                  fontSize: "var(--type-caption-size)",
                                }}
                              />
                            </Box>
                            {/* Read-only text: the read-only field's fill and edge. */}
                            <Typography
                              variant="body2"
                              sx={{
                                whiteSpace: "pre-wrap",
                                p: 1.25,
                                borderRadius: "var(--field-radius)",
                                bgcolor: "var(--field-variant-read-only-fill)",
                                border: "1px solid var(--field-variant-read-only-border)",
                                color: value ? "text.primary" : "text.secondary",
                              }}
                            >
                              {value || "(empty — class default applies)"}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              </HoverCard>
            </Box>
          ))}
        </Stack>

        <ExperimentAssistant />
      </Box>
    </>
  );
};

export default ExperimentDetail;
