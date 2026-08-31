import React, { useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import {
  CheckCircleOutline as SuccessIcon,
  ErrorOutline as ErrorIcon,
  BuildOutlined as ToolIcon,
  ExpandMoreOutlined as ExpandMoreIcon,
  ExpandLessOutlined as ExpandLessIcon,
} from "@mui/icons-material";
import type { McpServerTestResponseDto } from "../../services/models";

interface MCPTestResultDialogProps {
  open: boolean;
  onClose: () => void;
  testResult: McpServerTestResponseDto | null;
  loading: boolean;
}

interface ToolInfo {
  name: string;
  description?: string;
  inputSchema?: object;
}

export const MCPTestResultDialog: React.FC<MCPTestResultDialogProps> = ({
  open,
  onClose,
  testResult,
  loading,
}) => {
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  const tools = (testResult?.tools || []) as ToolInfo[];

  const handleToggleExpand = (toolName: string) => {
    setExpandedTool((prev) => (prev === toolName ? null : toolName));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Connection Test Result</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              py: 4,
            }}
          >
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              Testing connection to MCP server...
            </Typography>
          </Box>
        ) : testResult ? (
          <Box>
            {/* Status */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                mb: 3,
                p: 2,
                bgcolor: testResult.success
                  ? "success.light"
                  : "error.light",
                borderRadius: 1,
              }}
            >
              {testResult.success ? (
                <SuccessIcon sx={{ fontSize: 40, color: "success.dark" }} />
              ) : (
                <ErrorIcon sx={{ fontSize: 40, color: "error.dark" }} />
              )}
              <Box>
                <Typography variant="h6">
                  {testResult.success ? "Connection Successful" : "Connection Failed"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {testResult.success
                    ? `Found ${tools.length} available tool${tools.length !== 1 ? "s" : ""}`
                    : testResult.error || "Unknown error occurred"}
                </Typography>
              </Box>
            </Box>

            {/* Tools List */}
            {testResult.success && tools.length > 0 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Available Tools
                </Typography>
                <List disablePadding>
                  {tools.map((tool, index) => (
                    <Paper
                      key={tool.name || index}
                      variant="outlined"
                      sx={{ mb: 1 }}
                    >
                      <ListItem
                        sx={{ cursor: tool.inputSchema ? "pointer" : "default" }}
                        onClick={() =>
                          tool.inputSchema && handleToggleExpand(tool.name)
                        }
                      >
                        <ListItemIcon>
                          <ToolIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Typography variant="body1" fontWeight={500}>
                                {tool.name}
                              </Typography>
                            </Box>
                          }
                          secondary={tool.description || "No description"}
                        />
                        {tool.inputSchema && (
                          <IconButton size="small">
                            {expandedTool === tool.name ? (
                              <ExpandLessIcon />
                            ) : (
                              <ExpandMoreIcon />
                            )}
                          </IconButton>
                        )}
                      </ListItem>

                      {/* Input Schema */}
                      {tool.inputSchema && (
                        <Collapse in={expandedTool === tool.name}>
                          <Divider />
                          <Box sx={{ p: 2, bgcolor: "grey.50" }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              gutterBottom
                              sx={{ display: "block" }}
                            >
                              Input Schema
                            </Typography>
                            <Box
                              component="pre"
                              sx={{
                                p: 1,
                                bgcolor: "grey.100",
                                borderRadius: 1,
                                overflow: "auto",
                                fontSize: "0.75rem",
                                m: 0,
                              }}
                            >
                              {JSON.stringify(tool.inputSchema, null, 2)}
                            </Box>
                          </Box>
                        </Collapse>
                      )}
                    </Paper>
                  ))}
                </List>
              </Box>
            )}

            {/* No tools message */}
            {testResult.success && tools.length === 0 && (
              <Paper sx={{ p: 3, textAlign: "center", bgcolor: "grey.50" }}>
                <Typography variant="body2" color="text.secondary">
                  No tools were returned by the MCP server.
                  <br />
                  The server connection is working, but no tools are available.
                </Typography>
              </Paper>
            )}

            {/* Error details */}
            {!testResult.success && testResult.error && (
              <Paper sx={{ p: 2, bgcolor: "error.light", mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Error Details
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: "monospace",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
                  {testResult.error}
                </Typography>
              </Paper>
            )}
          </Box>
        ) : (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No test results available
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default MCPTestResultDialog;
