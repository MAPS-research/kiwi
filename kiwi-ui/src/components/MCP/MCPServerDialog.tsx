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
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  SelectChangeEvent,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  AddOutlined as AddIcon,
  AutorenewOutlined as DiscoverIcon,
  DeleteOutline as DeleteIcon,
  ExpandMoreOutlined as ExpandMoreIcon,
  ExpandLessOutlined as ExpandLessIcon,
  InfoOutlined as InfoIcon,
} from "@mui/icons-material";
import { mcpAdminApiClient } from "../../utils/api";
import type { McpServerResponseDto, CreateMcpServerDto, UpdateMcpServerDto } from "../../services/models";

interface ClassInfo {
  classID: string;
  className: string;
}

interface MCPServerDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CreateMcpServerDto | UpdateMcpServerDto) => Promise<void>;
  server?: McpServerResponseDto | null;
  classId?: string; // Optional - servers are now global
  saving: boolean;
  classes?: ClassInfo[];
  onClassChange?: (classId: string) => void;
  showClassSelector?: boolean;
}

interface KeyValuePair {
  key: string;
  value: string;
}

interface FormData {
  name: string;
  description: string;
  transport: "sse" | "http";
  isActive: boolean;
  requiresOAuth: boolean;
  // HTTP/SSE config
  url: string;
  headers: KeyValuePair[];
  // OAuth config
  authorizationUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string;
  redirectUri: string;
  // Dynamic Client Registration
  registrationEndpoint: string;
  clientRegistered: boolean;
}

const initialFormData: FormData = {
  name: "",
  description: "",
  transport: "http",
  isActive: true,
  requiresOAuth: false,
  url: "",
  headers: [],
  authorizationUrl: "",
  tokenUrl: "",
  clientId: "",
  clientSecret: "",
  scopes: "",
  redirectUri: "",
  registrationEndpoint: "",
  clientRegistered: false,
};

