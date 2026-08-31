import React, { useState, useEffect } from "react";
import {
    Box,
    Button,
    Typography,
    Snackbar,
    Alert,
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
    Card,
    CardContent,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    InputAdornment,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Tabs,
    Tab,
    IconButton,
    Tooltip,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
    SearchOutlined as SearchIcon,
    EmailOutlined as EmailIcon,
    ExpandMoreOutlined as ExpandMoreIcon,
    RefreshOutlined as RefreshIcon,
    VisibilityOutlined as VisibilityIcon,
    TrendingUpOutlined as TrendingUpIcon,
    ErrorOutline as ErrorIcon,
    CheckCircleOutline as CheckCircleIcon,
    ScienceOutlined as TestTubeIcon,
} from "@mui/icons-material";
import { emailAuditApiClient } from "../../utils/api.ts";
import {
    EmailAuditLogDto,
    EmailAuditLogsResponseDto,
    EmailStatsDto,
    EmailAuditControllerListLogsStatusEnum,
    EmailAuditControllerListLogsEmailTypeEnum,
} from "../../services/index.ts";
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
            id={`email-audit-tabpanel-${index}`}
            aria-labelledby={`email-audit-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

export const EmailAudit: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);

    // Logs state
    const [logs, setLogs] = useState<EmailAuditLogDto[]>([]);
    const [totalLogs, setTotalLogs] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [emailTypeFilter, setEmailTypeFilter] = useState<string>("");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    // Stats state
    const [stats, setStats] = useState<EmailStatsDto | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    // UI state
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");

    useEffect(() => {
        loadLogs();
        loadStats();
    }, [page, rowsPerPage, statusFilter, emailTypeFilter, startDate, endDate]);

    useEffect(() => {
        // Reset page when filters change
        setPage(0);
    }, [searchTerm, statusFilter, emailTypeFilter, startDate, endDate]);

    const loadLogs = async () => {
        try {
            setLoading(true);
            const params = {
                skip: page * rowsPerPage,
                take: rowsPerPage,
                ...(statusFilter && { status: statusFilter as EmailAuditControllerListLogsStatusEnum }),
                ...(emailTypeFilter && { emailType: emailTypeFilter as EmailAuditControllerListLogsEmailTypeEnum }),
                ...(startDate && { startDate }),
                ...(endDate && { endDate }),
                ...(searchTerm && { recipientEmail: searchTerm }),
            };

            const response: EmailAuditLogsResponseDto = await emailAuditApiClient.emailAuditControllerListLogs(params);
            setLogs(response.logs);
            setTotalLogs(response.total);
        } catch (error) {
            console.error("Failed to load email logs:", error);
            showSnackbar("Failed to load email logs", "error");
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            setStatsLoading(true);
            const params = {
                ...(startDate && { startDate }),
                ...(endDate && { endDate }),
            };

            const response: EmailStatsDto = await emailAuditApiClient.emailAuditControllerGetStats(params);
            setStats(response);
        } catch (error) {
            console.error("Failed to load email stats:", error);
            showSnackbar("Failed to load email statistics", "error");
        } finally {
            setStatsLoading(false);
        }
    };

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleRefresh = () => {
        loadLogs();
        loadStats();
    };

    const showSnackbar = (message: string, severity: "success" | "error") => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'sent':
                return <CheckCircleIcon color="success" fontSize="small" />;
            case 'failed':
                return <ErrorIcon color="error" fontSize="small" />;
            case 'test_mode':
                return <TestTubeIcon color="warning" fontSize="small" />;
            default:
                return null;
        }
    };

    const getStatusColor = (status: string): "success" | "error" | "warning" | "default" => {
        switch (status) {
            case 'sent':
                return 'success';
            case 'failed':
                return 'error';
            case 'test_mode':
                return 'warning';
            default:
                return 'default';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    return (
        <AdminPage>
            <Box>
                <AdminPageHeader
                    title="Email Audit"
                    description="Review email recipients, delivery status, and sending history."
                    actions={
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh}>
                            Refresh
                        </Button>
                    }
                />

                {/* Tabs */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tabs value={tabValue} onChange={handleTabChange} aria-label="email audit tabs">
                        <Tab label="Email Logs" icon={<EmailIcon />} />
                        <Tab label="Statistics" icon={<TrendingUpIcon />} />
                    </Tabs>
                </Box>

                {/* Email Logs Tab */}
                <TabPanel value={tabValue} index={0}>
                    {/* Filters */}
                    <Accordion sx={{ mb: 3 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">Filters</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, md: 3 }}>
                                    <TextField
                                        fullWidth
                                        label="Search by recipient email"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <SearchIcon />
                                                </InputAdornment>
                                            )
                                        }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 2 }}>
                                    <FormControl fullWidth>
                                        <InputLabel>Status</InputLabel>
                                        <Select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            label="Status"
                                        >
                                            <MenuItem value="">All</MenuItem>
                                            <MenuItem value="sent">Sent</MenuItem>
                                            <MenuItem value="failed">Failed</MenuItem>
                                            <MenuItem value="test_mode">Test Mode</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid size={{ xs: 12, md: 2 }}>
                                    <FormControl fullWidth>
                                        <InputLabel>Email Type</InputLabel>
                                        <Select
                                            value={emailTypeFilter}
                                            onChange={(e) => setEmailTypeFilter(e.target.value)}
                                            label="Email Type"
                                        >
                                            <MenuItem value="">All</MenuItem>
                                            <MenuItem value="direct">Direct</MenuItem>
                                            <MenuItem value="template">Template</MenuItem>
                                            <MenuItem value="class_announcement">Class Announcement</MenuItem>
                                            <MenuItem value="admin_notification">Admin Notification</MenuItem>
                                            <MenuItem value="welcome">Welcome</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid size={{ xs: 12, md: 2 }}>
                                    <TextField
                                        fullWidth
                                        label="Start Date"
                                        type="datetime-local"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 2 }}>
                                    <TextField
                                        fullWidth
                                        label="End Date"
                                        type="datetime-local"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 1 }}>
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        onClick={loadLogs}
                                        sx={{
                                            height: "56px",
                                            bgcolor: "#4B2E5D",
                                            "&:hover": { bgcolor: "#3A1E4A" }
                                        }}
                                    >
                                        Apply
                                    </Button>
                                </Grid>
                            </Grid>
                        </AccordionDetails>
                    </Accordion>

                    {/* Logs Table */}
                    <Paper elevation={2}>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>
                                            <Typography variant="subtitle2" fontWeight="bold">
                                                Timestamp
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="subtitle2" fontWeight="bold">
                                                From
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="subtitle2" fontWeight="bold">
                                                Recipients
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="subtitle2" fontWeight="bold">
                                                Subject
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="subtitle2" fontWeight="bold">
                                                Type
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="subtitle2" fontWeight="bold">
                                                Status
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="subtitle2" fontWeight="bold">
                                                Actions
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                                <CircularProgress />
                                            </TableCell>
                                        </TableRow>
                                    ) : logs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                                <Box className="admin-empty-state">
                                                    <EmailIcon sx={{ fontSize: 48, color: "#ccc", mb: 2 }} />
                                                    <Typography variant="h6" color="textSecondary">
                                                        No email logs found
                                                    </Typography>
                                                    <Typography variant="body2" color="textSecondary">
                                                        Try adjusting your filters or check back later
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        logs.map((log) => (
                                            <TableRow key={log.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {formatDate(log.timestamp.toString())}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>{log.fromEmail}</TableCell>
                                                <TableCell>
                                                    <Tooltip title={log.toEmails.join(", ")}>
                                                        <Typography variant="body2" sx={{
                                                            maxWidth: 200,
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {log.toEmails.length === 1
                                                                ? log.toEmails[0]
                                                                : `${log.toEmails.length} recipients`
                                                            }
                                                        </Typography>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{
                                                        maxWidth: 250,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {log.subject}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={log.emailType.replace('_', ' ')}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        {getStatusIcon(log.status)}
                                                        <Chip
                                                            label={log.status.replace('_', ' ')}
                                                            color={getStatusColor(log.status)}
                                                            size="small"
                                                        />
                                                    </Box>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Tooltip title="View Details">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => {
                                                                // TODO: Implement view details functionality
                                                                showSnackbar("View details feature coming soon", "success");
                                                            }}
                                                        >
                                                            <VisibilityIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            rowsPerPageOptions={[10, 25, 50, 100]}
                            component="div"
                            count={totalLogs}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={handleChangePage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                        />
                    </Paper>
                </TabPanel>

                {/* Statistics Tab */}
                <TabPanel value={tabValue} index={1}>
                    {statsLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : stats ? (
                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <Card className="admin-stats-card">
                                    <CardContent sx={{ textAlign: 'center' }}>
                                        <CheckCircleIcon sx={{ fontSize: 48, color: '#4caf50', mb: 2 }} />
                                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                                            {stats.totalSent}
                                        </Typography>
                                        <Typography variant="subtitle1" color="text.secondary">
                                            Total Sent
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <Card className="admin-stats-card">
                                    <CardContent sx={{ textAlign: 'center' }}>
                                        <ErrorIcon sx={{ fontSize: 48, color: '#f44336', mb: 2 }} />
                                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#f44336' }}>
                                            {stats.totalFailed}
                                        </Typography>
                                        <Typography variant="subtitle1" color="text.secondary">
                                            Total Failed
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <Card className="admin-stats-card">
                                    <CardContent sx={{ textAlign: 'center' }}>
                                        <TestTubeIcon sx={{ fontSize: 48, color: '#ff9800', mb: 2 }} />
                                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                                            {stats.totalTestMode}
                                        </Typography>
                                        <Typography variant="subtitle1" color="text.secondary">
                                            Test Mode
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <Card className="admin-stats-card">
                                    <CardContent sx={{ textAlign: 'center' }}>
                                        <EmailIcon sx={{ fontSize: 48, color: '#4B2E5D', mb: 2 }} />
                                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#4B2E5D' }}>
                                            {stats.totalSent + stats.totalFailed + stats.totalTestMode}
                                        </Typography>
                                        <Typography variant="subtitle1" color="text.secondary">
                                            Total Emails
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Email Type Breakdown */}
                            <Grid size={{ xs: 12 }}>
                                <Paper sx={{ p: 3 }}>
                                    <Typography variant="h6" gutterBottom>
                                        Email Type Breakdown
                                    </Typography>
                                    {stats.byEmailType && stats.byEmailType.length > 0 ? (
                                        <Grid container spacing={2}>
                                            {stats.byEmailType.map((typeStats: any, index) => (
                                                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                                                    <Card variant="outlined">
                                                        <CardContent>
                                                            <Typography variant="subtitle1" fontWeight="bold">
                                                                {typeStats.emailType?.replace('_', ' ') || 'Unknown'}
                                                            </Typography>
                                                            <Typography variant="h6" color="primary">
                                                                {typeStats.count || 0}
                                                            </Typography>
                                                        </CardContent>
                                                    </Card>
                                                </Grid>
                                            ))}
                                        </Grid>
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">
                                            No email type data available
                                        </Typography>
                                    )}
                                </Paper>
                            </Grid>
                        </Grid>
                    ) : (
                        <Box className="admin-empty-state">
                            <TrendingUpIcon sx={{ fontSize: 48, color: "#ccc", mb: 2 }} />
                            <Typography variant="h6" color="textSecondary">
                                No statistics available
                            </Typography>
                        </Box>
                    )}
                </TabPanel>

                {/* Snackbar */}
                <Snackbar
                    open={snackbarOpen}
                    autoHideDuration={6000}
                    onClose={() => setSnackbarOpen(false)}
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                >
                    <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: "100%" }}>
                        {snackbarMessage}
                    </Alert>
                </Snackbar>
            </Box>
        </AdminPage>
    );
};
