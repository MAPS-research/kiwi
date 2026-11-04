import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { EditOutlined, RefreshOutlined } from "@mui/icons-material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { FeatureResponse, EditFeatureRequest } from "../../services/models/index.ts";
import apiClient from "../../utils/api.ts";

const isExpired = (validUntil: Date | null) =>
  Boolean(validUntil && new Date(validUntil).getTime() < Date.now());

interface ListAllFeaturesProps {
  refreshKey?: number;
}

const ListAllFeatures: React.FC<ListAllFeaturesProps> = ({ refreshKey = 0 }) => {
  const [open, setOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<FeatureResponse | null>(null);
  const [newValidUntil, setNewValidUntil] = useState<string>("");
  const [removeValidUntil, setRemoveValidUntil] = useState(false);
  const [allFeatures, setAllFeatures] = useState<FeatureResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllFeatures = async () => {
    setLoading(true);
    setError(null);
    try {
      const features = await apiClient.featureFlagsControllerListAllFeatures();
      setAllFeatures(features);
    } catch (fetchError: any) {
      setError(fetchError.message || "Unable to load feature flags.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllFeatures();
  }, [refreshKey]);

  const handleClickOpen = (feature: FeatureResponse) => {
    setSelectedFeature(feature);
    setNewValidUntil(
      feature.validUntil
        ? new Date(feature.validUntil).toISOString().slice(0, -1)
        : "",
    );
    setRemoveValidUntil(false);
    setOpen(true);
  };

  const handleClose = () => {
    if (saving) return;
    setOpen(false);
    setSelectedFeature(null);
    setNewValidUntil("");
    setRemoveValidUntil(false);
  };

  const handleSave = async () => {
    if (!selectedFeature) return;

    const request: EditFeatureRequest = {
      featureName: selectedFeature.featureName,
      targetId: selectedFeature.targetId,
      validUntil: removeValidUntil
        ? null
        : newValidUntil
          ? new Date(newValidUntil)
          : undefined,
    };

    setSaving(true);
    setError(null);
    try {
      if (selectedFeature.targetType === "user") {
        await apiClient.featureFlagsControllerEditUserFeature({
          editFeatureRequest: request,
        });
      } else if (selectedFeature.targetType === "class") {
        await apiClient.featureFlagsControllerEditClassFeature({
          editFeatureRequest: request,
        });
      }
      await fetchAllFeatures();
      setOpen(false);
      setSelectedFeature(null);
    } catch (saveError: any) {
      setError(saveError.message || "Unable to update the feature flag.");
    } finally {
      setSaving(false);
    }
  };

  const columns: GridColDef<FeatureResponse>[] = [
    {
      field: "featureName",
      headerName: "Feature",
      flex: 1,
      minWidth: 170,
      renderCell: ({ row }) => <Typography variant="body2" sx={{
        fontWeight: 600
      }}>{row.featureName}</Typography>,
    },
    {
      field: "targetType",
      headerName: "Scope",
      width: 120,
      renderCell: ({ row }) => (
        <Chip
          size="small"
          variant="outlined"
          label={row.targetType === "class" ? "Class" : "User"}
        />
      ),
    },
    {
      field: "targetId",
      headerName: "Target",
      flex: 1,
      minWidth: 190,
    },
    {
      field: "validUntil",
      headerName: "Expiration",
      flex: 1,
      minWidth: 210,
      renderCell: ({ row }) => row.validUntil ? (
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <Typography variant="body2">
            {new Date(row.validUntil).toLocaleString()}
          </Typography>
          {isExpired(row.validUntil) && <Chip size="small" color="error" label="Expired" />}
        </Stack>
      ) : (
        <Chip size="small" color="success" variant="outlined" label="No expiration" />
      ),
    },
    {
      field: "actions",
      headerName: "",
      width: 100,
      sortable: false,
      filterable: false,
      align: "right",
      renderCell: ({ row }) => (
        <Button
          size="small"
          variant="text"
          startIcon={<EditOutlined />}
          onClick={() => handleClickOpen(row)}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <>
      <Card variant="outlined">
        <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
              p: 3,
              pb: 2
            }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Active assignments
              </Typography>
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                Review scopes, targets, and expiration dates for all feature flags.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<RefreshOutlined />}
              onClick={fetchAllFeatures}
              disabled={loading}
            >
              Refresh
            </Button>
          </Stack>

          {error && <Alert severity="error" sx={{ mx: 3, mb: 2 }}>{error}</Alert>}

          <DataGrid
            autoHeight
            loading={loading}
            rows={allFeatures}
            columns={columns}
            getRowId={(row) => `${row.targetType}-${row.targetId}-${row.featureName}`}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            sx={{
              border: 0,
              borderTop: "1px solid",
              borderColor: "divider",
              "& .MuiDataGrid-columnHeaders": { bgcolor: "action.hover" },
              "& .MuiDataGrid-cell": { alignItems: "center" },
            }}
          />
        </CardContent>
      </Card>

      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>Edit expiration</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            Update how long {selectedFeature?.featureName} remains available for {selectedFeature?.targetId}.
          </DialogContentText>
          <TextField
            label="Expiration"
            type="datetime-local"
            fullWidth
            value={newValidUntil}
            onChange={(event) => setNewValidUntil(event.target.value)}
            disabled={removeValidUntil}
            slotProps={{
              inputLabel: { shrink: true }
            }}
          />
          <FormControlLabel
            sx={{ mt: 1 }}
            control={(
              <Checkbox
                checked={removeValidUntil}
                onChange={(event) => setRemoveValidUntil(event.target.checked)}
              />
            )}
            label="Keep active without an expiration"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ListAllFeatures;