export const MCPServerDialog: React.FC<MCPServerDialogProps> = ({
  open,
  onClose,
  onSave,
  server,
  classId,
  saving,
  classes,
  onClassChange,
  showClassSelector,
}) => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [oauthExpanded, setOauthExpanded] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [discovering, setDiscovering] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<{
    success: boolean;
    message: string;
    source?: string;
  } | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<{
    success: boolean;
    message: string;
    clientId?: string;
  } | null>(null);

  const isEditMode = !!server;

  useEffect(() => {
    if (open) {
      if (server) {
        // Edit mode - populate form with server data
        const config = server.config as any;
        const oauth = server.oauthMetadata as any;

        // Check if client was registered via DCR (has dcrRegisteredAt timestamp)
        const wasRegisteredViaDCR = !!oauth?.dcrRegisteredAt;

        setFormData({
          name: server.name,
          description: server.description || "",
          transport: server.transport as "sse" | "http",
          isActive: server.isActive,
          requiresOAuth: server.requiresOAuth,
          url: config?.url || "",
          headers: config?.headers
            ? Object.entries(config.headers).map(([key, value]) => ({
                key,
                value: value as string,
              }))
            : [],
          authorizationUrl: oauth?.authorizationUrl || "",
          tokenUrl: oauth?.tokenUrl || "",
          clientId: oauth?.clientId || "",
          clientSecret: "", // Never pre-populate secrets
          scopes: oauth?.scopes?.join(", ") || "",
          redirectUri: oauth?.redirectUri || "",
          registrationEndpoint: oauth?.registrationEndpoint || "",
          clientRegistered: wasRegisteredViaDCR,
        });
        setOauthExpanded(server.requiresOAuth);
      } else {
        // Create mode - reset form
        setFormData(initialFormData);
        setOauthExpanded(false);
      }
      setErrors({});
      setDiscoveryResult(null);
      setDiscovering(false);
      setRegistrationResult(null);
      setRegistering(false);
    }
  }, [open, server]);

  const handleChange = (field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSwitchChange = (field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = event.target.checked;
    setFormData((prev) => ({ ...prev, [field]: newValue }));

    if (field === "requiresOAuth") {
      setOauthExpanded(newValue);

      // Auto-discover when enabling OAuth (if URL exists and OAuth fields are empty)
      if (newValue && formData.url.trim() && !formData.authorizationUrl && !formData.tokenUrl) {
        setTimeout(() => handleOAuthDiscovery(), 100);
      }

      // Clear discovery result when disabling
      if (!newValue) {
        setDiscoveryResult(null);
      }
    }
  };

  const handleTransportChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      transport: event.target.value as "sse" | "http",
    }));
    setErrors({});
  };

  const handleAddHeader = () => {
    setFormData((prev) => ({
      ...prev,
      headers: [...prev.headers, { key: "", value: "" }],
    }));
  };

  const handleRemoveHeader = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      headers: prev.headers.filter((_, i) => i !== index),
    }));
  };

  const handleHeaderChange = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      headers: prev.headers.map((h, i) =>
        i === index ? { ...h, [field]: value } : h
      ),
    }));
  };

  const handleOAuthDiscovery = async () => {
    if (!formData.url.trim()) {
      setDiscoveryResult({
        success: false,
        message: "Please enter a Server URL first",
      });
      return;
    }

    if (!formData.url.startsWith("http://") && !formData.url.startsWith("https://")) {
      setDiscoveryResult({
        success: false,
        message: "Server URL must start with http:// or https://",
      });
      return;
    }

    setDiscovering(true);
    setDiscoveryResult(null);

    try {
      const result = await mcpAdminApiClient.mcpAdminControllerDiscoverOAuthMetadata({
        oAuthDiscoverRequestDto: { url: formData.url },
      });

      if (result.success) {
        // Auto-fill discovered fields (only if currently empty)
        setFormData((prev) => ({
          ...prev,
          authorizationUrl: prev.authorizationUrl || result.authorizationEndpoint || "",
          tokenUrl: prev.tokenUrl || result.tokenEndpoint || "",
          scopes: prev.scopes || (result.scopesSupported?.join(", ") || ""),
          registrationEndpoint: result.registrationEndpoint || "",
        }));

        const discoveredFields: string[] = [];
        if (result.authorizationEndpoint) discoveredFields.push("Authorization URL");
        if (result.tokenEndpoint) discoveredFields.push("Token URL");
        if (result.scopesSupported?.length) discoveredFields.push("Scopes");
        if (result.registrationEndpoint) discoveredFields.push("Registration Endpoint");

        const sourceLabel = result.source === "rfc8414" ? "RFC 8414" : "OpenID Connect";

        setDiscoveryResult({
          success: true,
          message: `Discovered ${discoveredFields.join(", ")} via ${sourceLabel}`,
          source: result.source,
        });
      } else {
        setDiscoveryResult({
          success: false,
          message: result.error || "No OAuth metadata found",
        });
      }
    } catch (error) {
      setDiscoveryResult({
        success: false,
        message: "Discovery failed. Please enter configuration manually.",
      });
    } finally {
      setDiscovering(false);
    }
  };

  const handleClientRegistration = async () => {
    if (!formData.registrationEndpoint) {
      setRegistrationResult({
        success: false,
        message: "No registration endpoint available",
      });
      return;
    }

    // For new servers, we don't have serverId yet - need to save first
    if (!server?.id) {
      setRegistrationResult({
        success: false,
        message: "Save the server first, then register OAuth client",
      });
      return;
    }

    setRegistering(true);
    setRegistrationResult(null);

    try {
      const result = await mcpAdminApiClient.mcpAdminControllerRegisterOAuthClient({
        oAuthRegisterRequestDto: {
          serverId: server.id,
          registrationEndpoint: formData.registrationEndpoint,
        },
      });

      if (result.success && result.clientId) {
        setFormData((prev) => ({
          ...prev,
          clientId: result.clientId!,
          clientRegistered: true,
        }));
        setRegistrationResult({
          success: true,
          message: "Client registered successfully. Secret stored securely on server.",
          clientId: result.clientId,
        });
      } else {
        setRegistrationResult({
          success: false,
          message: result.error || "Registration failed",
        });
      }
    } catch (error) {
      setRegistrationResult({
        success: false,
        message: "Registration request failed. Please enter credentials manually.",
      });
    } finally {
      setRegistering(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    // URL is required for both http and sse transports
    if (!formData.url.trim()) {
      newErrors.url = "URL is required";
    } else if (!formData.url.startsWith("http://") && !formData.url.startsWith("https://")) {
      newErrors.url = "URL must start with http:// or https://";
    }

    if (formData.requiresOAuth) {
      if (!formData.authorizationUrl.trim()) {
        newErrors.authorizationUrl = "Authorization URL is required";
      }
      if (!formData.tokenUrl.trim()) {
        newErrors.tokenUrl = "Token URL is required";
      }
      if (!formData.clientId.trim()) {
        newErrors.clientId = "Client ID is required";
      }
      // Only require client secret for new servers that weren't auto-registered
      if (!isEditMode && !formData.clientSecret.trim() && !formData.clientRegistered) {
        newErrors.clientSecret = "Client Secret is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    // Build config for http/sse transport
    const config = {
      url: formData.url,
      headers: formData.headers.reduce(
        (acc, h) => (h.key ? { ...acc, [h.key]: h.value } : acc),
        {}
      ),
    };

    // Build OAuth metadata if required
    let oauthMetadata: any = undefined;
    if (formData.requiresOAuth) {
      oauthMetadata = {
        authorizationUrl: formData.authorizationUrl,
        tokenUrl: formData.tokenUrl,
        clientId: formData.clientId,
        scopes: formData.scopes
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s),
        redirectUri: formData.redirectUri || undefined,
      };
      // Only include clientSecret if provided (for new servers or updates)
      if (formData.clientSecret) {
        oauthMetadata.clientSecret = formData.clientSecret;
      }
    }

    const data: any = {
      name: formData.name,
      description: formData.description || undefined,
      transport: formData.transport,
      config,
      requiresOAuth: formData.requiresOAuth,
      oauthMetadata,
      isActive: formData.isActive,
    };

    // Note: classId is no longer included - servers are created globally
    // Assignment to classes is done separately via the assignment API

    await onSave(data);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditMode ? "Edit MCP Server" : "Add MCP Server"}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Class Selector (only for assignment workflow in system-wide view) */}
          {showClassSelector && classes && onClassChange && (
            <FormControl fullWidth>
              <InputLabel>Assign to Class (optional)</InputLabel>
              <Select
                value={classId || ""}
                onChange={(e: SelectChangeEvent) => onClassChange(e.target.value)}
                label="Assign to Class (optional)"
              >
                <MenuItem value="">
                  <em>No class (global only)</em>
                </MenuItem>
                {classes.map((c) => (
                  <MenuItem key={c.classID} value={c.classID}>
                    {c.className}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Basic Info */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Basic Information
            </Typography>
            <TextField
              label="Server Name"
              value={formData.name}
              onChange={handleChange("name")}
              fullWidth
              required
              error={!!errors.name}
              helperText={errors.name}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={handleChange("description")}
              fullWidth
              multiline
              rows={2}
              placeholder="Optional description of what this server provides"
            />
          </Box>

          <Divider />

          {/* Transport Selection */}
          <Box>
            <FormControl component="fieldset">
              <FormLabel component="legend">Transport Protocol</FormLabel>
              <RadioGroup
                row
                value={formData.transport}
                onChange={handleTransportChange}
              >
                <FormControlLabel
                  value="http"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body2">HTTP</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Standard HTTP connection
                      </Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="sse"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body2">SSE</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Server-Sent Events
                      </Typography>
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>
          </Box>

          <Divider />

          {/* Transport-specific config */}
          {(formData.transport === "http" || formData.transport === "sse") && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Connection Settings
              </Typography>
              <TextField
                label="Server URL"
                value={formData.url}
                onChange={handleChange("url")}
                fullWidth
                required
                error={!!errors.url}
                helperText={errors.url || "e.g., https://mcp-api.example.com"}
                sx={{ mb: 2 }}
              />

              <Typography variant="body2" sx={{ mb: 1 }}>
                Headers (optional)
              </Typography>
              {formData.headers.map((header, index) => (
                <Box
                  key={index}
                  sx={{ display: "flex", gap: 1, mb: 1, alignItems: "center" }}
                >
                  <TextField
                    label="Header Name"
                    value={header.key}
                    onChange={(e) =>
                      handleHeaderChange(index, "key", e.target.value)
                    }
                    size="small"
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Value"
                    value={header.value}
                    onChange={(e) =>
                      handleHeaderChange(index, "value", e.target.value)
                    }
                    size="small"
                    sx={{ flex: 2 }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveHeader(index)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAddHeader}
              >
                Add Header
              </Button>
            </Box>
          )}

          <Divider />

          {/* OAuth Section */}
          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
              onClick={() => setOauthExpanded(!oauthExpanded)}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.requiresOAuth}
                      onChange={handleSwitchChange("requiresOAuth")}
                      onClick={(e) => e.stopPropagation()}
                    />
                  }
                  label="Requires OAuth Authentication"
                />
                {formData.requiresOAuth && (
                  <Chip label="OAuth 2.1" size="small" color="warning" />
                )}
              </Box>
              <IconButton size="small">
                {oauthExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>

            <Collapse in={oauthExpanded && formData.requiresOAuth}>
              <Box sx={{ mt: 2, pl: 2 }}>
                {/* Discovery Status */}
                {discoveryResult && (
                  <Alert
                    severity={discoveryResult.success ? "success" : "info"}
                    sx={{ mb: 2 }}
                    onClose={() => setDiscoveryResult(null)}
                  >
                    {discoveryResult.message}
                  </Alert>
                )}

                {/* Discovery Button */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={discovering ? <CircularProgress size={16} /> : <DiscoverIcon />}
                    onClick={handleOAuthDiscovery}
                    disabled={discovering || !formData.url.trim()}
                  >
                    {discovering ? "Discovering..." : "Auto-Discover"}
                  </Button>
                  <Tooltip title="Discovers OAuth config from well-known endpoints (RFC 8414 / OpenID Connect)">
                    <InfoIcon fontSize="small" color="action" />
                  </Tooltip>
                </Box>

                {/* Auto-Register Button - show if registration endpoint available */}
                {formData.registrationEndpoint && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      color="secondary"
                      startIcon={registering ? <CircularProgress size={16} /> : <AddIcon />}
                      onClick={handleClientRegistration}
                      disabled={registering || formData.clientRegistered || !isEditMode}
                    >
                      {registering ? "Registering..." : formData.clientRegistered ? "Registered" : "Auto-Register Client"}
                    </Button>
                    <Tooltip title={
                      isEditMode
                        ? "Automatically register this app with the MCP server to get client credentials"
                        : "Save the server first, then edit to auto-register"
                    }>
                      <InfoIcon fontSize="small" color="action" />
                    </Tooltip>
                  </Box>
                )}

                {/* Registration Result */}
                {registrationResult && (
                  <Alert
                    severity={registrationResult.success ? "success" : "warning"}
                    sx={{ mb: 2 }}
                    onClose={() => setRegistrationResult(null)}
                  >
                    {registrationResult.message}
                  </Alert>
                )}

                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
                  Configure OAuth 2.1 settings for user authentication with this MCP server.
                  Client secrets are stored securely and will not be displayed after saving.
                </Typography>
                <TextField
                  label="Authorization URL"
                  value={formData.authorizationUrl}
                  onChange={handleChange("authorizationUrl")}
                  fullWidth
                  required={formData.requiresOAuth}
                  error={!!errors.authorizationUrl}
                  helperText={errors.authorizationUrl || "e.g., https://github.com/login/oauth/authorize"}
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Token URL"
                  value={formData.tokenUrl}
                  onChange={handleChange("tokenUrl")}
                  fullWidth
                  required={formData.requiresOAuth}
                  error={!!errors.tokenUrl}
                  helperText={errors.tokenUrl || "e.g., https://github.com/login/oauth/access_token"}
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                  <TextField
                    label="Client ID"
                    value={formData.clientId}
                    onChange={handleChange("clientId")}
                    fullWidth
                    required={formData.requiresOAuth}
                    error={!!errors.clientId}
                    helperText={errors.clientId}
                  />
                  <TextField
                    label="Client Secret"
                    value={formData.clientSecret}
                    onChange={handleChange("clientSecret")}
                    fullWidth
                    required={formData.requiresOAuth && !isEditMode && !formData.clientRegistered}
                    disabled={formData.clientRegistered}
                    error={!!errors.clientSecret}
                    helperText={
                      formData.clientRegistered
                        ? "Stored securely on server (auto-registered)"
                        : errors.clientSecret ||
                          (isEditMode ? "Leave blank to keep existing secret" : "")
                    }
                    type="password"
                  />
                </Box>
                <TextField
                  label="Scopes"
                  value={formData.scopes}
                  onChange={handleChange("scopes")}
                  fullWidth
                  helperText="Comma-separated scopes, e.g., repo, user, read:org"
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Redirect URI"
                  value={formData.redirectUri}
                  onChange={handleChange("redirectUri")}
                  fullWidth
                  helperText="Optional custom redirect URI"
                />
              </Box>
            </Collapse>
          </Box>

          <Divider />

          {/* Status */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={handleSwitchChange("isActive")}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">
                    Server is {formData.isActive ? "Active" : "Inactive"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Inactive servers will not be available for use
                  </Typography>
                </Box>
              }
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={saving}
        >
          {saving ? "Saving..." : isEditMode ? "Update" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MCPServerDialog;
