import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { AddOutlined, SchoolOutlined } from "@mui/icons-material";
import {
  AddFeatureRequest,
  AddFeatureRequestFeatureNameEnum,
} from "../../services/models/index.ts";
import apiClient from "../../utils/api.ts";

interface AddClassFeatureProps {
  classes: string[];
  fetchClassFeatures: (classId: string) => void;
  hideClassSelection?: boolean;
}

const AddClassFeature: React.FC<AddClassFeatureProps> = ({
  classes,
  fetchClassFeatures,
  hideClassSelection = false,
}) => {
  const [classId, setClassId] = useState(
    hideClassSelection && classes.length > 0 ? classes[0] : "",
  );
  const [featureName, setFeatureName] =
    useState<AddFeatureRequestFeatureNameEnum>();
  const [validUntil, setValidUntil] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    severity: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (hideClassSelection && classes[0]) {
      setClassId(classes[0]);
    }
  }, [classes, hideClassSelection]);

  const addClassFeature = async () => {
    if (!featureName || !classId) return;

    const request: AddFeatureRequest = {
      featureName,
      targetId: classId,
      validUntil: validUntil ?? undefined,
    };

    setSubmitting(true);
    try {
      await apiClient.featureFlagsControllerAddClassFeature({
        addFeatureRequest: request,
      });
      await fetchClassFeatures(classId);
      setFeatureName(undefined);
      setValidUntil(null);
      setFeedback({ severity: "success", message: "Class feature flag added." });
    } catch (error: any) {
      setFeedback({
        severity: "error",
        message: error.message || "Unable to add the class feature flag.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Card variant="outlined" sx={{ height: "100%" }}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1.5} sx={{
              alignItems: "flex-start"
            }}>
              <SchoolOutlined color="action" />
              <div>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Class access
                </Typography>
                <Typography variant="body2" sx={{
                  color: "text.secondary"
                }}>
                  Enable a feature for every member of a class.
                </Typography>
              </div>
            </Stack>

            {!hideClassSelection ? (
              <TextField
                select
                label="Class"
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
                fullWidth
              >
                {classes.map((id) => (
                  <MenuItem key={id} value={id}>
                    {id}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <Stack direction="row" spacing={1} sx={{
                alignItems: "center"
              }}>
                <Typography variant="body2" sx={{
                  color: "text.secondary"
                }}>
                  Target
                </Typography>
                <Chip label={classes[0]} size="small" variant="outlined" />
              </Stack>
            )}

            <TextField
              select
              label="Feature"
              value={featureName ?? ""}
              onChange={(event) =>
                setFeatureName(event.target.value as AddFeatureRequestFeatureNameEnum)
              }
              fullWidth
            >
              {Object.values(AddFeatureRequestFeatureNameEnum).map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Expiration (optional)"
              type="datetime-local"
              value={validUntil ? validUntil.toISOString().slice(0, -1) : ""}
              onChange={(event) =>
                setValidUntil(event.target.value ? new Date(event.target.value) : null)
              }
              helperText="Leave empty to keep the flag active indefinitely."
              fullWidth
              slotProps={{
                inputLabel: { shrink: true }
              }}
            />

            <Button
              variant="contained"
              startIcon={<AddOutlined />}
              onClick={addClassFeature}
              disabled={!featureName || !classId || submitting}
              sx={{ alignSelf: "flex-start" }}
            >
              {submitting ? "Adding…" : "Add class flag"}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={4000}
        onClose={() => setFeedback(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={feedback?.severity} onClose={() => setFeedback(null)}>
          {feedback?.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default AddClassFeature;
