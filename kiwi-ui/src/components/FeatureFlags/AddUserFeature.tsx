import React, { useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { AddOutlined, PersonOutlined } from "@mui/icons-material";
import {
  AddFeatureRequest,
  AddFeatureRequestFeatureNameEnum,
} from "../../services/models/index.ts";
import apiClient from "../../utils/api.ts";

interface AddUserFeatureProps {
  onAdded?: () => void;
}

const AddUserFeature: React.FC<AddUserFeatureProps> = ({ onAdded }) => {
  const [userId, setUserId] = useState("");
  const [featureName, setFeatureName] =
    useState<AddFeatureRequestFeatureNameEnum>();
  const [validUntil, setValidUntil] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    severity: "success" | "error";
    message: string;
  } | null>(null);

  const addUserFeature = async () => {
    if (!featureName || !userId.trim()) return;

    const request: AddFeatureRequest = {
      featureName,
      targetId: userId.trim(),
      validUntil: validUntil ?? undefined,
    };

    setSubmitting(true);
    try {
      await apiClient.featureFlagsControllerAddUserFeature({
        addFeatureRequest: request,
      });
      setUserId("");
      setFeatureName(undefined);
      setValidUntil(null);
      onAdded?.();
      setFeedback({ severity: "success", message: "User feature flag added." });
    } catch (error: any) {
      setFeedback({
        severity: "error",
        message: error.message || "Unable to add the user feature flag.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Card variant="outlined" sx={{ height: "100%", borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1.5} sx={{
              alignItems: "flex-start"
            }}>
              <PersonOutlined color="action" />
              <div>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  User access
                </Typography>
                <Typography variant="body2" sx={{
                  color: "text.secondary"
                }}>
                  Enable a feature for one specific user.
                </Typography>
              </div>
            </Stack>

            <TextField
              label="User ID"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              fullWidth
            />

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
              onClick={addUserFeature}
              disabled={!featureName || !userId.trim() || submitting}
              sx={{ alignSelf: "flex-start" }}
            >
              {submitting ? "Adding…" : "Add user flag"}
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

export default AddUserFeature;
