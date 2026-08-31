import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  AccountTreeOutlined as GitBranch,
  AddOutlined as Plus,
  EditOutlined as Pencil,
  GroupOutlined as Users,
  ScienceOutlined as FlaskConical,
} from "@mui/icons-material";
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Experiment, experimentApi } from "../../../utils/experimentApi.ts";
import ExperimentAssistant from "./ExperimentAssistant.tsx";
import {
  ExperimentTheme,
  HoverCard,
  MotionStack,
  PageHeader,
  StatusChip,
  VIOLET,
  violetGradient,
} from "./experimentUi.tsx";

const ExperimentList: React.FC = () => {
  const navigate = useNavigate();
  const { classID } = useParams<{ classID: string }>();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!classID) return;
    try {
      setLoading(true);
      setError(null);
      setExperiments(await experimentApi.list(classID));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [classID]);

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

  return (
    <ExperimentTheme>
      <Box sx={{ px: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 }, pb: 4, maxWidth: 1000, mx: "auto" }}>
        <PageHeader
          icon={<GitBranch />}
          title="Learning Experiments"
          subtitle="Split students into variant groups, each with its own chat model and prompts."
          actions={
            <Button
              variant="contained"
              startIcon={<Plus sx={{ fontSize: 18 }} />}
              onClick={() => navigate(`/admin/class/${classID}/experiments/new`)}
              sx={{
                background: violetGradient,
                color: "#fff",
                fontWeight: 600,
                boxShadow: "none",
                "&:hover": { opacity: 0.92, boxShadow: "none" },
              }}
            >
              New Experiment
            </Button>
          }
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
            <CircularProgress sx={{ color: VIOLET }} />
          </Box>
        ) : experiments.length === 0 ? (
          <MotionStack delay={0.1}>
            <HoverCard sx={{ p: 6, textAlign: "center" }}>
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  mx: "auto",
                  mb: 2,
                  background: alpha(VIOLET, 0.08),
                }}
              >
                <FlaskConical sx={{ fontSize: 34, color: VIOLET }} />
              </Box>
              <Typography variant="h6" fontWeight={700}>
                No experiments yet
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3, maxWidth: 420, mx: "auto" }}>
                Create one to assign students to variant groups with different chat
                configs — or ask the AI assistant to draft it for you.
              </Typography>
              <Button
                variant="contained"
                startIcon={<Plus sx={{ fontSize: 18 }} />}
                onClick={() => navigate(`/admin/class/${classID}/experiments/new`)}
                sx={{ background: violetGradient, fontWeight: 600 }}
              >
                Create your first experiment
              </Button>
            </HoverCard>
          </MotionStack>
        ) : (
          <Stack spacing={1.5}>
            {experiments.map((exp, i) => (
              <MotionStack key={exp.id} delay={i * 0.06}>
                <HoverCard
                  onClick={() => navigate(`/admin/class/${classID}/experiments/${exp.id}`)}
                  sx={{ p: 2.5 }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2.5,
                        display: "grid",
                        placeItems: "center",
                        background: alpha(VIOLET, 0.08),
                        flexShrink: 0,
                      }}
                    >
                      <FlaskConical sx={{ fontSize: 22, color: VIOLET }} />
                    </Box>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography fontWeight={700} noWrap>
                          {exp.name || "Untitled experiment"}
                        </Typography>
                        <StatusChip status={exp.status} onLight />
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.75, flexWrap: "wrap" }}>
                        <Tooltip title="Variant groups">
                          <Chip
                            size="small"
                            icon={<Users sx={{ fontSize: 13 }} />}
                            label={`${exp.config?.variants?.length ?? 0} groups`}
                            sx={{ height: 22, bgcolor: alpha(VIOLET, 0.06), color: "text.secondary", "& .MuiChip-icon": { color: "text.secondary" } }}
                          />
                        </Tooltip>
                        {(exp.config?.variants ?? []).slice(0, 4).map((v) => (
                          <Chip
                            key={v.key}
                            size="small"
                            label={v.config?.engine}
                            sx={{
                              height: 22,
                              fontWeight: 600,
                              textTransform: "lowercase",
                              bgcolor: v.config?.engine === "qwen" ? "#eef2ff" : "#ecfdf5",
                              color: v.config?.engine === "qwen" ? "#4338ca" : "#047857",
                            }}
                          />
                        ))}
                        <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                          {new Date(exp.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>
                    <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Pencil sx={{ fontSize: 14 }} />}
                        onClick={() => navigate(`/admin/class/${classID}/experiments/${exp.id}/edit`)}
                        sx={{ borderColor: alpha(VIOLET, 0.4), color: VIOLET }}
                      >
                        Edit
                      </Button>
                      {exp.status === "draft" && (
                        <Button size="small" variant="outlined" onClick={() => act(() => experimentApi.activate(classID!, exp.id))} sx={{ borderColor: alpha(VIOLET, 0.4), color: VIOLET }}>
                          Activate
                        </Button>
                      )}
                      {exp.status === "completed" && (
                        <Button size="small" variant="outlined" onClick={() => act(() => experimentApi.activate(classID!, exp.id))} sx={{ borderColor: alpha(VIOLET, 0.4), color: VIOLET }}>
                          Re-activate
                        </Button>
                      )}
                      {exp.status === "active" && (
                        <Button size="small" variant="outlined" color="error" onClick={() => act(() => experimentApi.complete(classID!, exp.id))}>
                          Turn off
                        </Button>
                      )}
                    </Stack>
                  </Box>
                </HoverCard>
              </MotionStack>
            ))}
          </Stack>
        )}

        <ExperimentAssistant />
      </Box>
    </ExperimentTheme>
  );
};

export default ExperimentList;
