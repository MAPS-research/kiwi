import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
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
  Tooltip,
  Typography,
} from "@mui/material";
import {
  AddOutlined as AddIcon,
  DeleteOutlined as DeleteIcon,
  EditOutlined as EditIcon,
  PlayArrowOutlined as TestIcon,
  RefreshOutlined as RefreshIcon,
  LinkOffOutlined as UnassignIcon,
} from "@mui/icons-material";
import { useParams } from "react-router-dom";
import { mcpAdminApiClient, toolConfigApiClient } from "../../utils/api.ts";
import type {
  ClassMcpServerResponseDto,
  McpServerResponseDto,
  McpServerTestResponseDto,
  ToolConfigResponseDto,
} from "../../services/models/index.ts";
import { MCPServerDialog } from "../../components/MCP/MCPServerDialog.tsx";
import { MCPTestResultDialog } from "../../components/MCP/MCPTestResultDialog.tsx";
import { DeleteConfirmDialog } from "../../components/MCP/DeleteConfirmDialog.tsx";
import { ToolConfigPanel } from "../../components/MCP/ToolConfigPanel.tsx";
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
      id={`mcp-tabpanel-${index}`}
      aria-labelledby={`mcp-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export const ClassMCPSettings: React.FC = () => {
  const { classID } = useParams<{ classID: string }>();
  const [tabValue, setTabValue] = useState(0);

  // Assigned servers state (ClassMcpServerResponseDto - contains nested mcpServer)
  const [assignedServers, setAssignedServers] = useState<ClassMcpServerResponseDto[]>([]);
  const [loadingServers, setLoadingServers] = useState(true);

  // Global servers state (for assignment modal)
  const [globalServers, setGlobalServers] = useState<McpServerResponseDto[]>([]);
  const [loadingGlobalServers, setLoadingGlobalServers] = useState(false);

  // Tools state
  const [tools, setTools] = useState<ToolConfigResponseDto[]>([]);
  const [loadingTools, setLoadingTools] = useState(true);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServerResponseDto | null>(null);
  const [saving, setSaving] = useState(false);

  // Assignment modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedServers, setSelectedServers] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);

  // Test dialog states
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testResult, setTestResult] = useState<McpServerTestResponseDto | null>(null);
  const [testing, setTesting] = useState(false);

  // Unassign dialog states
  const [unassignDialogOpen, setUnassignDialogOpen] = useState(false);
  const [serverToUnassign, setServerToUnassign] = useState<ClassMcpServerResponseDto | null>(null);
  const [unassigning, setUnassigning] = useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // Fetch servers assigned to this class
  const fetchAssignedServers = async () => {
    if (!classID) return;
    try {
      setLoadingServers(true);
      const data = await mcpAdminApiClient.mcpAdminControllerGetClassServers({
        classId: classID,
      });
      setAssignedServers(data);
    } catch (error) {
      console.error("Error fetching assigned servers:", error);
      showSnackbar("Failed to load MCP servers", "error");
    } finally {
      setLoadingServers(false);
    }
  };

  // Fetch all global servers (for assignment modal)
  const fetchGlobalServers = async () => {
    try {
      setLoadingGlobalServers(true);
      const data = await mcpAdminApiClient.mcpAdminControllerListMcpServers();
      setGlobalServers(data);
    } catch (error) {
      console.error("Error fetching global servers:", error);
      showSnackbar("Failed to load global servers", "error");
    } finally {
      setLoadingGlobalServers(false);
    }
  };

  const fetchTools = async () => {
    if (!classID) return;
    try {
      setLoadingTools(true);
      const data = await toolConfigApiClient.toolConfigControllerGetToolsForClass({
        classId: classID,
      });
      setTools(data);
    } catch (error) {
      console.error("Error fetching tools:", error);
      showSnackbar("Failed to load tool configurations", "error");
    } finally {
      setLoadingTools(false);
    }
  };

  useEffect(() => {
    fetchAssignedServers();
    fetchTools();
  }, [classID]);

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Server handlers
  const handleAddServer = () => {
    setEditingServer(null);
    setDialogOpen(true);
  };

  const handleEditServer = (assignment: ClassMcpServerResponseDto) => {
    // For editing, we need to fetch the full server data
    // The mcpServer in assignment only has McpServerInfoDto (limited info)
    // We'll use the serverId to get full data
    mcpAdminApiClient.mcpAdminControllerGetMcpServer({ id: assignment.mcpServerId })
      .then((server) => {
        setEditingServer(server);
        setDialogOpen(true);
      })
      .catch((error) => {
        console.error("Error fetching server details:", error);
        showSnackbar("Failed to load server details", "error");
      });
  };

  const handleUnassignClick = (assignment: ClassMcpServerResponseDto) => {
    setServerToUnassign(assignment);
    setUnassignDialogOpen(true);
  };

  const handleUnassignConfirm = async () => {
    if (!serverToUnassign || !classID) return;

    try {
      setUnassigning(true);
      await mcpAdminApiClient.mcpAdminControllerRemoveServerFromClass({
        classId: classID,
        serverId: serverToUnassign.mcpServerId,
      });

      setAssignedServers((prev) => prev.filter((s) => s.id !== serverToUnassign.id));
      showSnackbar("Server unassigned from class successfully", "success");
      // Refresh tools as they may have been affected
      fetchTools();
    } catch (error) {
      console.error("Error unassigning server:", error);
      showSnackbar("Failed to unassign server", "error");
    } finally {
      setUnassigning(false);
      setUnassignDialogOpen(false);
      setServerToUnassign(null);
    }
  };

  const handleTestServer = async (serverId: string) => {
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

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingServer(null);
  };

  const handleSaveServer = async (data: any) => {
    if (!classID) return;

    try {
      setSaving(true);

      if (editingServer) {
        // Update existing server
        await mcpAdminApiClient.mcpAdminControllerUpdateMcpServer({
          id: editingServer.id,
          updateMcpServerDto: data,
        });

        // Refresh the list to get updated data
        await fetchAssignedServers();
        showSnackbar("MCP server updated successfully", "success");
      } else {
        // Create new global server
        const created = await mcpAdminApiClient.mcpAdminControllerCreateMcpServer({
          createMcpServerDto: data,
        });

        // Assign to this class
        await mcpAdminApiClient.mcpAdminControllerAssignServerToClass({
          serverId: created.id,
          assignMcpServerDto: {
            classId: classID,
            isEnabled: true,
          },
        });

        // Refresh the list
        await fetchAssignedServers();
        showSnackbar("MCP server created and assigned successfully", "success");
        // Refresh tools as new MCP tools may be available
        fetchTools();
      }

      handleDialogClose();
    } catch (error) {
      console.error("Error saving server:", error);
      showSnackbar("Failed to save MCP server", "error");
    } finally {
      setSaving(false);
    }
  };

  // Assignment modal handlers
  const handleOpenAssignModal = async () => {
    await fetchGlobalServers();
    // Pre-select already assigned servers
    const assignedIds = new Set(assignedServers.map((s) => s.mcpServerId));
    setSelectedServers(assignedIds);
    setAssignModalOpen(true);
  };

  const handleCloseAssignModal = () => {
    setAssignModalOpen(false);
    setSelectedServers(new Set());
  };

  const handleToggleServer = (serverId: string) => {
    setSelectedServers((prev) => {
      const next = new Set(prev);
      if (next.has(serverId)) {
        next.delete(serverId);
      } else {
        next.add(serverId);
      }
      return next;
    });
  };

  const handleSaveAssignments = async () => {
    if (!classID) return;

    try {
      setAssigning(true);

      const currentlyAssigned = new Set(assignedServers.map((s) => s.mcpServerId));

      // Servers to assign (in selected but not currently assigned)
      const toAssign = [...selectedServers].filter((id) => !currentlyAssigned.has(id));

      // Servers to unassign (in currently assigned but not selected)
      const toUnassign = [...currentlyAssigned].filter((id) => !selectedServers.has(id));

      // Assign new servers
      for (const serverId of toAssign) {
        await mcpAdminApiClient.mcpAdminControllerAssignServerToClass({
          serverId,
          assignMcpServerDto: {
            classId: classID,
            isEnabled: true,
          },
        });
      }

      // Unassign removed servers
      for (const serverId of toUnassign) {
        await mcpAdminApiClient.mcpAdminControllerRemoveServerFromClass({
          classId: classID,
          serverId,
        });
      }

      // Refresh the list
      await fetchAssignedServers();
      showSnackbar("Server assignments updated successfully", "success");
      fetchTools();
      handleCloseAssignModal();
    } catch (error) {
      console.error("Error updating assignments:", error);
      showSnackbar("Failed to update server assignments", "error");
    } finally {
      setAssigning(false);
    }
  };

  // Toggle enabled status for a class-server assignment
  const handleToggleEnabled = async (assignment: ClassMcpServerResponseDto) => {
    if (!classID) return;

    try {
      const updated = await mcpAdminApiClient.mcpAdminControllerUpdateClassServerSettings({
        classId: classID,
        serverId: assignment.mcpServerId,
        updateClassMcpServerDto: {
          isEnabled: !assignment.isEnabled,
        },
      });

      setAssignedServers((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
      showSnackbar(
        `Server ${updated.isEnabled ? "enabled" : "disabled"} for this class`,
        "success"
      );
    } catch (error) {
      console.error("Error updating server status:", error);
      showSnackbar("Failed to update server status", "error");
    }
  };

  // Tool handlers
  const handleToolToggle = async (toolId: string, enabled: boolean) => {
    try {
      const updated = await toolConfigApiClient.toolConfigControllerUpdateToolConfig({
        toolConfigId: toolId,
        updateToolStatusDto: { isEnabled: enabled, classId: classID },
      });

      setTools((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t))
      );
      showSnackbar(
        `Tool ${enabled ? "enabled" : "disabled"} successfully`,
        "success"
      );
    } catch (error) {
      console.error("Error updating tool:", error);
      showSnackbar("Failed to update tool configuration", "error");
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

  // Get unassigned global servers for the modal
  const getUnassignedServers = () => {
    const assignedIds = new Set(assignedServers.map((s) => s.mcpServerId));
    return globalServers.filter((s) => !assignedIds.has(s.id));
  };

  return (
    <AdminPage>
      <AdminPageHeader
        title="MCP Settings"
        description="Configure MCP servers and manage tool availability for this class."
      />

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="MCP Servers" id="mcp-tab-0" aria-controls="mcp-tabpanel-0" />
          <Tab label="Tool Configuration" id="mcp-tab-1" aria-controls="mcp-tabpanel-1" />
        </Tabs>
      </Box>

      {/* MCP Servers Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchAssignedServers}
              disabled={loadingServers}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleOpenAssignModal}
            >
              Assign Servers
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddServer}
            >
              Create New Server
            </Button>
          </Box>
        </Box>

        {loadingServers ? (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Transport</TableCell>
                  <TableCell>Enabled</TableCell>
                  <TableCell>Global Status</TableCell>
                  <TableCell>OAuth</TableCell>
                  <TableCell>Actions</TableCell>
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
        ) : assignedServers.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="h6" gutterBottom sx={{
              color: "text.secondary"
            }}>
              No MCP Servers Assigned
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                mb: 2
              }}>
              Assign existing servers or create a new one to enable AI tool integrations for this class.
            </Typography>
            <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleOpenAssignModal}
              >
                Assign Existing Servers
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddServer}
              >
                Create New Server
              </Button>
            </Box>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Transport</TableCell>
                  <TableCell>Enabled</TableCell>
                  <TableCell>Global Status</TableCell>
                  <TableCell>OAuth</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assignedServers.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{
                        fontWeight: 500
                      }}>
                        {assignment.displayName || assignment.mcpServer.name}
                      </Typography>
                      {assignment.mcpServer.description && (
                        <Typography variant="caption" sx={{
                          color: "text.secondary"
                        }}>
                          {assignment.mcpServer.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={assignment.mcpServer.transport.toUpperCase()}
                        size="small"
                        color={getTransportChipColor(assignment.mcpServer.transport)}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={assignment.isEnabled}
                        onChange={() => handleToggleEnabled(assignment)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={assignment.mcpServer.isActive ? "Active" : "Inactive"}
                        size="small"
                        color={assignment.mcpServer.isActive ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell>
                      {assignment.mcpServer.requiresOAuth ? (
                        <Chip label="Required" size="small" color="warning" />
                      ) : (
                        <Chip label="No" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Test Connection">
                        <IconButton
                          size="small"
                          onClick={() => handleTestServer(assignment.mcpServerId)}
                        >
                          <TestIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Server">
                        <IconButton
                          size="small"
                          onClick={() => handleEditServer(assignment)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Unassign from Class">
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => handleUnassignClick(assignment)}
                        >
                          <UnassignIcon />
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

      {/* Tool Configuration Tab */}
      <TabPanel value={tabValue} index={1}>
        <ToolConfigPanel
          tools={tools}
          loading={loadingTools}
          onToolToggle={handleToolToggle}
          onRefresh={fetchTools}
        />
      </TabPanel>

      {/* Create/Edit Dialog */}
      <MCPServerDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSave={handleSaveServer}
        server={editingServer}
        classId={classID}
        saving={saving}
      />

      {/* Test Result Dialog */}
      <MCPTestResultDialog
        open={testDialogOpen}
        onClose={() => setTestDialogOpen(false)}
        testResult={testResult}
        loading={testing}
      />

      {/* Unassign Confirmation Dialog */}
      <DeleteConfirmDialog
        open={unassignDialogOpen}
        onClose={() => {
          setUnassignDialogOpen(false);
          setServerToUnassign(null);
        }}
        onConfirm={handleUnassignConfirm}
        title="Unassign MCP Server"
        content={`Are you sure you want to unassign "${serverToUnassign?.mcpServer?.name}" from this class? The server will remain available globally and can be reassigned later.`}
        deleting={unassigning}
      />

      {/* Assignment Modal */}
      <Dialog
        open={assignModalOpen}
        onClose={handleCloseAssignModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Assign MCP Servers</DialogTitle>
        <DialogContent dividers>
          {loadingGlobalServers ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <Typography>Loading servers...</Typography>
            </Box>
          ) : globalServers.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                No global servers available. Create a new server first.
              </Typography>
            </Box>
          ) : (
            <List>
              {globalServers.map((server) => {
                const isAssigned = assignedServers.some((s) => s.mcpServerId === server.id);
                const isSelected = selectedServers.has(server.id);
                return (
                  <ListItemButton
                    key={server.id}
                    dense
                    onClick={() => handleToggleServer(server.id)}
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
                          {server.name}
                          <Chip
                            label={server.transport.toUpperCase()}
                            size="small"
                            color={getTransportChipColor(server.transport)}
                          />
                          {!server.isActive && (
                            <Chip label="Inactive" size="small" color="default" />
                          )}
                        </Box>
                      }
                      secondary={server.description}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAssignModal} disabled={assigning}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveAssignments}
            variant="contained"
            disabled={assigning || loadingGlobalServers}
          >
            {assigning ? "Saving..." : "Save Assignments"}
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

export default ClassMCPSettings;
