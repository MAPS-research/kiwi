import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Paper,
  Skeleton,
  Snackbar,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  AddOutlined as AddIcon,
  DeleteOutline as DeleteIcon,
  EditOutlined as EditIcon,
  RefreshOutlined as RefreshIcon,
  ContentCopyOutlined as CopyIcon,
  AutorenewOutlined as GenerateIcon,
  VisibilityOutlined as VisibilityIcon,
  VisibilityOffOutlined as VisibilityOffIcon,
  CheckCircleOutline as ApprovedIcon,
  HourglassEmptyOutlined as PendingIcon,
  CancelOutlined as RejectedIcon,
  KeyboardArrowDownOutlined as ExpandMoreIcon,
  KeyboardArrowUpOutlined as ExpandLessIcon,
  SecurityOutlined as SecurityIcon,
  PsychologyOutlined as PromptIcon,
} from "@mui/icons-material";
import { kiwiAppsApiClient } from "../../utils/api";
import type {
  AppResponseDto,
  AppUIResponseDto,
  AppScopesResponseDto,
  AppPromptResponseDto,
  WhitelistEntryResponseDto,
} from "../../services/models";
import { AdminPage, AdminPageHeader } from "../../components/AdminPage/index.ts";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`kiwi-apps-tabpanel-${index}`}
      aria-labelledby={`kiwi-apps-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// Generate a cryptographically secure random string
function generateSecret(length: number = 48): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

export const KiwiAppsAdmin: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  // Whitelist state
  const [whitelist, setWhitelist] = useState<WhitelistEntryResponseDto[]>([]);
  const [whitelistLoading, setWhitelistLoading] = useState(true);

  // Registered apps state
  const [apps, setApps] = useState<AppResponseDto[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);

  // Expanded rows state for viewing UIs
  const [expandedApps, setExpandedApps] = useState<Set<string>>(new Set());
  const [appUIs, setAppUIs] = useState<Record<string, AppUIResponseDto[]>>({});
  const [loadingUIs, setLoadingUIs] = useState<Set<string>>(new Set());

  // Scopes state
  const [appScopes, setAppScopes] = useState<Record<string, AppScopesResponseDto>>({});
  const [loadingScopes, setLoadingScopes] = useState<Set<string>>(new Set());

  // Prompts state
  const [appPrompts, setAppPrompts] = useState<Record<string, AppPromptResponseDto[]>>({});
  const [loadingPrompts, setLoadingPrompts] = useState<Set<string>>(new Set());
  const [processingPrompt, setProcessingPrompt] = useState<string | null>(null);

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [secretDialogOpen, setSecretDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formSlug, setFormSlug] = useState("");
  const [formSecret, setFormSecret] = useState("");
  const [formBaseUrl, setFormBaseUrl] = useState("");
  const [formStatus, setFormStatus] = useState<"pending" | "approved" | "rejected">("approved");
  const [formDescription, setFormDescription] = useState("");
  const [formMaxScopes, setFormMaxScopes] = useState<string[]>([]);
  const [newScopeInput, setNewScopeInput] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WhitelistEntryResponseDto | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<WhitelistEntryResponseDto | null>(null);

  // Created secret (shown once after creation)
  const [createdSlug, setCreatedSlug] = useState("");
  const [createdSecret, setCreatedSecret] = useState("");

  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning" | "info";
  }>({ open: false, message: "", severity: "success" });

  const showSnackbar = (message: string, severity: "success" | "error" | "warning" | "info") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Fetch whitelist
  const fetchWhitelist = async () => {
    try {
      setWhitelistLoading(true);
      const data = await kiwiAppsApiClient.kiwiAppControllerListWhitelist();
      setWhitelist(data);
    } catch (error) {
      console.error("Error fetching whitelist:", error);
      showSnackbar("Failed to load whitelist", "error");
    } finally {
      setWhitelistLoading(false);
    }
  };

  // Fetch registered apps
  const fetchApps = async () => {
    try {
      setAppsLoading(true);
      const data = await kiwiAppsApiClient.kiwiAppControllerListApps({
        includeInactive: true,
      });
      setApps(data);
    } catch (error) {
      console.error("Error fetching apps:", error);
      showSnackbar("Failed to load registered apps", "error");
    } finally {
      setAppsLoading(false);
    }
  };

  useEffect(() => {
    fetchWhitelist();
    fetchApps();
  }, []);

  // Fetch scopes for an app using generated API client
  const fetchAppScopes = async (slug: string) => {
    setLoadingScopes((prev) => new Set(prev).add(slug));
    try {
      const scopes = await kiwiAppsApiClient.kiwiAppControllerGetAppScopes({ slug });
      setAppScopes((prev) => ({ ...prev, [slug]: scopes }));
    } catch (error) {
      console.error(`Error fetching scopes for ${slug}:`, error);
      // Create empty scopes object on error
      setAppScopes((prev) => ({
        ...prev,
        [slug]: { appSlug: slug, maxScopes: [], promptScopes: [] },
      }));
    } finally {
      setLoadingScopes((prev) => {
        const next = new Set(prev);
        next.delete(slug);
        return next;
      });
    }
  };

  // Fetch prompts for an app
  const fetchAppPrompts = async (slug: string) => {
    setLoadingPrompts((prev) => new Set(prev).add(slug));
    try {
      const prompts = await kiwiAppsApiClient.kiwiAppControllerGetAppPrompts({ slug });
      setAppPrompts((prev) => ({ ...prev, [slug]: prompts }));
    } catch (error) {
      console.error(`Error fetching prompts for ${slug}:`, error);
      setAppPrompts((prev) => ({ ...prev, [slug]: [] }));
    } finally {
      setLoadingPrompts((prev) => {
        const next = new Set(prev);
        next.delete(slug);
        return next;
      });
    }
  };

  // Approve a prompt
  const handleApprovePrompt = async (slug: string, promptId: string) => {
    setProcessingPrompt(`${slug}:${promptId}`);
    try {
      const updated = await kiwiAppsApiClient.kiwiAppControllerApprovePrompt({ slug, promptId });
      setAppPrompts((prev) => ({
        ...prev,
        [slug]: prev[slug].map((p) => (p.promptId === promptId ? updated : p)),
      }));
      showSnackbar("Prompt approved", "success");
      // Refresh scopes since prompt scopes may have changed
      fetchAppScopes(slug);
    } catch (error) {
      console.error("Error approving prompt:", error);
      showSnackbar("Failed to approve prompt", "error");
    } finally {
      setProcessingPrompt(null);
    }
  };

  // Revoke a prompt
  const handleRevokePrompt = async (slug: string, promptId: string) => {
    setProcessingPrompt(`${slug}:${promptId}`);
    try {
      const updated = await kiwiAppsApiClient.kiwiAppControllerRevokePrompt({ slug, promptId });
      setAppPrompts((prev) => ({
        ...prev,
        [slug]: prev[slug].map((p) => (p.promptId === promptId ? updated : p)),
      }));
      showSnackbar("Prompt revoked", "success");
      // Refresh scopes since prompt scopes may have changed
      fetchAppScopes(slug);
    } catch (error) {
      console.error("Error revoking prompt:", error);
      showSnackbar("Failed to revoke prompt", "error");
    } finally {
      setProcessingPrompt(null);
    }
  };

  // Toggle expanded state and fetch UIs/scopes/prompts if needed
  const handleToggleExpand = async (slug: string) => {
    const newExpanded = new Set(expandedApps);

    if (newExpanded.has(slug)) {
      newExpanded.delete(slug);
      setExpandedApps(newExpanded);
      return;
    }

    newExpanded.add(slug);
    setExpandedApps(newExpanded);

    // Fetch UIs if not already loaded
    if (!appUIs[slug]) {
      setLoadingUIs((prev) => new Set(prev).add(slug));
      try {
        const uis = await kiwiAppsApiClient.kiwiAppControllerGetAppUIs({ slug });
        setAppUIs((prev) => ({ ...prev, [slug]: uis }));
      } catch (error) {
        console.error(`Error fetching UIs for ${slug}:`, error);
        setAppUIs((prev) => ({ ...prev, [slug]: [] }));
        showSnackbar(`Failed to load UIs for ${slug}`, "error");
      } finally {
        setLoadingUIs((prev) => {
          const next = new Set(prev);
          next.delete(slug);
          return next;
        });
      }
    }

    // Fetch scopes if not already loaded
    if (!appScopes[slug]) {
      fetchAppScopes(slug);
    }

    // Fetch prompts if not already loaded
    if (!appPrompts[slug]) {
      fetchAppPrompts(slug);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Generate new secret
  const handleGenerateSecret = () => {
    setFormSecret(generateSecret());
  };

  // Copy to clipboard
  const handleCopySecret = async (secret: string) => {
    try {
      await navigator.clipboard.writeText(secret);
      showSnackbar("Secret copied to clipboard", "info");
    } catch (error) {
      console.error("Failed to copy:", error);
      showSnackbar("Failed to copy secret", "error");
    }
  };

  // Whitelist CRUD handlers
  const handleAddWhitelist = () => {
    setFormSlug("");
    setFormSecret(generateSecret()); // Auto-generate secret
    setFormBaseUrl("");
    setFormStatus("approved");
    setFormDescription("");
    setFormMaxScopes([]);
    setNewScopeInput("");
    setShowSecret(false);
    setAddDialogOpen(true);
  };

  const handleEditWhitelist = (entry: WhitelistEntryResponseDto) => {
    setEditingEntry(entry);
    setFormSlug(entry.slug);
    setFormBaseUrl(entry.baseUrl || "");
    setFormStatus(entry.status as "pending" | "approved" | "rejected");
    setFormDescription(entry.description || "");
    setFormMaxScopes(entry.maxScopes || []);
    setNewScopeInput("");
    setEditDialogOpen(true);
  };

  // Scope management helpers
  const handleAddScope = () => {
    const scope = newScopeInput.trim().toLowerCase();
    if (scope && !formMaxScopes.includes(scope)) {
      setFormMaxScopes((prev) => [...prev, scope]);
      setNewScopeInput("");
    }
  };

  const handleRemoveScope = (scope: string) => {
    setFormMaxScopes((prev) => prev.filter((s) => s !== scope));
  };

  const handleScopeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddScope();
    }
  };

  const handleDeleteClick = (entry: WhitelistEntryResponseDto) => {
    setEntryToDelete(entry);
    setDeleteDialogOpen(true);
  };

  const handleSaveWhitelist = async () => {
    if (!formSlug.trim()) {
      showSnackbar("Slug is required", "warning");
      return;
    }

    if (!editingEntry && formSecret.length < 32) {
      showSnackbar("Registration secret must be at least 32 characters", "warning");
      return;
    }

    try {
      setSaving(true);

      if (editingEntry) {
        // Update existing
        const updated = await kiwiAppsApiClient.kiwiAppControllerUpdateWhitelistEntry({
          slug: editingEntry.slug,
          updateWhitelistEntryDto: {
            status: formStatus,
            baseUrl: formBaseUrl || undefined,
            description: formDescription || undefined,
            maxScopes: formMaxScopes.length > 0 ? formMaxScopes : undefined,
          },
        });
        setWhitelist((prev) =>
          prev.map((e) => (e.slug === updated.slug ? updated : e))
        );
        showSnackbar("Whitelist entry updated", "success");
        setEditDialogOpen(false);
        setEditingEntry(null);
      } else {
        // Create new - save the secret before API call
        const secretToSave = formSecret;
        const slugToSave = formSlug.trim().toLowerCase();

        const created = await kiwiAppsApiClient.kiwiAppControllerCreateWhitelistEntry({
          createWhitelistEntryDto: {
            slug: slugToSave,
            registrationSecret: secretToSave,
            baseUrl: formBaseUrl || undefined,
            status: formStatus,
            description: formDescription || undefined,
            maxScopes: formMaxScopes.length > 0 ? formMaxScopes : undefined,
          },
        });
        setWhitelist((prev) => [...prev, created]);

        // Close add dialog and show secret dialog
        setAddDialogOpen(false);
        setCreatedSlug(slugToSave);
        setCreatedSecret(secretToSave);
        setSecretDialogOpen(true);
      }
    } catch (error) {
      console.error("Error saving whitelist entry:", error);
      showSnackbar("Failed to save whitelist entry", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!entryToDelete) return;

    try {
      setDeleting(true);
      await kiwiAppsApiClient.kiwiAppControllerDeleteWhitelistEntry({
        slug: entryToDelete.slug,
      });
      setWhitelist((prev) => prev.filter((e) => e.slug !== entryToDelete.slug));
      showSnackbar("Removed from whitelist", "success");
    } catch (error) {
      console.error("Error deleting whitelist entry:", error);
      showSnackbar("Failed to remove from whitelist", "error");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
    }
  };

  const handleDeleteApp = async (slug: string) => {
    if (!window.confirm(`Are you sure you want to unregister the app "${slug}"?`)) {
      return;
    }

    try {
      await kiwiAppsApiClient.kiwiAppControllerDeleteApp({ slug });
      setApps((prev) => prev.filter((a) => a.slug !== slug));
      showSnackbar("App unregistered", "success");
    } catch (error) {
      console.error("Error deleting app:", error);
      showSnackbar("Failed to unregister app", "error");
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "coding":
        return "primary";
      case "quiz":
        return "secondary";
      case "analytics":
        return "info";
      default:
        return "default";
    }
  };

  const getPlacementColor = (placement: string) => {
    switch (placement) {
      case "class-tab":
        return "primary";
      case "admin-panel":
        return "secondary";
      case "modal":
        return "info";
      case "dashboard-widget":
        return "warning";
      default:
        return "default";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "error";
      case "instructor":
        return "warning";
      case "ta":
        return "info";
      case "student":
        return "success";
      default:
        return "default";
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Chip
            icon={<ApprovedIcon />}
            label="Approved"
            size="small"
            color="success"
          />
        );
      case "pending":
        return (
          <Chip
            icon={<PendingIcon />}
            label="Pending"
            size="small"
            color="warning"
          />
        );
      case "rejected":
        return (
          <Chip
            icon={<RejectedIcon />}
            label="Rejected"
            size="small"
            color="error"
          />
        );
      default:
        return (
          <Chip label={status} size="small" />
        );
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return "Never";
    return new Date(date).toLocaleString();
  };

  return (
    <AdminPage>
      <AdminPageHeader
        title="Kiwi Apps Management"
        description="Manage the app whitelist and registered Kiwi Apps. Apps must be whitelisted before they can self-register."
      />

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Whitelist" id="kiwi-apps-tab-0" />
          <Tab label="Registered Apps" id="kiwi-apps-tab-1" />
        </Tabs>
      </Box>

      {/* Whitelist Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchWhitelist}
              disabled={whitelistLoading}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddWhitelist}
            >
              Add to Whitelist
            </Button>
          </Box>
        </Box>

        {whitelistLoading ? (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Slug</TableCell>
                  <TableCell>Base URL</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[...Array(3)].map((_, i) => (
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
        ) : whitelist.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Apps Whitelisted
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Add an app slug to the whitelist to allow it to self-register.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddWhitelist}
            >
              Add First Whitelist Entry
            </Button>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Slug</TableCell>
                  <TableCell>Base URL</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {whitelist.map((entry) => (
                  <TableRow key={entry.slug}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500} fontFamily="monospace">
                        {entry.slug}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" fontFamily="monospace">
                        {entry.baseUrl || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {entry.description || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {getStatusChip(entry.status)}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(entry.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleEditWhitelist(entry)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remove">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(entry)}
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
      </TabPanel>

      {/* Registered Apps Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchApps}
            disabled={appsLoading}
          >
            Refresh
          </Button>
        </Box>

        {appsLoading ? (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width={50} />
                  <TableCell>Name</TableCell>
                  <TableCell>Slug</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Seen</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton variant="circular" width={24} height={24} /></TableCell>
                    <TableCell><Skeleton /></TableCell>
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
        ) : apps.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Apps Registered
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Apps will appear here once they self-register. Make sure the app is whitelisted first.
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width={50} />
                  <TableCell>Name</TableCell>
                  <TableCell>Slug</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Seen</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {apps.map((app) => {
                  const isExpanded = expandedApps.has(app.slug);
                  const isLoadingUI = loadingUIs.has(app.slug);
                  const uis = appUIs[app.slug] || [];

                  return (
                    <React.Fragment key={app.id}>
                      <TableRow sx={{ '& > *': { borderBottom: isExpanded ? 'unset' : undefined } }}>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleToggleExpand(app.slug)}
                            aria-label={isExpanded ? "collapse row" : "expand row"}
                          >
                            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {app.name}
                          </Typography>
                          {app.description && (
                            <Typography variant="caption" color="text.secondary">
                              {app.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {app.slug}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={app.category}
                            size="small"
                            color={getCategoryColor(app.category)}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{app.version}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={app.isActive ? "Active" : "Inactive"}
                            size="small"
                            color={app.isActive ? "success" : "default"}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(app.lastSeenAt)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Unregister">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteApp(app.slug)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>

                      {/* Expandable UI Details Row */}
                      <TableRow>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 2 }}>
                              <Typography variant="subtitle2" gutterBottom component="div" sx={{ fontWeight: 600 }}>
                                Registered UIs
                              </Typography>
                              {isLoadingUI ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
                                  <CircularProgress size={20} />
                                  <Typography variant="body2" color="text.secondary">
                                    Loading UIs...
                                  </Typography>
                                </Box>
                              ) : uis.length === 0 ? (
                                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                  No UIs registered for this app.
                                </Typography>
                              ) : (
                                <Table size="small" sx={{ bgcolor: 'grey.50', borderRadius: 1 }}>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>UI Slug</TableCell>
                                      <TableCell>Name</TableCell>
                                      <TableCell>URL</TableCell>
                                      <TableCell>Placement</TableCell>
                                      <TableCell>Allowed Roles</TableCell>
                                      <TableCell>Order</TableCell>
                                      <TableCell>Status</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {uis.map((ui) => (
                                      <TableRow key={ui.id}>
                                        <TableCell>
                                          <Typography variant="body2" fontFamily="monospace" fontSize={12}>
                                            {ui.uiSlug}
                                          </Typography>
                                        </TableCell>
                                        <TableCell>
                                          <Typography variant="body2">
                                            {ui.uiName || '-'}
                                          </Typography>
                                        </TableCell>
                                        <TableCell>
                                          <Tooltip title={ui.uiUrl}>
                                            <Typography
                                              variant="body2"
                                              fontFamily="monospace"
                                              fontSize={12}
                                              sx={{
                                                maxWidth: 200,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                              }}
                                            >
                                              {ui.uiUrl}
                                            </Typography>
                                          </Tooltip>
                                        </TableCell>
                                        <TableCell>
                                          <Chip
                                            label={ui.placement}
                                            size="small"
                                            color={getPlacementColor(ui.placement)}
                                            variant="outlined"
                                          />
                                        </TableCell>
                                        <TableCell>
                                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                            {ui.allowedRoles.map((role) => (
                                              <Chip
                                                key={role}
                                                label={role}
                                                size="small"
                                                color={getRoleColor(role)}
                                                variant="outlined"
                                                sx={{ fontSize: 11 }}
                                              />
                                            ))}
                                          </Box>
                                        </TableCell>
                                        <TableCell>
                                          <Typography variant="body2">
                                            {ui.tabOrder}
                                          </Typography>
                                        </TableCell>
                                        <TableCell>
                                          <Chip
                                            label={ui.isEnabled ? "Enabled" : "Disabled"}
                                            size="small"
                                            color={ui.isEnabled ? "success" : "default"}
                                          />
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}

                              {/* Scopes Section */}
                              <Divider sx={{ my: 2 }} />
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <SecurityIcon fontSize="small" color="action" />
                                <Typography variant="subtitle2" component="div" sx={{ fontWeight: 600 }}>
                                  App Scopes
                                </Typography>
                              </Box>
                              {loadingScopes.has(app.slug) ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
                                  <CircularProgress size={20} />
                                  <Typography variant="body2" color="text.secondary">
                                    Loading scopes...
                                  </Typography>
                                </Box>
                              ) : !appScopes[app.slug] || (appScopes[app.slug].maxScopes.length === 0 && appScopes[app.slug].promptScopes.length === 0) ? (
                                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                                  No scopes defined for this app.
                                </Typography>
                              ) : (
                                <Box>
                                  {/* Max Scopes (from whitelist) */}
                                  {appScopes[app.slug].maxScopes.length > 0 && (
                                    <Box sx={{ mb: 2 }}>
                                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                        Maximum Allowed Scopes (from whitelist)
                                      </Typography>
                                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {appScopes[app.slug].maxScopes.map((scope) => (
                                          <Chip
                                            key={scope}
                                            label={scope}
                                            size="small"
                                            color="primary"
                                            variant="outlined"
                                          />
                                        ))}
                                      </Box>
                                    </Box>
                                  )}
                                  {/* Prompt Scopes */}
                                  {appScopes[app.slug].promptScopes.length > 0 && (
                                    <Box>
                                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                        Prompt Scopes (from registered prompts)
                                      </Typography>
                                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {appScopes[app.slug].promptScopes.map((scope) => (
                                          <Chip
                                            key={scope}
                                            label={scope}
                                            size="small"
                                            color="secondary"
                                            variant="outlined"
                                          />
                                        ))}
                                      </Box>
                                    </Box>
                                  )}
                                </Box>
                              )}
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                Max scopes define what this app can request. Enable/disable specific scopes per class in class settings.
                              </Typography>

                              {/* LLM Prompts Section */}
                              <Divider sx={{ my: 2 }} />
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <PromptIcon fontSize="small" color="action" />
                                <Typography variant="subtitle2" component="div" sx={{ fontWeight: 600 }}>
                                  LLM Prompts
                                </Typography>
                              </Box>
                              {loadingPrompts.has(app.slug) ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
                                  <CircularProgress size={20} />
                                  <Typography variant="body2" color="text.secondary">
                                    Loading prompts...
                                  </Typography>
                                </Box>
                              ) : !appPrompts[app.slug] || appPrompts[app.slug].length === 0 ? (
                                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                                  No prompts registered for this app.
                                </Typography>
                              ) : (
                                <Table size="small" sx={{ bgcolor: 'grey.50', borderRadius: 1 }}>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Name</TableCell>
                                      <TableCell>Prompt ID</TableCell>
                                      <TableCell>System Prompt</TableCell>
                                      <TableCell>Settings</TableCell>
                                      <TableCell>Status</TableCell>
                                      <TableCell align="right">Actions</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {appPrompts[app.slug].map((prompt) => {
                                      const isProcessing = processingPrompt === `${app.slug}:${prompt.promptId}`;
                                      const isApproved = !!prompt.approvedBy;

                                      return (
                                        <TableRow key={prompt.id}>
                                          <TableCell>
                                            <Typography variant="body2" fontWeight={500}>
                                              {prompt.name}
                                            </Typography>
                                            {prompt.description && (
                                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                {prompt.description}
                                              </Typography>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            <Typography variant="body2" fontFamily="monospace" fontSize={12}>
                                              {prompt.promptId}
                                            </Typography>
                                          </TableCell>
                                          <TableCell sx={{ maxWidth: 300 }}>
                                            <Tooltip title={prompt.systemPrompt}>
                                              <Typography
                                                variant="body2"
                                                fontSize={12}
                                                sx={{
                                                  overflow: 'hidden',
                                                  textOverflow: 'ellipsis',
                                                  whiteSpace: 'nowrap',
                                                  maxWidth: 280,
                                                }}
                                              >
                                                {prompt.systemPrompt}
                                              </Typography>
                                            </Tooltip>
                                          </TableCell>
                                          <TableCell>
                                            <Typography variant="caption" color="text.secondary">
                                              {prompt.maxTokens && `${prompt.maxTokens} tokens`}
                                              {prompt.maxTokens && prompt.temperature !== undefined && ', '}
                                              {prompt.temperature !== undefined && `temp: ${prompt.temperature}`}
                                              {!prompt.maxTokens && prompt.temperature === undefined && '-'}
                                            </Typography>
                                          </TableCell>
                                          <TableCell>
                                            {isApproved ? (
                                              <Tooltip title={`Approved by ${prompt.approvedBy} on ${prompt.approvedAt ? new Date(prompt.approvedAt).toLocaleDateString() : 'unknown'}`}>
                                                <Chip
                                                  icon={<ApprovedIcon />}
                                                  label="Approved"
                                                  size="small"
                                                  color="success"
                                                />
                                              </Tooltip>
                                            ) : (
                                              <Chip
                                                icon={<PendingIcon />}
                                                label="Pending"
                                                size="small"
                                                color="warning"
                                              />
                                            )}
                                          </TableCell>
                                          <TableCell align="right">
                                            {isApproved ? (
                                              <Button
                                                size="small"
                                                color="error"
                                                onClick={() => handleRevokePrompt(app.slug, prompt.promptId)}
                                                disabled={isProcessing}
                                                startIcon={isProcessing ? <CircularProgress size={14} /> : <RejectedIcon />}
                                              >
                                                Revoke
                                              </Button>
                                            ) : (
                                              <Button
                                                size="small"
                                                color="success"
                                                variant="contained"
                                                onClick={() => handleApprovePrompt(app.slug, prompt.promptId)}
                                                disabled={isProcessing}
                                                startIcon={isProcessing ? <CircularProgress size={14} /> : <ApprovedIcon />}
                                              >
                                                Approve
                                              </Button>
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              )}
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                Approve prompts to allow the app to use them for LLM requests. Review the system prompt before approving.
                              </Typography>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Add Whitelist Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add to Whitelist</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter the app details. A registration secret will be generated that the app must use to self-register.
          </DialogContentText>
          <TextField
            autoFocus
            label="App Slug"
            fullWidth
            value={formSlug}
            onChange={(e) => setFormSlug(e.target.value)}
            placeholder="e.g., codegen"
            helperText="Lowercase identifier for the app"
            sx={{ mb: 2 }}
          />
          <TextField
            label="Registration Secret"
            fullWidth
            type={showSecret ? "text" : "password"}
            value={formSecret}
            onChange={(e) => setFormSecret(e.target.value)}
            helperText="Minimum 32 characters. Share this with the app developer."
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={showSecret ? "Hide secret" : "Show secret"}>
                    <IconButton
                      onClick={() => setShowSecret(!showSecret)}
                      edge="end"
                      size="small"
                    >
                      {showSecret ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Generate new secret">
                    <IconButton
                      onClick={handleGenerateSecret}
                      edge="end"
                      size="small"
                    >
                      <GenerateIcon />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Base URL (optional)"
            fullWidth
            value={formBaseUrl}
            onChange={(e) => setFormBaseUrl(e.target.value)}
            placeholder="e.g., https://codegen.example.com"
            helperText="Expected base URL of the app"
            sx={{ mb: 2 }}
          />
          <TextField
            label="Description (optional)"
            fullWidth
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="e.g., Code generation service"
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={formStatus}
              label="Status"
              onChange={(e) => setFormStatus(e.target.value as "pending" | "approved" | "rejected")}
            >
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </FormControl>

          {/* Max Scopes */}
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <SecurityIcon fontSize="small" color="action" />
            <Typography variant="subtitle2">Maximum Allowed Scopes</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
            Define which scopes this app can request. Examples: read:students, write:grades, mcp:tools
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
            <TextField
              size="small"
              placeholder="Add scope (e.g., read:data)"
              value={newScopeInput}
              onChange={(e) => setNewScopeInput(e.target.value)}
              onKeyDown={handleScopeKeyDown}
              sx={{ flex: 1 }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={handleAddScope}
              disabled={!newScopeInput.trim()}
            >
              Add
            </Button>
          </Box>
          {formMaxScopes.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {formMaxScopes.map((scope) => (
                <Chip
                  key={scope}
                  label={scope}
                  size="small"
                  onDelete={() => handleRemoveScope(scope)}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveWhitelist}
            disabled={saving || !formSlug.trim() || formSecret.length < 32}
            startIcon={saving ? <CircularProgress size={16} /> : null}
          >
            {saving ? "Saving..." : "Add"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Secret Display Dialog (shown after creation) */}
      <Dialog
        open={secretDialogOpen}
        onClose={() => setSecretDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: "warning.main" }}>
          Save Your Registration Secret
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This is the only time the registration secret will be shown. Copy it now and share it securely with the app developer.
          </Alert>
          <Typography variant="subtitle2" gutterBottom>
            App Slug
          </Typography>
          <Typography
            variant="body1"
            fontFamily="monospace"
            sx={{ mb: 2, p: 1, bgcolor: "grey.100", borderRadius: 1 }}
          >
            {createdSlug}
          </Typography>
          <Typography variant="subtitle2" gutterBottom>
            Registration Secret
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              p: 1,
              bgcolor: "grey.100",
              borderRadius: 1,
            }}
          >
            <Typography
              variant="body2"
              fontFamily="monospace"
              sx={{ flex: 1, wordBreak: "break-all" }}
            >
              {createdSecret}
            </Typography>
            <Tooltip title="Copy to clipboard">
              <IconButton
                size="small"
                onClick={() => handleCopySecret(createdSecret)}
              >
                <CopyIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => {
              setSecretDialogOpen(false);
              setCreatedSlug("");
              setCreatedSecret("");
              showSnackbar("App added to whitelist successfully", "success");
            }}
          >
            I've Copied the Secret
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Whitelist Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingEntry(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Whitelist Entry</DialogTitle>
        <DialogContent>
          <TextField
            label="App Slug"
            fullWidth
            value={formSlug}
            disabled
            sx={{ mb: 2, mt: 1 }}
          />
          <Alert severity="info" sx={{ mb: 2 }}>
            The registration secret cannot be viewed or changed. To issue a new secret, delete this entry and create a new one.
          </Alert>
          <TextField
            label="Base URL (optional)"
            fullWidth
            value={formBaseUrl}
            onChange={(e) => setFormBaseUrl(e.target.value)}
            placeholder="e.g., https://codegen.example.com"
            sx={{ mb: 2 }}
          />
          <TextField
            label="Description (optional)"
            fullWidth
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={formStatus}
              label="Status"
              onChange={(e) => setFormStatus(e.target.value as "pending" | "approved" | "rejected")}
            >
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </FormControl>

          {/* Max Scopes */}
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <SecurityIcon fontSize="small" color="action" />
            <Typography variant="subtitle2">Maximum Allowed Scopes</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
            Define which scopes this app can request. Examples: read:students, write:grades, mcp:tools
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
            <TextField
              size="small"
              placeholder="Add scope (e.g., read:data)"
              value={newScopeInput}
              onChange={(e) => setNewScopeInput(e.target.value)}
              onKeyDown={handleScopeKeyDown}
              sx={{ flex: 1 }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={handleAddScope}
              disabled={!newScopeInput.trim()}
            >
              Add
            </Button>
          </Box>
          {formMaxScopes.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {formMaxScopes.map((scope) => (
                <Chip
                  key={scope}
                  label={scope}
                  size="small"
                  onDelete={() => handleRemoveScope(scope)}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditDialogOpen(false);
              setEditingEntry(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveWhitelist}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : null}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setEntryToDelete(null);
        }}
      >
        <DialogTitle>Remove from Whitelist</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove "{entryToDelete?.slug}" from the whitelist?
            This will prevent the app from re-registering and invalidate its registration secret.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              setEntryToDelete(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : null}
          >
            {deleting ? "Removing..." : "Remove"}
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

export default KiwiAppsAdmin;
