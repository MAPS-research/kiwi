import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Paper,
  Skeleton,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  AddOutlined as AddIcon,
  DeleteOutlined as DeleteIcon,
  EditOutlined as EditIcon,
  LinkOutlined as LinkIcon,
  PlayArrowOutlined as TestIcon,
  RefreshOutlined as RefreshIcon,
} from "@mui/icons-material";
import { mcpAdminApiClient, mcpUserApiClient } from "../../utils/api.ts";
import type { McpServerResponseDto, McpServerTestResponseDto } from "../../services/models/index.ts";
import { MCPServerDialog } from "../../components/MCP/MCPServerDialog.tsx";
import { MCPTestResultDialog } from "../../components/MCP/MCPTestResultDialog.tsx";
import { DeleteConfirmDialog } from "../../components/MCP/DeleteConfirmDialog.tsx";
import { AdminPage, AdminPageHeader } from "../../components/AdminPage/index.ts";

export const MCPServerManagement: React.FC = () => {
  // Global servers state
  const [servers, setServers] = useState<McpServerResponseDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServerResponseDto | null>(null);
  const [saving, setSaving] = useState(false);

  // Test dialog states
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testResult, setTestResult] = useState<McpServerTestResponseDto | null>(null);
  const [testing, setTesting] = useState(false);

  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<McpServerResponseDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  // OAuth authorization dialog states
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [serverToAuth, setServerToAuth] = useState<McpServerResponseDto | null>(null);
  const [authorizing, setAuthorizing] = useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning";
  }>({ open: false, message: "", severity: "success" });

  // Fetch all global servers
  const fetchServers = async () => {
    try {
      setLoading(true);
      const data = await mcpAdminApiClient.mcpAdminControllerListMcpServers();
      setServers(data);
    } catch (error) {
      console.error("Error fetching servers:", error);
      showSnackbar("Failed to load MCP servers", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const showSnackbar = (message: string, severity: "success" | "error" | "warning") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleAddServer = () => {
    setEditingServer(null);
    setDialogOpen(true);
  };

  const handleEditServer = (server: McpServerResponseDto) => {
    setEditingServer(server);
    setDialogOpen(true);
  };

  const handleDeleteClick = (server: McpServerResponseDto) => {
    setServerToDelete(server);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!serverToDelete) return;

    try {
      setDeleting(true);
      await mcpAdminApiClient.mcpAdminControllerDeleteMcpServer({
        id: serverToDelete.id,
      });

      setServers((prev) => prev.filter((s) => s.id !== serverToDelete.id));
      showSnackbar("MCP server deleted successfully", "success");
    } catch (error) {
      console.error("Error deleting server:", error);
      showSnackbar("Failed to delete MCP server", "error");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setServerToDelete(null);
    }
  };

  const handleTestServer = async (serverId: string) => {
    const server = servers.find((s) => s.id === serverId);
    if (!server) return;

    // Check if server requires OAuth
    if (server.requiresOAuth) {
      try {
        // Check if user has an existing connection
        const connections = await mcpUserApiClient.mcpUserControllerGetUserConnections();
        const hasConnection = connections.some(
          (conn) => conn.mcpServerId === serverId && conn.isActive
        );

        if (!hasConnection) {
          // Prompt user to authorize first
          setServerToAuth(server);
          setAuthDialogOpen(true);
          return;
        }
      } catch (error) {
        console.error("Error checking user connections:", error);
        // Continue with test anyway - backend will return proper error
      }
    }

    // Proceed with test
    try {
      setTesting(true);
      setTestResult(null);
      setTestDialogOpen(true);

      const result = await mcpAdminApiClient.mcpAdminControllerTestMcpServer({
        id: serverId,
      });

      setTestResult(result);
    } catch (error) {
      console.error("Error testing server:", error);
      setTestResult({
        success: false,
        error: "Failed to test server connection",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleAuthorize = async () => {
    if (!serverToAuth) return;

    try {
      setAuthorizing(true);
      const response = await mcpUserApiClient.mcpUserControllerInitiateOAuth({
        serverId: serverToAuth.id,
      });

      // Store return URL for auto-redirect back after OAuth
      sessionStorage.setItem(
        "mcp_oauth_return",
        JSON.stringify({
          returnTo: "/admin/mcp-servers",
          action: "test",
          serverId: serverToAuth.id,
        })
      );

      // Redirect to OAuth authorization URL
      window.location.href = response.authorizationUrl;
    } catch (error) {
      console.error("Error initiating OAuth:", error);
      showSnackbar("Failed to start authorization", "error");
      setAuthDialogOpen(false);
      setServerToAuth(null);
    } finally {
      setAuthorizing(false);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingServer(null);
  };

  const handleSaveServer = async (data: any) => {
    try {
      setSaving(true);

      if (editingServer) {
        const updated = await mcpAdminApiClient.mcpAdminControllerUpdateMcpServer({
          id: editingServer.id,
          updateMcpServerDto: data,
        });

        setServers((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s))
        );
        showSnackbar("MCP server updated successfully", "success");
      } else {
        // Create new global server (no classId needed)
        const created = await mcpAdminApiClient.mcpAdminControllerCreateMcpServer({
          createMcpServerDto: data,
        });

        setServers((prev) => [...prev, created]);
        showSnackbar("MCP server created successfully", "success");
      }

      handleDialogClose();
    } catch (error) {
      console.error("Error saving server:", error);
      showSnackbar("Failed to save MCP server", "error");
    } finally {
      setSaving(false);
    }
  };

  const getTransportChipColor = (transport: string) => {
    switch (transport) {
      case "http":
        return "primary";
      case "sse":
        return "secondary";
      case "stdio":
        return "default";
      default:
        return "default";
    }
  };

  // Build delete confirmation message with class count warning
  const getDeleteMessage = () => {
    if (!serverToDelete) return "";

    const classCount = serverToDelete.assignedClassCount || 0;
    let message = `Are you sure you want to delete "${serverToDelete.name}"?`;

    if (classCount > 0) {
      message += ` This server is currently assigned to ${classCount} class${classCount > 1 ? "es" : ""}. Deleting it will remove it from all classes.`;
    }

    message += " This action cannot be undone.";
    return message;
  };

  return (
    <AdminPage>
      <AdminPageHeader
        title="MCP Server Management"
        description="Manage global MCP servers and assign them to classes from class settings."
        actions={
          <>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchServers}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddServer}
          >
            Create Server
          </Button>
          </>
        }
      />

      {loading ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Transport</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Assigned Classes</TableCell>
                <TableCell>OAuth</TableCell>
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
      ) : servers.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" gutterBottom sx={{
            color: "text.secondary"
          }}>
            No MCP Servers Configured
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              mb: 2
            }}>
            Create a global MCP server, then assign it to classes from the class MCP settings page.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddServer}
          >
            Create Your First Server
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Transport</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Assigned Classes</TableCell>
                <TableCell>OAuth</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {servers.map((server) => (
                <TableRow key={server.id}>
                  <TableCell>
                    <Typography variant="body2" sx={{
                      fontWeight: 500
                    }}>
                      {server.name}
                    </Typography>
                    {server.description && (
                      <Typography variant="caption" sx={{
                        color: "text.secondary"
                      }}>
                        {server.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={server.transport.toUpperCase()}
                      size="small"
                      color={getTransportChipColor(server.transport)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={server.isActive ? "Active" : "Inactive"}
                      size="small"
                      color={server.isActive ? "success" : "default"}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${server.assignedClassCount || 0} classes`}
                      size="small"
                      variant="outlined"
                      color={(server.assignedClassCount || 0) > 0 ? "info" : "default"}
                    />
                  </TableCell>
                  <TableCell>
                    {server.requiresOAuth ? (
                      <Chip label="Required" size="small" color="warning" />
                    ) : (
                      <Chip label="No" size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Test Connection">
                      <IconButton
                        size="small"
                        onClick={() => handleTestServer(server.id)}
                      >
                        <TestIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleEditServer(server)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteClick(server)}
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

      {/* Create/Edit Dialog */}
      <MCPServerDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSave={handleSaveServer}
        server={editingServer}
        saving={saving}
      />

      {/* Test Result Dialog */}
      <MCPTestResultDialog
        open={testDialogOpen}
        onClose={() => setTestDialogOpen(false)}
        testResult={testResult}
        loading={testing}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setServerToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete MCP Server"
        content={getDeleteMessage()}
        deleting={deleting}
      />

      {/* OAuth Authorization Dialog */}
      <Dialog
        open={authDialogOpen}
        onClose={() => {
          setAuthDialogOpen(false);
          setServerToAuth(null);
        }}
      >
        <DialogTitle>Authorization Required</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The MCP server "{serverToAuth?.name}" requires OAuth authentication.
            You need to authorize your account before testing the connection.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAuthDialogOpen(false);
              setServerToAuth(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAuthorize}
            disabled={authorizing}
            startIcon={
              authorizing ? <CircularProgress size={16} /> : <LinkIcon />
            }
          >
            {authorizing ? "Redirecting..." : "Authorize"}
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

export default MCPServerManagement;
