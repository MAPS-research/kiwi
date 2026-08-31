import React, { useEffect, useImperativeHandle, useMemo, useState } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    MenuItem,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    TextField,
    Tooltip,
    Typography,
    useMediaQuery,
} from "@mui/material";
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import { useTheme } from '@mui/material/styles';
import apiClient, { basePath } from "../../utils/api.ts";

interface TopUserItem {
    userId: string;
    email: string;
    tokensUsed: number;
    sessionCount?: number;
}

interface UserSessionUsageItem {
    id: string;
    sessionStartTime: string;
    sessionEndTime: string | null;
    tokensUsed: number;
    interactionCount?: number;
    actionSummary?: Record<string, number>;
}

export interface StandaloneTopTokenUsersHandle {
    refresh: () => Promise<void>;
}

type DetailSortKey = 'sessionId' | 'start' | 'end' | 'usage' | 'tokens';
type SortOrder = 'asc' | 'desc';

function formatNumber(n: number) {
    try { return n.toLocaleString(); } catch { return String(n); }
}

function normalizeSessionUsageResponse(payload: unknown): UserSessionUsageItem[] {
    const response = payload as any;
    const sessions = Array.isArray(response)
        ? response
        : Array.isArray(response?.sessions)
            ? response.sessions
            : [];

    return sessions
        .map((session: any) => ({
            id: String(session?.sessionId ?? session?.id ?? ''),
            sessionStartTime: String(session?.startTime ?? session?.sessionStartTime ?? ''),
            sessionEndTime: session?.endTime ?? session?.sessionEndTime ?? null,
            tokensUsed: Number(session?.tokensUsed ?? 0),
            interactionCount: Number.isFinite(Number(session?.interactionCount))
                ? Number(session.interactionCount)
                : undefined,
            actionSummary: session?.actionSummary && typeof session.actionSummary === 'object'
                ? session.actionSummary
                : undefined,
        }))
        .filter((session: UserSessionUsageItem) => session.id);
}

function getInteractionCount(session: UserSessionUsageItem): number {
    if (typeof session.interactionCount === 'number') return session.interactionCount;
    return Object.values(session.actionSummary ?? {}).reduce((sum, count) => sum + Number(count || 0), 0);
}

