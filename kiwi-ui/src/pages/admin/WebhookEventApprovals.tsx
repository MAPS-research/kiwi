import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Button,
  Typography,
  Snackbar,
  Alert,
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
  Checkbox,
  FormControlLabel,
  Switch,
  Breadcrumbs,
  Link,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
} from "@mui/material";
import {
  CheckCircleOutline as CheckCircleIcon,
  CancelOutlined as CancelIcon,
  RefreshOutlined as RefreshIcon,
  VisibilityOutlined as VisibilityIcon,
  ExpandMoreOutlined as ExpandMoreIcon,
  PersonAddOutlined as PersonAddIcon,
  PersonOutline as PersonIcon,
  SchoolOutlined as SchoolIcon,
  DescriptionOutlined as DescriptionIcon,
  AssignmentOutlined as AssignmentIcon,
  ScienceOutlined as ScienceIcon,
  StarOutline as StarIcon,
  CheckCircleOutline as ApproveIcon,
  HighlightOffOutlined as RejectIcon,
  HistoryOutlined as HistoryIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import apiClient, { webhooksApiClient } from "../../utils/api.ts";
import {
  WebhookEventResponseDto,
  WebhookEventResponseDtoStatusEnum,
  PendingWebhookEventsResponseDto,
  WebhookEventAuditHistoryDto,
  WebhookEventAuditDto,
  WebhookEventAuditDtoActionEnum,
} from "../../services/index.ts";
import {
  AdminFormSurface,
  AdminPage,
  AdminPageHeader,
} from "../../components/AdminPage/index.ts";

// Map event types to icons and colors
const getEventTypeDetails = (eventType: string) => {
  switch (eventType) {
    case "user.created":
      return { icon: <PersonAddIcon />, color: "primary" };
    case "user.updated":
      return { icon: <PersonIcon />, color: "info" };
    case "user.enroll":
      return { icon: <SchoolIcon />, color: "success" };
    case "class.created":
      return { icon: <SchoolIcon />, color: "primary" };
    case "class.enrollment":
      return { icon: <AssignmentIcon />, color: "success" };
    case "interaction.created":
      return { icon: <AssignmentIcon />, color: "info" };
    case "document.uploaded":
      return { icon: <DescriptionIcon />, color: "secondary" };
    case "test.event":
      return { icon: <ScienceIcon />, color: "warning" };
    case "*":
      return { icon: <StarIcon />, color: "default" };
    default:
      return { icon: <StarIcon />, color: "default" };
  }
};

export const WebhookEventApprovals: React.FC = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [pendingEvents, setPendingEvents] = useState<WebhookEventResponseDto[]>([]);
  const [auditHistory, setAuditHistory] = useState<WebhookEventAuditDto[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [auditPage, setAuditPage] = useState(0);
  const [auditRowsPerPage, setAuditRowsPerPage] = useState(10);
  const [performerEmails, setPerformerEmails] = useState<Record<string, string>>({});
  const adminEmailCacheRef = useRef<Map<string, string>>(new Map());
  const userEmailCacheRef = useRef<Map<string, string>>(new Map());
  const adminFetchPromiseRef = useRef<Promise<void> | null>(null);
  const allUsersFetchPromiseRef = useRef<Promise<void> | null>(null);
  const pendingPerformerRequestsRef = useRef<Set<string>>(new Set());
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<WebhookEventResponseDto | null>(null);
  const [selectedAudit, setSelectedAudit] = useState<WebhookEventAuditDto | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({ open: false, message: "", severity: "info" });

  useEffect(() => {
    fetchPendingEvents();
    if (tabValue === 1) {
      fetchAuditHistory();
    }
  }, []);

  useEffect(() => {
    if (tabValue === 1) {
      fetchAuditHistory();
    }
  }, [tabValue, auditPage, auditRowsPerPage]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchPendingEvents(true); // silent refresh
    }, 5000); // refresh every 5 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchPendingEvents = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response: PendingWebhookEventsResponseDto = await webhooksApiClient.webhooksControllerGetPendingEvents();
      setPendingEvents(response.events || []);
    } catch (error) {
      console.error("Error fetching pending events:", error);
      if (!silent) {
        setSnackbar({
          open: true,
          message: "Failed to fetch pending webhook events",
          severity: "error",
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchAuditHistory = async () => {
    setLoadingAudit(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Get last 30 days of audit history

      const response: WebhookEventAuditHistoryDto = await webhooksApiClient.webhooksControllerGetAllAuditHistory({
        page: String(auditPage + 1),
        limit: String(auditRowsPerPage),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      setAuditHistory(response?.audits ?? []);
      setAuditTotal(response?.total ?? 0);

      if (typeof response?.page === "number") {
        const newPageIndex = Math.max(response.page - 1, 0);
        if (newPageIndex !== auditPage) {
          setAuditPage(newPageIndex);
        }
      }
    } catch (error) {
      console.error("Error fetching audit history:", error);
      // Don't show error snackbar on initial load
      setAuditHistory([]);
      setAuditTotal(0);
    } finally {
      setLoadingAudit(false);
    }
  };

  const fetchPerformerEmails = useCallback(async (userIds: string[]) => {
    const uniqueIds = Array.from(new Set(userIds.filter((id) => !!id)));
    const missingIds = uniqueIds.filter(
      (id) => !(id in performerEmails) && !pendingPerformerRequestsRef.current.has(id)
    );

    if (missingIds.length === 0) {
      return;
    }

    missingIds.forEach((id) => pendingPerformerRequestsRef.current.add(id));

    try {
      const updates: Record<string, string> = {};
      const unresolvedIds = new Set(missingIds);

      const hydrateFromMap = (map: Map<string, string>) => {
        for (const id of Array.from(unresolvedIds)) {
          const email = map.get(id);
          if (email) {
            updates[id] = email;
            unresolvedIds.delete(id);
          }
        }
      };

      hydrateFromMap(adminEmailCacheRef.current);
      hydrateFromMap(userEmailCacheRef.current);

      if (unresolvedIds.size > 0) {
        if (!adminFetchPromiseRef.current) {
          adminFetchPromiseRef.current = (async () => {
            try {
              const admins = await apiClient.authControllerListAdmins();
              admins?.forEach((admin) => {
                if (admin.id && admin.email) {
                  adminEmailCacheRef.current.set(admin.id, admin.email);
                }
              });
            } catch (error) {
              console.error("Error fetching admin emails:", error);
            } finally {
              adminFetchPromiseRef.current = null;
            }
          })();
        }

        const adminPromise = adminFetchPromiseRef.current;
        if (adminPromise) {
          await adminPromise;
          hydrateFromMap(adminEmailCacheRef.current);
        }
      }

      if (unresolvedIds.size > 0) {
        if (!allUsersFetchPromiseRef.current) {
          allUsersFetchPromiseRef.current = (async () => {
            try {
              const response = await apiClient.authControllerGetAllUsers();
              (response.users || []).forEach((user) => {
                if (user.id && user.email) {
                  userEmailCacheRef.current.set(user.id, user.email);
                }
              });
            } catch (error) {
              console.error("Error fetching user emails:", error);
            } finally {
              allUsersFetchPromiseRef.current = null;
            }
          })();
        }

        const usersPromise = allUsersFetchPromiseRef.current;
        if (usersPromise) {
          await usersPromise;
          hydrateFromMap(userEmailCacheRef.current);
        }
      }

      if (Object.keys(updates).length > 0) {
        setPerformerEmails((prev) => ({ ...prev, ...updates }));
      }
    } finally {
      missingIds.forEach((id) => pendingPerformerRequestsRef.current.delete(id));
    }
  }, [performerEmails]);

  const handleApproveEvent = async (eventId: string) => {
    setProcessing(true);
    try {
      await webhooksApiClient.webhooksControllerApproveEvent({ id: eventId });

      setSnackbar({
        open: true,
        message: "Event approved and executed successfully",
        severity: "success",
      });

      // Remove from selected if it was selected
      setSelectedEvents(prev => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });

      // Refresh the lists
      await fetchPendingEvents();
      if (tabValue === 1) {
        await fetchAuditHistory();
      }
    } catch (error: any) {
      console.error("Error approving event:", error);
      const errorMessage = error?.response?.data?.message || "Failed to approve event";
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    } finally {
      setProcessing(false);
      setApproveDialogOpen(false);
      setSelectedEvent(null);
    }
  };

  const handleRejectEvent = async (eventId: string) => {
    setProcessing(true);
    try {
      await webhooksApiClient.webhooksControllerRejectEvent({ id: eventId });

      setSnackbar({
        open: true,
        message: "Event rejected successfully",
        severity: "success",
      });

      // Remove from selected if it was selected
      setSelectedEvents(prev => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });

      // Refresh the lists
      await fetchPendingEvents();
      if (tabValue === 1) {
        await fetchAuditHistory();
      }
    } catch (error: any) {
      console.error("Error rejecting event:", error);
      const errorMessage = error?.response?.data?.message || "Failed to reject event";
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    } finally {
      setProcessing(false);
      setRejectDialogOpen(false);
      setSelectedEvent(null);
    }
  };

  const handleBulkApprove = async () => {
    setProcessing(true);
    const eventIds = Array.from(selectedEvents);
    let successCount = 0;
    let failCount = 0;

    for (const eventId of eventIds) {
      try {
        await webhooksApiClient.webhooksControllerApproveEvent({ id: eventId });
        successCount++;
      } catch (error) {
        console.error(`Error approving event ${eventId}:`, error);
        failCount++;
      }
    }

    setSnackbar({
      open: true,
      message: `Bulk approval completed: ${successCount} approved, ${failCount} failed`,
      severity: failCount > 0 ? "warning" : "success",
    });

    setSelectedEvents(new Set());
    setBulkAction(false);
    setApproveDialogOpen(false);
    setProcessing(false);
    await fetchPendingEvents();
    if (tabValue === 1) {
      await fetchAuditHistory();
    }
  };

  const handleBulkReject = async () => {
    setProcessing(true);
    const eventIds = Array.from(selectedEvents);
    let successCount = 0;
    let failCount = 0;

    for (const eventId of eventIds) {
      try {
        await webhooksApiClient.webhooksControllerRejectEvent({ id: eventId });
        successCount++;
      } catch (error) {
        console.error(`Error rejecting event ${eventId}:`, error);
        failCount++;
      }
    }

    setSnackbar({
      open: true,
      message: `Bulk rejection completed: ${successCount} rejected, ${failCount} failed`,
      severity: failCount > 0 ? "warning" : "success",
    });

    setSelectedEvents(new Set());
    setBulkAction(false);
    setRejectDialogOpen(false);
    setProcessing(false);
    await fetchPendingEvents();
    if (tabValue === 1) {
      await fetchAuditHistory();
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = new Set(displayedPendingEvents.map((e) => e.id));
      setSelectedEvents(newSelected);
    } else {
      setSelectedEvents(new Set());
    }
  };

  const handleSelectEvent = (eventId: string) => {
    setSelectedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const openDetailsDialog = (event: WebhookEventResponseDto | WebhookEventAuditDto) => {
    if ('eventType' in event) {
      setSelectedEvent(event as WebhookEventResponseDto);
      setSelectedAudit(null);
    } else {
      setSelectedAudit(event as WebhookEventAuditDto);
      setSelectedEvent(null);
    }
    setDetailsDialogOpen(true);
  };

  const openApproveDialog = (event?: WebhookEventResponseDto) => {
    if (event) {
      setSelectedEvent(event);
      setBulkAction(false);
    } else {
      setBulkAction(true);
    }
    setApproveDialogOpen(true);
  };

  const openRejectDialog = (event?: WebhookEventResponseDto) => {
    if (event) {
      setSelectedEvent(event);
      setBulkAction(false);
    } else {
      setBulkAction(true);
    }
    setRejectDialogOpen(true);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    if (tabValue === 0) {
      setPage(newPage);
    } else {
      setAuditPage(newPage);
    }
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    if (tabValue === 0) {
      setRowsPerPage(newRowsPerPage);
      setPage(0);
    } else {
      setAuditRowsPerPage(newRowsPerPage);
      setAuditPage(0);
    }
  };

  const displayedPendingEvents = pendingEvents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  useEffect(() => {
    if (auditHistory.length === 0) {
      return;
    }

    const performerIds = auditHistory
      .map((audit) => audit.performedBy)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    if (performerIds.length === 0) {
      return;
    }

    fetchPerformerEmails(performerIds).catch(() => {
      // Errors already logged in fetchPerformerEmails
    });
  }, [auditHistory, fetchPerformerEmails]);

  const resolvePerformerDisplay = (audit: WebhookEventAuditDto) => {
    const cachedEmail = performerEmails[audit.performedBy];
    if (cachedEmail) {
      return cachedEmail;
    }

    const performer = audit.performer as { email?: string } | undefined;
    if (performer && typeof performer === "object" && typeof performer.email === "string") {
      return performer.email;
    }

    return audit.performedBy;
  };

  const formatPayloadPreview = (payload: any): string => {
    try {
      const str = JSON.stringify(payload);
      return str.length > 100 ? str.substring(0, 100) + "..." : str;
    } catch {
      return "Invalid payload";
    }
  };

  return (
    <AdminPage>
      <AdminPageHeader
        title="Webhook Event Approvals"
        description="Review pending webhook events and audit previous decisions."
        actions={
          <>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  color="primary"
                />
              }
              label="Auto-refresh"
            />
            <Tooltip title="Refresh">
              <IconButton
                aria-label="Refresh pending webhook events"
                sx={{ minWidth: 44, minHeight: 44 }}
                onClick={() => fetchPendingEvents()}
                disabled={loading}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </>
        }
      />

        <Box
          component="section"
          aria-label="Webhook event approval summary"
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
            gap: 2,
            mb: 2,
            maxWidth: 992,
          }}
        >
          {[
            { label: "Pending approvals", value: pendingEvents.length },
            { label: "Audit history", value: auditTotal },
            { label: "Selected", value: tabValue === 0 ? selectedEvents.size : 0 },
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
              <Typography variant="body2" color="text.secondary">
                {item.label}
              </Typography>
              <Typography variant="h4" color="text.primary" sx={{ mt: 0.5, fontWeight: 600 }}>
                {item.value}
              </Typography>
            </AdminFormSurface>
          ))}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Note: Currently only <Chip label="user.enroll" size="small" variant="outlined" /> events
          will execute actions. Other events are for testing purposes.
        </Typography>

        {/* Bulk Actions - only show for pending tab */}
        {selectedEvents.size > 0 && tabValue === 0 && (
          <AdminFormSurface sx={{ p: 2, mb: 2, borderColor: "primary.light" }}>
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
              <Typography variant="subtitle1">
                {selectedEvents.size} event(s) selected
              </Typography>
              <Button
                variant="contained"
                color="success"
                startIcon={<ApproveIcon />}
                onClick={() => openApproveDialog()}
                disabled={processing}
              >
                Approve Selected
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<RejectIcon />}
                onClick={() => openRejectDialog()}
                disabled={processing}
              >
                Reject Selected
              </Button>
              <Button
                variant="outlined"
                onClick={() => setSelectedEvents(new Set())}
              >
                Clear Selection
              </Button>
            </Box>
          </AdminFormSurface>
        )}

        {/* Main Content with Tabs */}
        <AdminFormSurface sx={{ overflow: "hidden" }}>
          <Tabs value={tabValue} onChange={(_e, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Pending Approvals" />
            <Tab label="Audit History" />
          </Tabs>

          <Box sx={{ p: 2 }}>
            {/* Pending Events Table */}
            {tabValue === 0 && (
              loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : pendingEvents.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 8 }}>
                  <CheckCircleIcon sx={{ fontSize: 64, color: "success.main", mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No pending webhook events
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    All webhook events have been processed
                  </Typography>
                </Box>
              ) : (
                <>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <Checkbox
                              indeterminate={
                                selectedEvents.size > 0 &&
                                selectedEvents.size < displayedPendingEvents.length
                              }
                              checked={
                                displayedPendingEvents.length > 0 &&
                                selectedEvents.size === displayedPendingEvents.length
                              }
                              onChange={handleSelectAll}
                            />
                          </TableCell>
                          <TableCell>Event Type</TableCell>
                          <TableCell>Webhook ID</TableCell>
                          <TableCell>Payload Preview</TableCell>
                          <TableCell>Created At</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {displayedPendingEvents.map((event) => {
                          const eventDetails = getEventTypeDetails(event.eventType);
                          const isSelected = selectedEvents.has(event.id);

                          return (
                            <TableRow
                              key={event.id}
                              selected={isSelected}
                              hover
                            >
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={isSelected}
                                  onChange={() => handleSelectEvent(event.id)}
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  icon={eventDetails.icon}
                                  label={event.eventType}
                                  color={eventDetails.color as any}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                <Typography
                                  variant="body2"
                                  sx={{ fontFamily: "monospace", fontSize: "0.875rem" }}
                                >
                                  {event.webhookId.substring(0, 8)}...
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontFamily: "monospace",
                                      fontSize: "0.75rem",
                                      maxWidth: "300px",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {formatPayloadPreview(event.payload)}
                                  </Typography>
                                  <IconButton
                                    size="small"
                                    onClick={() => openDetailsDialog(event)}
                                  >
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              </TableCell>
                              <TableCell>
                                {new Date(event.createdAt).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: "flex", gap: 1 }}>
                                  <Tooltip title="Approve">
                                    <IconButton
                                      size="small"
                                      color="success"
                                      onClick={() => openApproveDialog(event)}
                                      disabled={processing}
                                    >
                                      <CheckCircleIcon />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Reject">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => openRejectDialog(event)}
                                      disabled={processing}
                                    >
                                      <CancelIcon />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    component="div"
                    count={pendingEvents.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                  />
                </>
              )
            )}

            {/* Audit History Table */}
            {tabValue === 1 && (
              loadingAudit ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : auditHistory.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 8 }}>
                  <HistoryIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No audit history available
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Approved and rejected events will appear here
                  </Typography>
                </Box>
              ) : (
                <>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Action</TableCell>
                          <TableCell>Event ID</TableCell>
                          <TableCell>Performed By</TableCell>
                          <TableCell>Timestamp</TableCell>
                          <TableCell>Reason</TableCell>
                          <TableCell>Details</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {auditHistory.map((audit) => (
                          <TableRow key={audit.id} hover>
                            <TableCell>
                              <Chip
                                label={audit.action}
                                color={audit.action === 'approved' ? 'success' : 'error'}
                                size="small"
                                icon={audit.action === 'approved' ? <CheckCircleIcon /> : <CancelIcon />}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="body2"
                                sx={{ fontFamily: "monospace", fontSize: "0.875rem" }}
                              >
                                {audit.webhookEventId.substring(0, 8)}...
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Tooltip title={audit.performedBy}>
                                <Typography variant="body2">
                                  {resolvePerformerDisplay(audit)}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              {new Date(audit.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {audit.reason || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <IconButton
                                size="small"
                                onClick={() => openDetailsDialog(audit)}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    component="div"
                    count={auditTotal}
                    page={auditPage}
                    onPageChange={handleChangePage}
                    rowsPerPage={auditRowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                  />
                </>
              )
            )}
          </Box>
        </AdminFormSurface>
      {/* Event Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <VisibilityIcon />
            {selectedEvent ? 'Event Details' : 'Audit Details'}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedEvent && (
            <Box>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">Event Information</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Event ID
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                        {selectedEvent.id}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Event Type
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          icon={getEventTypeDetails(selectedEvent.eventType).icon}
                          label={selectedEvent.eventType}
                          color={getEventTypeDetails(selectedEvent.eventType).color as any}
                          size="small"
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Webhook ID
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                        {selectedEvent.webhookId}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Created At
                      </Typography>
                      <Typography variant="body2">
                        {new Date(selectedEvent.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Status
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          label={selectedEvent.status}
                          color="warning"
                          size="small"
                        />
                      </Box>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>

              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">Event Payload</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Paper
                    elevation={0}
                    variant="outlined"
                    sx={{
                      p: 2,
                      backgroundColor: "grey.100",
                      maxHeight: "400px",
                      overflow: "auto",
                    }}
                  >
                    <pre style={{ margin: 0, fontFamily: "monospace", fontSize: "0.875rem" }}>
                      {JSON.stringify(selectedEvent.payload, null, 2)}
                    </pre>
                  </Paper>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}

          {selectedAudit && (
            <Box>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">Audit Information</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Audit ID
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                        {selectedAudit.id}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Event ID
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                        {selectedAudit.webhookEventId}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Action
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          label={selectedAudit.action}
                          color={selectedAudit.action === 'approved' ? 'success' : 'error'}
                          size="small"
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Performed By
                      </Typography>
                      <Typography variant="body2">
                        {selectedAudit.performedBy}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Timestamp
                      </Typography>
                      <Typography variant="body2">
                        {new Date(selectedAudit.timestamp).toLocaleString()}
                      </Typography>
                    </Box>
                    {selectedAudit.reason && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Reason
                        </Typography>
                        <Typography variant="body2">
                          {selectedAudit.reason}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>

              {selectedAudit.metadata && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1">Metadata</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Paper
                      elevation={0}
                      variant="outlined"
                      sx={{
                        p: 2,
                        backgroundColor: "grey.100",
                        maxHeight: "400px",
                        overflow: "auto",
                      }}
                    >
                      <pre style={{ margin: 0, fontFamily: "monospace", fontSize: "0.875rem" }}>
                        {JSON.stringify(selectedAudit.metadata, null, 2)}
                      </pre>
                    </Paper>
                  </AccordionDetails>
                </Accordion>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <Dialog
        open={approveDialogOpen}
        onClose={() => !processing && setApproveDialogOpen(false)}
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CheckCircleIcon color="success" />
            Confirm Approval
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {bulkAction ? (
              <>
                Are you sure you want to approve {selectedEvents.size} selected event(s)?
                This will execute the associated actions for each event.
              </>
            ) : (
              <>
                Are you sure you want to approve this webhook event?
                {selectedEvent?.eventType === "user.enroll" && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    This will execute the user enrollment action associated with this event.
                  </Alert>
                )}
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialogOpen(false)} disabled={processing}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (bulkAction) {
                handleBulkApprove();
              } else if (selectedEvent) {
                handleApproveEvent(selectedEvent.id);
              }
            }}
            color="success"
            variant="contained"
            disabled={processing}
            startIcon={processing ? <CircularProgress size={16} /> : <CheckCircleIcon />}
          >
            {processing ? "Approving..." : "Approve"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => !processing && setRejectDialogOpen(false)}
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CancelIcon color="error" />
            Confirm Rejection
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {bulkAction ? (
              <>
                Are you sure you want to reject {selectedEvents.size} selected event(s)?
                The events will be marked as rejected and no actions will be executed.
              </>
            ) : (
              <>
                Are you sure you want to reject this webhook event?
                The event will be marked as rejected and no action will be executed.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)} disabled={processing}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (bulkAction) {
                handleBulkReject();
              } else if (selectedEvent) {
                handleRejectEvent(selectedEvent.id);
              }
            }}
            color="error"
            variant="contained"
            disabled={processing}
            startIcon={processing ? <CircularProgress size={16} /> : <CancelIcon />}
          >
            {processing ? "Rejecting..." : "Reject"}
          </Button>
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
};

export default WebhookEventApprovals;
