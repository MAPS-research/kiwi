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
import { HoverCard, PageHeader, StatusChip } from "./experimentUi.tsx";

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
    <>
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
            >
              New Experiment
            </Button>
          }
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : experiments.length === 0 ? (
          <Box>
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
                  bgcolor: "action.hover",
                }}
              >
                <FlaskConical sx={{ fontSize: 34, color: "var(--icon-default)" }} />
              </Box>
              <Typography variant="h6">
                No experiments yet
              </Typography>
              <Typography
                sx={{
                  color: "text.secondary",
                  mt: 0.5,
                  mb: 3,
                  maxWidth: 420,
                  mx: "auto"
                }}>
                Create one to assign students to variant groups with different chat
                configs — or ask the AI assistant to draft it for you.
              </Typography>
              <Button
                variant="contained"
                startIcon={<Plus sx={{ fontSize: 18 }} />}
                onClick={() => navigate(`/admin/class/${classID}/experiments/new`)}
              >
                Create your first experiment
              </Button>
            </HoverCard>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {experiments.map((exp) => (
              <Box key={exp.id}>
                <HoverCard
                  onClick={() => navigate(`/admin/class/${classID}/experiments/${exp.id}`)}
                  sx={{ p: 2.5 }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: "var(--radius-small)",
                        display: "grid",
                        placeItems: "center",
                        bgcolor: "action.hover",
                        flexShrink: 0,
                      }}
                    >
                      <FlaskConical sx={{ fontSize: 22, color: "var(--icon-default)" }} />
                    </Box>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography noWrap sx={{
                          fontWeight: 600
                        }}>
                          {exp.name || "Untitled experiment"}
                        </Typography>
                        <StatusChip status={exp.status} />
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.75, flexWrap: "wrap" }}>
                        <Tooltip title="Variant groups">
                          <Chip
                            size="small"
                            icon={<Users sx={{ fontSize: 13 }} />}
                            label={`${exp.config?.variants?.length ?? 0} groups`}
                            sx={{ height: 22, "& .MuiChip-icon": { color: "var(--icon-default)" } }}
                          />
                        </Tooltip>
                        {(exp.config?.variants ?? []).slice(0, 4).map((v) => (
                          <Chip
                            key={v.key}
                            size="small"
                            label={v.config?.engine}
                            sx={{
                              height: 22,
                              textTransform: "lowercase",
                            }}
                          />
                        ))}
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            ml: "auto"
                          }}>
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
                      >
                        Edit
                      </Button>
                      {exp.status === "draft" && (
                        <Button size="small" variant="outlined" onClick={() => act(() => experimentApi.activate(classID!, exp.id))}>
                          Activate
                        </Button>
                      )}
                      {exp.status === "completed" && (
                        <Button size="small" variant="outlined" onClick={() => act(() => experimentApi.activate(classID!, exp.id))}>
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
              </Box>
            ))}
          </Stack>
        )}

        <ExperimentAssistant />
      </Box>
    </>
  );
};

export default ExperimentList;