export const StandaloneTopTokenUsers = React.forwardRef<StandaloneTopTokenUsersHandle>((_, ref) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [topUsers, setTopUsers] = useState<TopUserItem[]>([]);
    const [loadingTopUsers, setLoadingTopUsers] = useState(true);
    const [open, setOpen] = useState(false);
    const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(null);
    const [details, setDetails] = useState<UserSessionUsageItem[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [detailSortKey, setDetailSortKey] = useState<DetailSortKey>('start');
    const [detailSortOrder, setDetailSortOrder] = useState<SortOrder>('desc');

    const loadTop = async () => {
        setLoadingTopUsers(true);
        try {
            // Use raw method since generated client returns void (incomplete OpenAPI spec)
            const apiResponse = await apiClient.analyticsControllerGetTopTokenUsersRaw();
            const data = await apiResponse.raw.json();
            // The API returns an object with various properties, extract the array
            // It could be data.users, data.topUsers, or just data itself
            const users = Array.isArray(data) ? data : (data.users || data.topUsers || []);
            setTopUsers(users as TopUserItem[]);
        } catch (e) {
            console.error("Failed to load top token users:", e);
            setTopUsers([]);
        } finally {
            setLoadingTopUsers(false);
        }
    };

    const openDetail = async (userId: string, email: string) => {
        setSelectedUserEmail(email);
        setDetails([]);
        setLoadingDetails(true);
        setOpen(true);
        try {
            // Note: Generated API method doesn't support body parameter (incomplete OpenAPI spec)
            // Using fetch directly with auth token
            const token = localStorage.getItem("authToken") || "";
            const resp = await fetch(`${basePath}/analytics/user-token-usage`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: token ? `Bearer ${token}` : "",
                },
                credentials: "include",
                body: JSON.stringify({ userId }),
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const detail = await resp.json();
            setDetails(normalizeSessionUsageResponse(detail));
        } catch (e) {
            console.error("Failed to load user token usage detail:", e);
            setDetails([]);
        } finally {
            setLoadingDetails(false);
        }
    };

    const sortedDetails = useMemo(() => {
        const valueOf = (session: UserSessionUsageItem): string | number => {
            switch (detailSortKey) {
                case 'sessionId': return session.id.toLocaleLowerCase();
                case 'start': return new Date(session.sessionStartTime).getTime() || 0;
                case 'end': return session.sessionEndTime ? new Date(session.sessionEndTime).getTime() || 0 : 0;
                case 'usage': return getInteractionCount(session);
                case 'tokens': return session.tokensUsed;
            }
        };

        return [...details].sort((a, b) => {
            const aValue = valueOf(a);
            const bValue = valueOf(b);
            const comparison = typeof aValue === 'string' && typeof bValue === 'string'
                ? aValue.localeCompare(bValue)
                : Number(aValue) - Number(bValue);
            return detailSortOrder === 'asc' ? comparison : -comparison;
        });
    }, [details, detailSortKey, detailSortOrder]);

    const handleDetailSort = (key: DetailSortKey) => {
        if (detailSortKey === key) {
            setDetailSortOrder((order) => order === 'asc' ? 'desc' : 'asc');
            return;
        }
        setDetailSortKey(key);
        setDetailSortOrder(key === 'sessionId' ? 'asc' : 'desc');
    };

    useEffect(() => {
        loadTop();
    }, []);

    useImperativeHandle(ref, () => ({ refresh: loadTop }));

    return (
        <>
            <Card
                variant="outlined"
                aria-busy={loadingTopUsers}
                sx={{ minHeight: { xs: 652, lg: 332 }, borderRadius: 2, boxShadow: "none" }}
            >
                <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    {loadingTopUsers ? (
                        <Box
                            aria-label="Loading top token users"
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
                                gap: 0.5,
                                columnGap: { lg: 1 },
                            }}
                        >
                            {Array.from({ length: 10 }, (_, index) => (
                                <Skeleton key={index} variant="rounded" height={60} sx={{ borderRadius: 1.5 }} />
                            ))}
                        </Box>
                    ) : topUsers.length > 0 ? (
                        <List
                            disablePadding
                            aria-label="Top token users"
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
                                gap: 0.5,
                                columnGap: { lg: 1 },
                            }}
                        >
                            {topUsers.map((user, index) => (
                                <ListItem
                                    key={user.userId}
                                    disablePadding
                                    sx={{
                                        minWidth: 0,
                                    }}
                                >
                                <ListItemButton
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: {
                                            xs: '32px minmax(0, 1fr) auto',
                                            sm: '32px minmax(0, 1fr) auto auto 20px',
                                        },
                                        alignItems: 'center',
                                        gap: { xs: 1, sm: 1.5 },
                                        px: { xs: 1, sm: 1.5 },
                                        py: 1.25,
                                        minHeight: 60,
                                        minWidth: 0,
                                        borderRadius: 1.5,
                                        '&:hover': { backgroundColor: 'action.hover' },
                                    }}
                                    onClick={() => openDetail(user.userId, user.email)}
                                >
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{
                                            display: 'grid',
                                            placeItems: 'center',
                                            width: 28,
                                            fontWeight: 700,
                                        }}
                                    >
                                        {index + 1}
                                    </Typography>

                                    <Box sx={{ minWidth: 0 }}>
                                        <Tooltip title={user.email || '(no email)'} placement="top-start">
                                            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                                                {user.email || '(no email)'}
                                            </Typography>
                                        </Tooltip>
                                        <Tooltip title={user.userId} placement="bottom-start">
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                            >
                                                {user.userId}
                                            </Typography>
                                        </Tooltip>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ display: { xs: 'flex', sm: 'none' }, mt: 0.5 }}>
                                            {typeof user.sessionCount === 'number' && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {formatNumber(user.sessionCount)} sessions
                                                </Typography>
                                            )}
                                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                                {formatNumber(user.tokensUsed)} tokens
                                            </Typography>
                                        </Stack>
                                    </Box>

                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'right', whiteSpace: 'nowrap' }}
                                    >
                                        {typeof user.sessionCount === 'number' ? `${formatNumber(user.sessionCount)} sessions` : '—'}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}
                                    >
                                        {formatNumber(user.tokensUsed)} tokens
                                    </Typography>
                                    <ChevronRightOutlinedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                                </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    ) : (
                        <Box sx={{ minHeight: { xs: 634, lg: 314 }, px: { xs: 2, sm: 3 }, py: 4, display: 'grid', placeItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                No token usage data available.
                            </Typography>
                        </Box>
                    )}
                </CardContent>
            </Card>

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
                <DialogTitle sx={{ pr: 1 }}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="h6">Token Usage Detail</Typography>
                            {selectedUserEmail && (
                                <Tooltip title={selectedUserEmail}>
                                    <Typography variant="body2" color="text.secondary" noWrap>
                                        {selectedUserEmail}
                                    </Typography>
                                </Tooltip>
                            )}
                        </Box>
                        <IconButton
                            aria-label="Close token usage detail"
                            onClick={() => setOpen(false)}
                            sx={{ mt: -0.5, flexShrink: 0 }}
                        >
                            <CloseOutlinedIcon />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent dividers sx={{ px: { xs: 0, sm: 3 }, py: { xs: 0, sm: 2 } }}>
                    {loadingDetails ? (
                        <Stack spacing={1} sx={{ px: { xs: 2, sm: 0 }, py: { xs: 2, sm: 0 }, minHeight: 280 }}>
                            {Array.from({ length: 6 }, (_, index) => (
                                <Skeleton key={index} variant="rounded" height={40} sx={{ borderRadius: 1 }} />
                            ))}
                        </Stack>
                    ) : details.length > 0 ? (
                        isMobile ? (
                            <Box>
                            <Stack direction="row" spacing={1} sx={{ px: 2, py: 1.5 }}>
                                <TextField
                                    select
                                    fullWidth
                                    size="small"
                                    label="Sort by"
                                    value={detailSortKey}
                                    onChange={(event) => handleDetailSort(event.target.value as DetailSortKey)}
                                >
                                    <MenuItem value="sessionId">Session ID</MenuItem>
                                    <MenuItem value="start">Start</MenuItem>
                                    <MenuItem value="end">End</MenuItem>
                                    <MenuItem value="usage">Usage</MenuItem>
                                    <MenuItem value="tokens">Tokens</MenuItem>
                                </TextField>
                                <Button
                                    variant="outlined"
                                    onClick={() => setDetailSortOrder((order) => order === 'asc' ? 'desc' : 'asc')}
                                    sx={{ minWidth: 104 }}
                                >
                                    {detailSortOrder === 'asc' ? 'Ascending' : 'Descending'}
                                </Button>
                            </Stack>
                            <List disablePadding aria-label="Session token usage">
                                {sortedDetails.map((session, index) => (
                                    <React.Fragment key={session.id}>
                                        <ListItem disablePadding>
                                            <Box sx={{ display: 'block', width: '100%', px: 2, py: 1.5, minWidth: 0 }}>
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <Tooltip title={session.id}>
                                                        <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 0 }} noWrap>
                                                            {session.id}
                                                        </Typography>
                                                    </Tooltip>
                                                </Stack>
                                                <Box
                                                    sx={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                                                        gap: 1.5,
                                                        mt: 1,
                                                    }}
                                                >
                                                    <Box sx={{ minWidth: 0 }}>
                                                        <Typography variant="caption" color="text.secondary">Start</Typography>
                                                        <Typography variant="body2">{new Date(session.sessionStartTime).toLocaleString()}</Typography>
                                                    </Box>
                                                    <Box sx={{ minWidth: 0 }}>
                                                        <Typography variant="caption" color="text.secondary">End</Typography>
                                                        <Typography variant="body2">
                                                            {session.sessionEndTime ? new Date(session.sessionEndTime).toLocaleString() : '—'}
                                                        </Typography>
                                                    </Box>
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary">Usage</Typography>
                                                        <Typography variant="body2">{formatNumber(getInteractionCount(session))} interactions</Typography>
                                                    </Box>
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary">Tokens</Typography>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatNumber(session.tokensUsed)}</Typography>
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </ListItem>
                                        {index < sortedDetails.length - 1 && <Divider component="li" />}
                                    </React.Fragment>
                                ))}
                            </List>
                            </Box>
                        ) : (
                        <TableContainer sx={{ overflowX: 'auto' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    {([
                                        ['sessionId', 'Session ID', 'left'],
                                        ['start', 'Start', 'left'],
                                        ['end', 'End', 'left'],
                                        ['usage', 'Usage', 'left'],
                                        ['tokens', 'Tokens', 'right'],
                                    ] as const).map(([key, label, align]) => (
                                        <TableCell
                                            key={key}
                                            align={align}
                                            sortDirection={detailSortKey === key ? detailSortOrder : false}
                                        >
                                            <TableSortLabel
                                                active={detailSortKey === key}
                                                direction={detailSortKey === key ? detailSortOrder : 'asc'}
                                                onClick={() => handleDetailSort(key)}
                                            >
                                                {label}
                                            </TableSortLabel>
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sortedDetails.map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell sx={{ maxWidth: 180 }}>
                                            <Tooltip title={s.id}><Typography variant="body2" noWrap>{s.id}</Typography></Tooltip>
                                        </TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(s.sessionStartTime).toLocaleString()}</TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{s.sessionEndTime ? new Date(s.sessionEndTime).toLocaleString() : '—'}</TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                            <Typography variant="caption" color="text.secondary">
                                                {formatNumber(getInteractionCount(s))} interactions
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">{formatNumber(s.tokensUsed)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </TableContainer>
                        )
                    ) : (
                        <Box sx={{ px: { xs: 2, sm: 0 }, py: 2 }}>
                            <Typography variant="body2" color="text.secondary">No session details.</Typography>
                        </Box>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
});

StandaloneTopTokenUsers.displayName = 'StandaloneTopTokenUsers';

export default StandaloneTopTokenUsers;
