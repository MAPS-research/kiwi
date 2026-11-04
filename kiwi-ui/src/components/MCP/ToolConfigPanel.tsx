import React from "react";
import {
  Box,
  Button,
  Chip,
  Paper,
  Skeleton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { RefreshOutlined as RefreshIcon } from "@mui/icons-material";
import type { ToolConfigResponseDto } from "../../services/models/index.ts";

interface ToolConfigPanelProps {
  tools: ToolConfigResponseDto[];
  loading: boolean;
  onToolToggle: (toolId: string, enabled: boolean) => void;
  onRefresh: () => void;
}

export const ToolConfigPanel: React.FC<ToolConfigPanelProps> = ({
  tools,
  loading,
  onToolToggle,
  onRefresh,
}) => {
  const getToolTypeLabel = (toolType: string) => {
    switch (toolType) {
      case "RAG":
        return "RAG";
      case "CodeInterpreter":
        return "Code Interpreter";
      case "MCP":
        return "MCP Tool";
      default:
        return toolType;
    }
  };

  // Group tools by type
  const builtInTools = tools.filter((t) => t.toolType !== "MCP");
  const mcpTools = tools.filter((t) => t.toolType === "MCP");

  if (loading) {
    return (
      <Box>
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} disabled>
            Refresh
          </Button>
        </Box>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Tool</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Chat Types</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Enabled</TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  }

  if (tools.length === 0) {
    return (
      <Box>
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
          >
            Refresh
          </Button>
        </Box>
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" gutterBottom sx={{
            color: "text.secondary"
          }}>
            No Tools Available
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            Add MCP servers to enable additional tools for this class.
            Built-in tools (RAG and Code Interpreter) should appear automatically.
          </Typography>
        </Paper>
      </Box>
    );
  }

  const renderToolsTable = (toolList: ToolConfigResponseDto[], title: string) => {
    if (toolList.length === 0) return null;

    return (
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" gutterBottom>
          {title}
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tool Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Chat Types</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell align="right">Enabled</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {toolList.map((tool) => {
                const mcpServer = tool.mcpServer as any;
                return (
                  <TableRow key={tool.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{
                        fontWeight: 600
                      }}>
                        {tool.toolName}
                      </Typography>
                      {tool.toolType === "MCP" && mcpServer?.name && (
                        <Typography variant="caption" sx={{
                          color: "text.secondary"
                        }}>
                          from {mcpServer.name}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {/* A category is a neutral role chip: no hue, no status colour. */}
                      <Chip
                        label={getToolTypeLabel(tool.toolType)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                        {tool.chatTypes.length > 0 ? (
                          tool.chatTypes.map((ct) => (
                            <Chip
                              key={ct}
                              label={ct}
                              size="small"
                            />
                          ))
                        ) : (
                          <Typography variant="caption" sx={{
                            color: "text.secondary"
                          }}>
                            All
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>{tool.priority}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip
                        title={
                          tool.toolType === "MCP" && mcpServer?.requiresOAuth
                            ? "Requires user OAuth authentication"
                            : tool.isEnabled
                            ? "Click to disable"
                            : "Click to enable"
                        }
                      >
                        <Box sx={{ display: "inline-flex", alignItems: "center" }}>
                          <Switch
                            checked={tool.isEnabled}
                            onChange={(e) =>
                              onToolToggle(tool.id, e.target.checked)
                            }
                            size="small"
                          />
                          {tool.toolType === "MCP" && mcpServer?.requiresOAuth && (
                            <Chip
                              label="OAuth"
                              size="small"
                              color="warning"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Enable or disable tools available to students in the chat. Higher priority tools are preferred
          when multiple tools can handle the same request.
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={onRefresh}
        >
          Refresh
        </Button>
      </Box>

      {renderToolsTable(builtInTools, "Built-in Tools")}
      {renderToolsTable(mcpTools, "MCP Tools")}
    </Box>
  );
};

export default ToolConfigPanel;
