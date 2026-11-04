import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Typography,
  Snackbar,
  Alert,
  AlertTitle,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Tooltip,
  InputAdornment,
  Tabs,
  Tab,
  Badge,
} from "@mui/material";
import {
  AddOutlined as AddIcon,
  DeleteOutlined as DeleteIcon,
  EditOutlined as EditIcon,
  VisibilityOutlined as VisibilityIcon,
  VisibilityOffOutlined as VisibilityOffIcon,
  ContentCopyOutlined as ContentCopyIcon,
  SendOutlined as SendIcon,
  RefreshOutlined as RefreshIcon,
  CheckCircleOutlined as CheckCircleIcon,
  ErrorOutlined as ErrorIcon,
  HistoryOutlined as HistoryIcon,
  VpnKeyOutlined as VpnKeyIcon,
  InfoOutlined as InfoIcon,
  ApprovalOutlined as ApprovalIcon,
} from "@mui/icons-material";
import { webhooksApiClient, apiTokensApiClient, basePath } from "../../utils/api.ts";
import {
  WebhookWithTokenDto,
  WebhookResponseDto,
  CreateWebhookDto,
  UpdateWebhookDto,
  WebhooksControllerTriggerTestEventRequest,
  TriggerTestEventResponseDto,
  WebhookDeliveryDto,
  CreateApiTokenDto,
} from "../../services/index.ts";
import {
  AdminFormSurface,
  AdminPage,
  AdminPageHeader,
} from "../../components/AdminPage/index.ts";

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
      id={`webhook-tabpanel-${index}`}
      aria-labelledby={`webhook-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const WebhookManagement: React.FC = () => {
  const navigate = useNavigate();
  const [webhooks, setWebhooks] = useState<WebhookWithTokenDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tabValue, setTabValue] = useState(0);
  const [pendingEventsCount, setPendingEventsCount] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [deliveryHistory, setDeliveryHistory] = useState<WebhookDeliveryDto[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookWithTokenDto | null>(null);
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>(['*']);
  const [editWebhookEvents, setEditWebhookEvents] = useState<string[]>([]);
  const [editWebhookIsActive, setEditWebhookIsActive] = useState<boolean>(true);
  const [secretVisibility, setSecretVisibility] = useState<{ [key: string]: boolean }>({});
  const [apiTokenVisibility, setApiTokenVisibility] = useState<{ [key: string]: boolean }>({});
  const [webhookSecrets, setWebhookSecrets] = useState<{ [key: string]: string }>({});
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "info" });
  const [testResponse, setTestResponse] = useState<TriggerTestEventResponseDto | null>(null);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [apiTokenDialogOpen, setApiTokenDialogOpen] = useState(false);
  const [newApiTokenName, setNewApiTokenName] = useState("");
  const [createdApiTokens, setCreatedApiTokens] = useState<{ [key: string]: string }>({});
  const [apiTokenCreating, setApiTokenCreating] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);

  useEffect(() => {
    fetchWebhooks();
    fetchPendingEventsCount();
  }, []);

  const fetchPendingEventsCount = async () => {
    try {
      const response = await webhooksApiClient.webhooksControllerGetPendingEvents();
      setPendingEventsCount(response.total || 0);
    } catch (error) {
      console.error("Error fetching pending events count:", error);
      setPendingEventsCount(0);
    }
  };

  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      const response = await webhooksApiClient.webhooksControllerFindAll();
      setWebhooks(Array.isArray(response) ? response : [])
    } catch (error) {
      console.error("Error fetching webhooks:", error);
      setSnackbar({
        open: true,
        message: "Failed to fetch webhooks",
        severity: "error",
      });
      setWebhooks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWebhook = async () => {
    try {
      const createDto: CreateWebhookDto = {
        events: newWebhookEvents,
      };
      const response = await webhooksApiClient.webhooksControllerCreate({ createWebhookDto: createDto });
      const createdWebhook = response as WebhookResponseDto;

      // Store the secret from creation
      if (createdWebhook.secret) {
        setWebhookSecrets(prev => ({ ...prev, [createdWebhook.id]: createdWebhook.secret || '' }));
      }

      setSnackbar({
        open: true,
        message: "Webhook created successfully",
        severity: "success",
      });
      setCreateDialogOpen(false);
      setNewWebhookEvents(['*']);
      fetchWebhooks();
    } catch (error: any) {
      console.error("Error creating webhook:", error);

      // Extract detailed error message
      let errorMessage = "Failed to create webhook";

      if (error?.response?.status === 500) {
        // This is likely the Prisma validation error
        errorMessage = "Backend configuration error: The webhook service is not properly configured to associate webhooks with users. Please contact the administrator.";
      } else if (error?.response?.data?.message) {
        errorMessage = `Failed to create webhook: ${error.response.data.message}`;
      } else if (error?.message) {
        errorMessage = `Failed to create webhook: ${error.message}`;
      }

      // Check if this is the known user association issue
      if (error?.response?.data?.message?.includes("Argument `user` is missing") ||
        error?.response?.data?.message?.includes("userId")) {
        errorMessage = "Backend error: The webhook service requires user authentication configuration. This is a known issue that needs to be fixed in the backend service.";
      }

      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    }
  };

  const handleUpdateWebhook = async () => {
    if (!selectedWebhook) return;

    try {
      const updateDto: UpdateWebhookDto = {
        events: editWebhookEvents,
        isActive: editWebhookIsActive,
      };

      await webhooksApiClient.webhooksControllerUpdate({
        id: selectedWebhook.id,
        updateWebhookDto: updateDto,
      });

      setSnackbar({
        open: true,
        message: "Webhook updated successfully",
        severity: "success",
      });
      setEditDialogOpen(false);
      setSelectedWebhook(null);
      fetchWebhooks();
    } catch (error) {
      console.error("Error updating webhook:", error);
      setSnackbar({
        open: true,
        message: "Failed to update webhook",
        severity: "error",
      });
    }
  };

  const handleDeleteWebhook = async () => {
    if (!selectedWebhook) return;

    try {
      await webhooksApiClient.webhooksControllerRemove({ id: selectedWebhook.id });

      setSnackbar({
        open: true,
        message: "Webhook deleted successfully",
        severity: "success",
      });
      setDeleteDialogOpen(false);
      setSelectedWebhook(null);
      fetchWebhooks();
    } catch (error) {
      console.error("Error deleting webhook:", error);
      setSnackbar({
        open: true,
        message: "Failed to delete webhook",
        severity: "error",
      });
    }
  };

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    try {
      const testRequest: WebhooksControllerTriggerTestEventRequest = {
        event: 'test.webhook',
        data: {
          message: 'Test webhook event',
          timestamp: new Date().toISOString(),
          webhookId: selectedWebhook?.id,
        },
      };
      const response = await webhooksApiClient.webhooksControllerTriggerTestEvent({
        webhooksControllerTriggerTestEventRequest: testRequest
      });
      const testResult = response;

      if (testResult) {
        setTestResponse(testResult);
        setSnackbar({
          open: true,
          message: `Test event sent successfully. ${testResult.webhooksTriggered} webhooks triggered.`,
          severity: "success",
        });
      } else {
        // If no response data, create a success response
        setTestResponse({
          event: 'test.webhook',
          webhooksTriggered: 0,
        });
        setSnackbar({
          open: true,
          message: "Test event sent",
          severity: "success",
        });
      }
    } catch (error) {
      console.error("Error testing webhook:", error);
      setTestResponse({
        event: 'test.webhook',
        webhooksTriggered: 0,
      });
      setSnackbar({
        open: true,
        message: `Failed to send test event: ${String(error)}`,
        severity: "error",
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  const toggleSecretVisibility = (webhookId: string) => {
    setSecretVisibility((prev) => ({
      ...prev,
      [webhookId]: !prev[webhookId],
    }));
  };

  const copySecretToClipboard = (webhookId: string) => {
    const secret = webhookSecrets[webhookId];
    if (secret) {
      navigator.clipboard.writeText(secret);
      setSnackbar({
        open: true,
        message: "Secret copied to clipboard",
        severity: "info",
      });
    } else {
      setSnackbar({
        open: true,
        message: "Secret not available (only shown on creation)",
        severity: "info",
      });
    }
  };

  const openEditDialog = (webhook: WebhookWithTokenDto) => {
    setSelectedWebhook(webhook);
    setEditWebhookEvents(webhook.events || ['*']);
    setEditWebhookIsActive(webhook.isActive);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (webhook: WebhookWithTokenDto) => {
    setSelectedWebhook(webhook);
    setDeleteDialogOpen(true);
  };

  const openTestDialog = (webhook: WebhookWithTokenDto) => {
    setSelectedWebhook(webhook);
    setTestResponse(null);
    setTestDialogOpen(true);
  };

  const openApiTokenDialog = (webhook: WebhookWithTokenDto) => {
    setSelectedWebhook(webhook);
    setNewApiTokenName(`${webhook.id}-token`);
    setApiTokenDialogOpen(true);
  };

  const handleCreateApiToken = async () => {
    if (!selectedWebhook) return;

    setApiTokenCreating(true);
    try {
      const createDto: CreateApiTokenDto = {
        name: newApiTokenName,
        webhookId: selectedWebhook.id,
        scopes: ['webhook:send'],
      };

      const response = await apiTokensApiClient.apiTokensControllerCreate({
        createApiTokenDto: createDto,
      });

      // Store the raw token value (only available on creation)
      if (response.token) {
        setCreatedApiTokens(prev => ({
          ...prev,
          [selectedWebhook.id]: response.token || '',
        }));
      }

      setSnackbar({
        open: true,
        message: "API token created successfully. Copy it now - it won't be shown again!",
        severity: "success",
      });

      // Refresh webhooks to show the new token
      await fetchWebhooks();
    } catch (error: any) {
      console.error("Error creating API token:", error);

      let errorMessage = "Failed to create API token";
      if (error?.response?.data?.message) {
        errorMessage = `Failed to create API token: ${error.response.data.message}`;
      }

      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    } finally {
      setApiTokenCreating(false);
    }
  };

  const handleDeleteApiToken = async (tokenId: string) => {
    try {
      await apiTokensApiClient.apiTokensControllerRemove({ id: tokenId });

      setSnackbar({
        open: true,
        message: "API token deleted successfully",
        severity: "success",
      });

      // Refresh webhooks to update the display
      await fetchWebhooks();
    } catch (error: any) {
      console.error("Error deleting API token:", error);

      setSnackbar({
        open: true,
        message: "Failed to delete API token",
        severity: "error",
      });
    }
  };

  const handleRegenerateApiToken = async () => {
    if (!selectedWebhook || !selectedWebhook.apiToken) return;

    setApiTokenCreating(true);
    try {
      // First delete the old token
      await apiTokensApiClient.apiTokensControllerRemove({
        id: selectedWebhook.apiToken.id
      });

      // Then create a new one
      const createDto: CreateApiTokenDto = {
        name: newApiTokenName || selectedWebhook.apiToken.name,
        webhookId: selectedWebhook.id,
        scopes: ['webhook:send'],
      };

      const response = await apiTokensApiClient.apiTokensControllerCreate({
        createApiTokenDto: createDto,
      });

      // Store the raw token value (only available on creation)
      if (response.token) {
        setCreatedApiTokens(prev => ({
          ...prev,
          [selectedWebhook.id]: response.token || '',
        }));
      }

      setSnackbar({
        open: true,
        message: "API token regenerated successfully. Copy the new token now!",
        severity: "success",
      });

      // Refresh webhooks to show the new token
      await fetchWebhooks();
    } catch (error: any) {
      console.error("Error regenerating API token:", error);

      setSnackbar({
        open: true,
        message: "Failed to regenerate API token",
        severity: "error",
      });
    } finally {
      setApiTokenCreating(false);
    }
  };

  const openDeliveryDialog = async (webhook: WebhookWithTokenDto) => {
    setSelectedWebhook(webhook);
    setDeliveryDialogOpen(true);
    setLoadingDeliveries(true);
    try {
      const deliveries = await webhooksApiClient.webhooksControllerGetDeliveries({ id: webhook.id });
      setDeliveryHistory(deliveries);
    } catch (error) {
      console.error('Error fetching delivery history:', error);
      setDeliveryHistory([]);
    } finally {
      setLoadingDeliveries(false);
    }
  };

  const toggleApiTokenVisibility = (webhookId: string) => {
    setApiTokenVisibility((prev) => ({
      ...prev,
      [webhookId]: !prev[webhookId],
    }));
  };

  const copyApiTokenToClipboard = (webhook: WebhookWithTokenDto) => {
    // Check if we have a newly created token to copy
    const createdToken = createdApiTokens[webhook.id];
    if (createdToken) {
      navigator.clipboard.writeText(createdToken);
      setSnackbar({
        open: true,
        message: "API token copied to clipboard",
        severity: "success",
      });
    } else if (webhook.apiToken?.name) {
      navigator.clipboard.writeText(webhook.apiToken.name);
      setSnackbar({
        open: true,
        message: "API token name copied to clipboard (full token not available)",
        severity: "info",
      });
    } else {
      setSnackbar({
        open: true,
        message: "API token not available",
        severity: "info",
      });
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredWebhooks = webhooks.filter((webhook) => {
    if (tabValue === 0) return true; // All
    if (tabValue === 1) return webhook.isActive;
    if (tabValue === 2) return !webhook.isActive;
    return true;
  });
  const activeWebhooks = webhooks.filter((webhook) => webhook.isActive).length;
  const inactiveWebhooks = webhooks.length - activeWebhooks;

  const displayedWebhooks = filteredWebhooks.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <AdminPage>
      <AdminPageHeader
        title="Webhook Management"
        description="Create endpoints and monitor webhook delivery."
        actions={
          <>
            <Tooltip title="Refresh">
              <IconButton
                aria-label="Refresh webhooks"
                sx={{ minWidth: 44, minHeight: 44 }}
                onClick={() => {
                  fetchWebhooks();
                  fetchPendingEventsCount();
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Badge badgeContent={pendingEventsCount} color="warning">
              <Button
                variant="outlined"
                color="warning"
                startIcon={<ApprovalIcon />}
                onClick={() => navigate('/admin/webhooks/approvals')}
              >
                Event Approvals
              </Button>
            </Badge>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Webhook
            </Button>
          </>
        }
      />

      <Box
        component="section"
        aria-label="Webhook summary"
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
          gap: 2,
          mb: 3,
          maxWidth: 992,
        }}
      >
        {[
          { label: "Total webhooks", value: webhooks.length },
          { label: "Active", value: activeWebhooks },
          { label: "Inactive", value: inactiveWebhooks },
        ].map((item) => (
          <AdminFormSurface
            key={item.label}
            sx={{
              width: "100%",
              maxWidth: 320,
              minHeight: 112,
              p: { xs: 2, sm: 2.5 },
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              {item.label}
            </Typography>
            <Typography
              variant="h4"
              sx={{
                color: "text.primary",
                mt: 0.5,
                fontWeight: 600
              }}>
              {item.value}
            </Typography>
          </AdminFormSurface>
        ))}
      </Box>

      <AdminFormSurface sx={{ overflow: "hidden" }}>
        <Tabs
          value={tabValue}
          onChange={(_e, v) => setTabValue(v)}
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="All" />
          <Tab label="Active" />
          <Tab label="Inactive" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {renderWebhookTable()}
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          {renderWebhookTable()}
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          {renderWebhookTable()}
        </TabPanel>
      </AdminFormSurface>
      {/* Create Webhook Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Webhook</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong style={{ fontWeight: "var(--weight-semibold)" }}>Note:</strong> Webhook creation may fail due to a backend configuration issue.
              The webhook service needs to be updated to properly associate webhooks with authenticated users.
            </Typography>
          </Alert>
          <TextField
            autoFocus
            margin="dense"
            label="Events (comma-separated, * for all)"
            type="text"
            fullWidth
            variant="outlined"
            value={newWebhookEvents.join(", ")}
            onChange={(e) => setNewWebhookEvents(e.target.value.split(",").map(s => s.trim()).filter(s => s))}
            helperText="Enter event names separated by commas, or * for all events"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateWebhook}
            variant="contained"
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Webhook Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Webhook</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Events (comma-separated, * for all)"
            type="text"
            fullWidth
            variant="outlined"
            value={editWebhookEvents.join(", ")}
            onChange={(e) => setEditWebhookEvents(e.target.value.split(",").map(s => s.trim()).filter(s => s))}
            helperText="Enter event names separated by commas, or * for all events"
            sx={{ mb: 2 }}
          />
          <TextField
            select
            margin="dense"
            label="Status"
            fullWidth
            variant="outlined"
            value={editWebhookIsActive ? "active" : "inactive"}
            onChange={(e) =>
              setEditWebhookIsActive(e.target.value === "active")
            }
            slotProps={{
              select: {
                native: true,
              },
            }}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleUpdateWebhook}
            variant="contained"
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this webhook? This action cannot
            be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteWebhook}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Webhook Dialog */}
      <Dialog
        open={testDialogOpen}
        onClose={() => setTestDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Test Webhook</DialogTitle>
        <DialogContent>
          {selectedWebhook && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1">
                Testing webhook: {selectedWebhook.id}
              </Typography>
            </Box>
          )}
          {testingWebhook ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress />
            </Box>
          ) : testResponse ? (
            <Box>
              <Alert
                severity={testResponse.webhooksTriggered > 0 ? "success" : "info"}
                sx={{ mb: 2 }}
              >
                Test event sent. {testResponse.webhooksTriggered} webhooks triggered.
              </Alert>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Event Type: {testResponse.event}
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Click the button below to send a test event to this webhook.
              </Typography>
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={handleTestWebhook}
                fullWidth
              >
                Send Test Event
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Token Regeneration Confirmation Dialog */}
      <Dialog
        open={regenerateDialogOpen}
        onClose={() => setRegenerateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RefreshIcon color="warning" />
            Regenerate API Token
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>Important: This will invalidate the current token</AlertTitle>
            <Typography variant="body2">
              • The current API token will immediately stop working<br />
              • Any systems using the current token will lose access<br />
              • The new token will only be shown once<br />
              • You'll need to update all webhook consumers with the new token
            </Typography>
          </Alert>

          {selectedWebhook && selectedWebhook.apiToken && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Current Token Information:
              </Typography>
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                Name: {selectedWebhook.apiToken.name}<br />
                Created: {new Date(selectedWebhook.createdAt).toLocaleDateString()}<br />
                {selectedWebhook.apiToken.lastUsedAt && (
                  <>Last Used: {new Date(selectedWebhook.apiToken.lastUsedAt).toLocaleDateString()}</>
                )}
              </Typography>
            </Box>
          )}

          <TextField
            margin="dense"
            label="New Token Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newApiTokenName}
            onChange={(e) => setNewApiTokenName(e.target.value)}
            helperText="You can keep the same name or choose a new one"
          />

          {createdApiTokens[selectedWebhook?.id || ''] && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                New token created! Copy it now:
              </Typography>
              <TextField
                value={createdApiTokens[selectedWebhook?.id || '']}
                fullWidth
                size="small"
                slotProps={{
                  input: {
                    readOnly: true,
                    style: { fontFamily: 'var(--font-mono)', fontSize: '12px' },
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => {
                            navigator.clipboard.writeText(createdApiTokens[selectedWebhook?.id || '']);
                            setSnackbar({
                              open: true,
                              message: "Token copied to clipboard",
                              severity: "success",
                            });
                          }}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                ⚠️ This token will not be shown again after closing this dialog!
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setRegenerateDialogOpen(false);
            setNewApiTokenName("");
            // Clear the created token after closing
            if (selectedWebhook) {
              setCreatedApiTokens(prev => {
                const newTokens = { ...prev };
                delete newTokens[selectedWebhook.id];
                return newTokens;
              });
            }
          }}>
            {createdApiTokens[selectedWebhook?.id || ''] ? 'Close' : 'Cancel'}
          </Button>
          {!createdApiTokens[selectedWebhook?.id || ''] && (
            <Button
              onClick={handleRegenerateApiToken}
              variant="contained"
              color="warning"
              disabled={!newApiTokenName || apiTokenCreating}
              startIcon={apiTokenCreating ? <CircularProgress size={16} /> : <RefreshIcon />}
            >
              {apiTokenCreating ? 'Regenerating...' : 'Regenerate Token'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* API Token Creation Dialog */}
      <Dialog
        open={apiTokenDialogOpen}
        onClose={() => setApiTokenDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VpnKeyIcon />
            Create API Token
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              API tokens are used to authenticate webhook requests. The token value is only shown once during creation and cannot be retrieved later.
            </Typography>
          </Alert>
          {selectedWebhook && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{
                color: "text.secondary"
              }}>
                Webhook ID: {selectedWebhook.id}
              </Typography>
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                URL: {selectedWebhook.url}
              </Typography>
            </Box>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Token Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newApiTokenName}
            onChange={(e) => setNewApiTokenName(e.target.value)}
            helperText="A descriptive name to identify this token"
            sx={{ mb: 2 }}
          />
          {createdApiTokens[selectedWebhook?.id || ''] && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Token created successfully! Copy it now:
              </Typography>
              <TextField
                value={createdApiTokens[selectedWebhook?.id || '']}
                fullWidth
                size="small"
                slotProps={{
                  input: {
                    readOnly: true,
                    style: { fontFamily: 'var(--font-mono)', fontSize: '12px' },
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => {
                            navigator.clipboard.writeText(createdApiTokens[selectedWebhook?.id || '']);
                            setSnackbar({
                              open: true,
                              message: "Token copied to clipboard",
                              severity: "success",
                            });
                          }}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                ⚠️ This token will not be shown again after closing this dialog!
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setApiTokenDialogOpen(false);
            setNewApiTokenName("");
            // Clear the created token after closing
            if (selectedWebhook) {
              setCreatedApiTokens(prev => {
                const newTokens = { ...prev };
                delete newTokens[selectedWebhook.id];
                return newTokens;
              });
            }
          }}>
            Close
          </Button>
          {!createdApiTokens[selectedWebhook?.id || ''] && (
            <Button
              onClick={handleCreateApiToken}
              variant="contained"
              disabled={!newApiTokenName || apiTokenCreating}
              startIcon={apiTokenCreating ? <CircularProgress size={16} /> : <VpnKeyIcon />}
            >
              {apiTokenCreating ? 'Creating...' : 'Create Token'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delivery History Dialog */}
      <Dialog
        open={deliveryDialogOpen}
        onClose={() => setDeliveryDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon />
            Webhook Delivery History
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedWebhook && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1">
                Webhook ID: {selectedWebhook.id}
              </Typography>
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                URL: {selectedWebhook.url}
              </Typography>
            </Box>
          )}
          {loadingDeliveries ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress />
            </Box>
          ) : deliveryHistory.length === 0 ? (
            <Typography
              variant="body1"
              sx={{
                color: "text.secondary",
                textAlign: 'center',
                py: 3
              }}>
              No delivery history available
            </Typography>
          ) : (
            <TableContainer component={Paper} elevation={0} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Delivery ID</TableCell>
                    <TableCell>Event</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Response Code</TableCell>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Attempts</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deliveryHistory.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'var(--font-mono)' }}>
                          {delivery.id.substring(0, 8)}...
                        </Typography>
                      </TableCell>
                      <TableCell>{delivery.eventType}</TableCell>
                      <TableCell>
                        <Chip
                          label={delivery.status}
                          color={delivery.status === 'success' ? 'success' : delivery.status === 'failed' ? 'error' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{(delivery.response as any)?.statusCode || '-'}</TableCell>
                      <TableCell>{new Date(delivery.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{delivery.attempts || 1}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeliveryDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </AdminPage>
  );

  function renderWebhookTable() {
    if (loading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (filteredWebhooks.length === 0) {
      return (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="h6" sx={{
            color: "text.secondary"
          }}>
            No webhooks found
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ mt: 2 }}
          >
            Create Your First Webhook
          </Button>
        </Box>
      );
    }

    return (
      <>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Webhook ID</TableCell>
                <TableCell>URL</TableCell>
                <TableCell>Secret</TableCell>
                <TableCell>API Token</TableCell>
                <TableCell>Events</TableCell>
                <TableCell>Stats</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedWebhooks.map((webhook) => (
                <TableRow key={webhook.id}>
                  <TableCell>
                    <Chip
                      label={webhook.isActive ? "active" : "inactive"}
                      color={webhook.isActive ? "success" : "default"}
                      size="small"
                      icon={
                        webhook.isActive ? (
                          <CheckCircleIcon />
                        ) : (
                          <ErrorIcon />
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>{webhook.id}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.875rem',
                          maxWidth: '300px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={webhook.url}
                      >
                        {basePath}{webhook.url}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => {
                          navigator.clipboard.writeText(`${basePath}${webhook.url}`);
                          setSnackbar({
                            open: true,
                            message: "Webhook URL copied to clipboard",
                            severity: "info",
                          });
                        }}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <TextField
                        value={
                          secretVisibility[webhook.id]
                            ? (webhookSecrets[webhook.id] || webhook.secret || "Only shown on creation")
                            : "•".repeat(20)
                        }
                        size="small"
                        slotProps={{
                          input: {
                            readOnly: true,
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  size="small"
                                  onClick={() => toggleSecretVisibility(webhook.id)}
                                >
                                  {secretVisibility[webhook.id] ? (
                                    <VisibilityOffIcon fontSize="small" />
                                  ) : (
                                    <VisibilityIcon fontSize="small" />
                                  )}
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => copySecretToClipboard(webhook.id)}
                                >
                                  <ContentCopyIcon fontSize="small" />
                                </IconButton>
                              </InputAdornment>
                            ),
                          },
                        }}
                        sx={{ minWidth: 200 }}
                      />
                      <Tooltip title="Webhook secrets are used for HMAC signature validation to verify that webhook payloads are authentic">
                        <InfoIcon fontSize="small" color="action" />
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: 'wrap' }}>
                      {webhook.apiToken ? (
                        <>
                          {createdApiTokens[webhook.id] ? (
                            <Alert severity="warning" sx={{ flexGrow: 1, width: '100%' }}>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Typography variant="caption" sx={{
                                  fontWeight: 600
                                }}>
                                  New Token Created - Copy Now!
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <TextField
                                    value={
                                      apiTokenVisibility[webhook.id]
                                        ? createdApiTokens[webhook.id]
                                        : "•".repeat(40)
                                    }
                                    size="small"
                                    slotProps={{
                                      input: {
                                        readOnly: true,
                                        style: { fontFamily: 'var(--font-mono)', fontSize: '12px' },
                                        endAdornment: (
                                          <InputAdornment position="end">
                                            <IconButton
                                              size="small"
                                              onClick={() => toggleApiTokenVisibility(webhook.id)}
                                            >
                                              {apiTokenVisibility[webhook.id] ? (
                                                <VisibilityOffIcon fontSize="small" />
                                              ) : (
                                                <VisibilityIcon fontSize="small" />
                                              )}
                                            </IconButton>
                                            <IconButton
                                              size="small"
                                              onClick={() => copyApiTokenToClipboard(webhook)}
                                            >
                                              <ContentCopyIcon fontSize="small" />
                                            </IconButton>
                                          </InputAdornment>
                                        ),
                                      },
                                    }}
                                    sx={{ minWidth: 300 }}
                                  />
                                </Box>
                                <Typography variant="caption" color="error">
                                  ⚠️ This token will not be shown again!
                                </Typography>
                              </Box>
                            </Alert>
                          ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={webhook.apiToken.name}
                                size="small"
                                icon={<VpnKeyIcon />}
                                color={webhook.apiToken.isActive ? "success" : "default"}
                              />
                              <Tooltip title="Regenerate token (old token will be invalidated)">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedWebhook(webhook);
                                    setNewApiTokenName(webhook.apiToken?.name || '');
                                    setRegenerateDialogOpen(true);
                                  }}
                                >
                                  <RefreshIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete token">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this API token? This action cannot be undone.')) {
                                      handleDeleteApiToken(webhook.apiToken?.id || '');
                                    }
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {webhook.apiToken.lastUsedAt && (
                                <Typography variant="caption" sx={{
                                  color: "text.secondary"
                                }}>
                                  Last used: {new Date(webhook.apiToken.lastUsedAt).toLocaleDateString()}
                                </Typography>
                              )}
                            </Box>
                          )}
                        </>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<VpnKeyIcon />}
                          onClick={() => openApiTokenDialog(webhook)}
                        >
                          Create Token
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {webhook.events && webhook.events.length > 0
                      ? webhook.events.join(", ")
                      : "All events"}
                  </TableCell>
                  <TableCell>
                    {webhook.count ? (
                      <Box>
                        <Typography variant="body2">
                          Deliveries: {webhook.count.deliveries || 0}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{
                        color: "text.secondary"
                      }}>
                        No deliveries yet
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Delivery History">
                      <IconButton
                        size="small"
                        onClick={() => openDeliveryDialog(webhook)}
                      >
                        <HistoryIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Test">
                      <IconButton
                        size="small"
                        onClick={() => openTestDialog(webhook)}
                      >
                        <SendIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => openEditDialog(webhook)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => openDeleteDialog(webhook)}
                        color="error"
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
        <TablePagination
          component="div"
          count={filteredWebhooks.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </>
    );
  }
};

export default WebhookManagement;
