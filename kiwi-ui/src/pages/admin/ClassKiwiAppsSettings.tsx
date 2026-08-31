import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Skeleton,
  Snackbar,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  AddOutlined as AddIcon,
  DeleteOutline as DeleteIcon,
  EditOutlined as EditIcon,
  RefreshOutlined as RefreshIcon,
  DragIndicatorOutlined as DragIcon,
  ArrowUpwardOutlined as ArrowUpIcon,
  ArrowDownwardOutlined as ArrowDownIcon,
  SecurityOutlined as SecurityIcon,
} from "@mui/icons-material";
import { useParams } from "react-router-dom";
import { classAppsApiClient, kiwiAppsApiClient } from "../../utils/api";
import type {
  ClassAppResponseDto,
  ClassAppScopesResponseDto,
  AppResponseDto,
} from "../../services/models";
import { AdminPage, AdminPageHeader } from "../../components/AdminPage/index.ts";

export const ClassKiwiAppsSettings: React.FC = () => {
  const { classID } = useParams<{ classID: string }>();

  // Enabled apps for this class
  const [enabledApps, setEnabledApps] = useState<ClassAppResponseDto[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);

  // Available apps (for enable modal)
  const [availableApps, setAvailableApps] = useState<AppResponseDto[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);

  // Enable modal state
  const [enableModalOpen, setEnableModalOpen] = useState(false);
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
  const [enabling, setEnabling] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<ClassAppResponseDto | null>(null);
  const [editTabLabel, setEditTabLabel] = useState("");
  const [saving, setSaving] = useState(false);

  // Scopes state for edit dialog
  const [editScopes, setEditScopes] = useState<ClassAppScopesResponseDto | null>(null);
  const [loadingScopes, setLoadingScopes] = useState(false);
  const [editEnabledScopes, setEditEnabledScopes] = useState<string[]>([]);

  // Disable dialog state
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [appToDisable, setAppToDisable] = useState<ClassAppResponseDto | null>(null);
  const [disabling, setDisabling] = useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Fetch enabled apps for this class
  const fetchEnabledApps = async () => {
    if (!classID) return;
    try {
      setLoadingApps(true);
      const data = await classAppsApiClient.classKiwiAppControllerGetClassApps({
        classId: classID,
      });
      // Sort by tabOrder
      data.sort((a, b) => a.tabOrder - b.tabOrder);
      setEnabledApps(data);
    } catch (error) {
      console.error("Error fetching enabled apps:", error);
      showSnackbar("Failed to load enabled apps", "error");
    } finally {
      setLoadingApps(false);
    }
  };

  // Fetch all available registered apps
  const fetchAvailableApps = async () => {
    try {
      setLoadingAvailable(true);
      const data = await kiwiAppsApiClient.kiwiAppControllerListApps({
        includeInactive: false,
      });
      setAvailableApps(data);
    } catch (error) {
      console.error("Error fetching available apps:", error);
      showSnackbar("Failed to load available apps", "error");
    } finally {
      setLoadingAvailable(false);
    }
  };

  useEffect(() => {
    fetchEnabledApps();
  }, [classID]);

  // Open enable modal
  const handleOpenEnableModal = async () => {
    await fetchAvailableApps();
    // Pre-select already enabled apps
    const enabledIds = new Set(enabledApps.map((a) => a.appId));
    setSelectedApps(enabledIds);
    setEnableModalOpen(true);
  };

  const handleCloseEnableModal = () => {
    setEnableModalOpen(false);
    setSelectedApps(new Set());
  };

  const handleToggleApp = (appId: string) => {
    setSelectedApps((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }
      return next;
    });
  };

  const handleSaveEnablements = async () => {
    if (!classID) return;

    try {
      setEnabling(true);

      const currentlyEnabled = new Set(enabledApps.map((a) => a.appId));

      // Apps to enable (in selected but not currently enabled)
      const toEnable = [...selectedApps].filter((id) => !currentlyEnabled.has(id));

      // Apps to disable (in currently enabled but not selected)
      const toDisable = [...currentlyEnabled].filter((id) => !selectedApps.has(id));

      // Enable new apps
      for (const appId of toEnable) {
        await classAppsApiClient.classKiwiAppControllerEnableClassApp({
          classId: classID,
          enableClassAppDto: {
            appId,
            tabOrder: enabledApps.length + toEnable.indexOf(appId),
          },
        });
      }

      // Disable removed apps
      for (const appId of toDisable) {
        await classAppsApiClient.classKiwiAppControllerDisableClassApp({
          classId: classID,
          appId,
        });
      }

      await fetchEnabledApps();
      showSnackbar("App assignments updated successfully", "success");
      handleCloseEnableModal();
    } catch (error) {
      console.error("Error updating app assignments:", error);
      showSnackbar("Failed to update app assignments", "error");
    } finally {
      setEnabling(false);
    }
  };

  // Edit app config
  const handleEditClick = async (app: ClassAppResponseDto) => {
    setEditingApp(app);
    setEditTabLabel(app.tabLabel || "");
    setEditScopes(null);
    setEditEnabledScopes([]);
    setEditDialogOpen(true);

    // Fetch scopes for this app in this class
    if (!classID) return;
    try {
      setLoadingScopes(true);
      const scopes = await classAppsApiClient.classKiwiAppControllerGetClassAppScopes({
        classId: classID,
        appSlug: app.slug,
      });
      setEditScopes(scopes);
      // Initialize enabled scopes from current settings
      setEditEnabledScopes(scopes.enabledScopes || []);
    } catch (error) {
      console.error("Error fetching scopes:", error);
      // Don't show error - scopes may not be configured for this app
    } finally {
      setLoadingScopes(false);
    }
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingApp(null);
    setEditTabLabel("");
    setEditScopes(null);
    setEditEnabledScopes([]);
  };

  const handleSaveEdit = async () => {
    if (!classID || !editingApp) return;

    try {
      setSaving(true);
      await classAppsApiClient.classKiwiAppControllerUpdateClassApp({
        classId: classID,
        appId: editingApp.appId,
        updateClassAppDto: {
          tabLabel: editTabLabel || undefined,
          // Only include enabledScopes if we have scopes data
          enabledScopes: editScopes ? editEnabledScopes : undefined,
        },
      });

      await fetchEnabledApps();
      showSnackbar("App updated successfully", "success");
      handleCloseEditDialog();
    } catch (error) {
      console.error("Error updating app:", error);
      showSnackbar("Failed to update app", "error");
    } finally {
      setSaving(false);
    }
  };

  // Toggle a scope in the enabled list
  const handleToggleScope = (scope: string) => {
    setEditEnabledScopes((prev) => {
      if (prev.includes(scope)) {
        return prev.filter((s) => s !== scope);
      } else {
        return [...prev, scope];
      }
    });
  };

  // Disable app
  const handleDisableClick = (app: ClassAppResponseDto) => {
    setAppToDisable(app);
    setDisableDialogOpen(true);
  };

  const handleConfirmDisable = async () => {
    if (!classID || !appToDisable) return;

    try {
      setDisabling(true);
      await classAppsApiClient.classKiwiAppControllerDisableClassApp({
        classId: classID,
        appId: appToDisable.appId,
      });

      setEnabledApps((prev) => prev.filter((a) => a.id !== appToDisable.id));
      showSnackbar("App disabled successfully", "success");
      setDisableDialogOpen(false);
      setAppToDisable(null);
    } catch (error) {
      console.error("Error disabling app:", error);
      showSnackbar("Failed to disable app", "error");
    } finally {
      setDisabling(false);
    }
  };

  // Reorder apps
  const handleMoveUp = async (index: number) => {
    if (index === 0 || !classID) return;

    const newOrder = [...enabledApps];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];

    try {
      await classAppsApiClient.classKiwiAppControllerReorderClassApps({
        classId: classID,
        reorderClassAppsDto: {
          appIds: newOrder.map((a) => a.appId),
        },
      });

      setEnabledApps(newOrder);
      showSnackbar("App order updated", "success");
    } catch (error) {
      console.error("Error reordering apps:", error);
      showSnackbar("Failed to reorder apps", "error");
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === enabledApps.length - 1 || !classID) return;

    const newOrder = [...enabledApps];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];

    try {
      await classAppsApiClient.classKiwiAppControllerReorderClassApps({
        classId: classID,
        reorderClassAppsDto: {
          appIds: newOrder.map((a) => a.appId),
        },
      });

      setEnabledApps(newOrder);
      showSnackbar("App order updated", "success");
    } catch (error) {
      console.error("Error reordering apps:", error);
      showSnackbar("Failed to reorder apps", "error");
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "productivity":
        return "primary";
      case "analytics":
        return "secondary";
      case "communication":
        return "info";
      case "visualization":
        return "success";
      default:
        return "default";
    }
  };

  return (
    <AdminPage>
      <AdminPageHeader
        title="Kiwi Apps"
        description="Manage which apps are available for students in this class."
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchEnabledApps}
              disabled={loadingApps}
            >
              Refresh
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenEnableModal}>
              Enable Apps
            </Button>
          </>
        }
      />

      {loadingApps ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order</TableCell>
                <TableCell>App</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Capabilities</TableCell>
                <TableCell>Tab Label</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[...Array(2)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : enabledApps.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Apps Enabled
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enable apps to give students access to additional tools and features in this class.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenEnableModal}
          >
            Enable Apps
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={100}>Order</TableCell>
                <TableCell>App</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Capabilities</TableCell>
                <TableCell>Tab Label</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {enabledApps.map((app, index) => (
                <TableRow key={app.id}>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <IconButton
                        size="small"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                      >
                        <ArrowUpIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === enabledApps.length - 1}
                      >
                        <ArrowDownIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {app.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {app.slug}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={app.category}
                      size="small"
                      color={getCategoryColor(app.category) as any}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                      {app.capabilities.slice(0, 3).map((cap) => (
                        <Chip key={cap} label={cap} size="small" variant="outlined" />
                      ))}
                      {app.capabilities.length > 3 && (
                        <Chip
                          label={`+${app.capabilities.length - 3}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {app.tabLabel || <em style={{ color: "#999" }}>Default</em>}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => handleEditClick(app)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Disable">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDisableClick(app)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Enable Apps Modal */}
      <Dialog
        open={enableModalOpen}
        onClose={handleCloseEnableModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Enable Apps</DialogTitle>
        <DialogContent dividers>
          {loadingAvailable ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <Typography>Loading available apps...</Typography>
            </Box>
          ) : availableApps.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                No registered apps available. Apps must be registered in the system first.
              </Typography>
            </Box>
          ) : (
            <List>
              {availableApps.map((app) => {
                const isSelected = selectedApps.has(app.id);
                return (
                  <ListItem
                    key={app.id}
                    dense
                    button
                    onClick={() => handleToggleApp(app.id)}
                  >
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={isSelected}
                        tabIndex={-1}
                        disableRipple
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          {app.name}
                          <Chip
                            label={app.category}
                            size="small"
                            color={getCategoryColor(app.category) as any}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {app.slug}
                          </Typography>
                          {app.capabilities.length > 0 && (
                            <Box sx={{ mt: 0.5 }}>
                              {app.capabilities.slice(0, 3).map((cap) => (
                                <Chip
                                  key={cap}
                                  label={cap}
                                  size="small"
                                  variant="outlined"
                                  sx={{ mr: 0.5, mb: 0.5 }}
                                />
                              ))}
                            </Box>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEnableModal} disabled={enabling}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveEnablements}
            variant="contained"
            disabled={enabling || loadingAvailable}
          >
            {enabling ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit App Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              label="Tab Label"
              value={editTabLabel}
              onChange={(e) => setEditTabLabel(e.target.value)}
              fullWidth
              helperText="Custom label for the app tab. Leave empty to use the app's default name."
              placeholder={editingApp?.name}
            />

            {/* Scopes Section */}
            <Divider sx={{ my: 3 }} />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <SecurityIcon fontSize="small" color="action" />
              <Typography variant="subtitle1" fontWeight={500}>
                Enabled Scopes
              </Typography>
            </Box>

            {loadingScopes ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 2 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Loading scopes...
                </Typography>
              </Box>
            ) : !editScopes || editScopes.maxScopes.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No scopes defined for this app. The app's whitelist entry may not have any maxScopes configured.
              </Typography>
            ) : (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Select which scopes this app can use in this class. If none are selected, all max scopes are allowed.
                </Typography>

                {/* Max Scopes with toggles */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  {editScopes.maxScopes.map((scope) => {
                    const isEnabled = editEnabledScopes.length === 0 || editEnabledScopes.includes(scope);
                    const isPromptScope = editScopes.promptScopes.includes(scope);

                    return (
                      <Box
                        key={scope}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          p: 1,
                          bgcolor: "grey.50",
                          borderRadius: 1,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Chip
                            label={scope}
                            size="small"
                            color={isEnabled ? "primary" : "default"}
                            variant={isEnabled ? "filled" : "outlined"}
                          />
                          {isPromptScope && (
                            <Chip
                              label="from prompt"
                              size="small"
                              color="secondary"
                              variant="outlined"
                              sx={{ fontSize: 10 }}
                            />
                          )}
                        </Box>
                        <Switch
                          checked={isEnabled}
                          onChange={() => handleToggleScope(scope)}
                          size="small"
                        />
                      </Box>
                    );
                  })}
                </Box>

                {/* Show effective scopes summary */}
                {editEnabledScopes.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Enabled: {editEnabledScopes.length} of {editScopes.maxScopes.length} scopes
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Disable Confirmation Dialog */}
      <Dialog open={disableDialogOpen} onClose={() => setDisableDialogOpen(false)}>
        <DialogTitle>Disable App</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to disable "{appToDisable?.name}" for this class?
            Students will no longer have access to this app.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisableDialogOpen(false)} disabled={disabling}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDisable}
            color="error"
            variant="contained"
            disabled={disabling}
          >
            {disabling ? "Disabling..." : "Disable"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </AdminPage>
  );
};

export default ClassKiwiAppsSettings;
