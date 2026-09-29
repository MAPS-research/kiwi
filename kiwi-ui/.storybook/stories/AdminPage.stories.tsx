import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import AlternateEmailOutlinedIcon from '@mui/icons-material/AlternateEmailOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import MoreHorizOutlinedIcon from '@mui/icons-material/MoreHorizOutlined';
import RadioButtonCheckedOutlinedIcon from '@mui/icons-material/RadioButtonCheckedOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import TableRowsOutlinedIcon from '@mui/icons-material/TableRowsOutlined';
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { AdminFormSurface, AdminPage, AdminPageHeader } from '../../src/components/AdminPage/index.ts';

const AdminPagePreview = ({ maxWidth = 'lg' }: { maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | false }) => (
  <AdminPage maxWidth={maxWidth}>
    <AdminPageHeader
      title="Classes"
      description="Create classes and manage existing course spaces."
      actions={
        <Button variant="contained" startIcon={<AddOutlinedIcon />}>
          Add class
        </Button>
      }
    />
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="body2" color="text.secondary">
        Page content starts here.
      </Typography>
    </Paper>
  </AdminPage>
);

const directoryUsers = [
  { email: 'maya.chen@example.edu', type: 'OAuth', role: 'Instructor', enabled: true, pending: false },
  { email: 'samir.patel@example.com', type: 'Password', role: 'User', enabled: true, pending: false },
  { email: 'invited.person@example.edu', type: 'Not registered', role: 'User', enabled: false, pending: true },
];

const DenseDirectoryPreview = () => {
  const [addUsersOpen, setAddUsersOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [addMethod, setAddMethod] = useState<'whitelist' | 'register'>('whitelist');

  return (
    <AdminPage maxWidth="xl">
    <AdminPageHeader
      title="User management"
      description="Control account access, system roles, registrations, and instructor assignments from one workspace."
      actions={
        <>
          <Button variant="outlined" startIcon={<GroupOutlinedIcon />} onClick={() => setAssignmentOpen(true)} sx={{ minHeight: 44 }}>
            Assign instructor
          </Button>
          <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={() => setAddUsersOpen(true)} sx={{ minHeight: 44 }}>
            Add users
          </Button>
        </>
      }
    />

    <AdminFormSurface sx={{ overflow: 'hidden' }}>
      <Box
        sx={{
          px: 2,
          py: 1.25,
          display: 'grid',
          gridTemplateAreas: { xs: '"view export" "search search"', sm: '"view search export"' },
          gridTemplateColumns: { xs: 'minmax(0, 1fr) auto', sm: 'auto minmax(220px, 280px) auto' },
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          aria-label="Current view: Table"
          sx={{ gridArea: 'view', justifySelf: 'start', minHeight: 36, px: 1.25, color: 'text.primary', bgcolor: 'action.selected', borderRadius: 1 }}
        >
          <TableRowsOutlinedIcon aria-hidden="true" fontSize="small" />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Table</Typography>
        </Stack>
        <TextField
          hiddenLabel
          size="small"
          placeholder="Search"
          inputProps={{ 'aria-label': 'Search accounts' }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlinedIcon fontSize="small" /></InputAdornment> } }}
          sx={{ gridArea: 'search', width: '100%', '& .MuiOutlinedInput-root': { minHeight: 36, borderRadius: 1 } }}
        />
        <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} sx={{ gridArea: 'export', minHeight: 36, justifySelf: 'end' }}>Export CSV</Button>
      </Box>
      <Box
        aria-label="Account filters"
        sx={{
          px: 2,
          py: 1.25,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          alignItems: 'center',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 164 } }}>
          <Select
            defaultValue="all"
            inputProps={{ 'aria-label': 'Filter by access' }}
            renderValue={(value) => <Stack direction="row" spacing={0.75} alignItems="center"><ToggleOnOutlinedIcon sx={{ fontSize: 17, color: 'text.secondary' }} /><Typography variant="body2" sx={{ fontWeight: 600 }}>{value === 'all' ? 'Access' : `Access: ${value === 'enabled' ? 'Enabled' : 'Disabled'}`}</Typography></Stack>}
            sx={{ minHeight: { xs: 44, sm: 36 }, borderRadius: 999, '& .MuiSelect-select': { py: 0.75 } }}
          >
            <MenuItem value="all">All access</MenuItem>
            <MenuItem value="enabled">Enabled</MenuItem>
            <MenuItem value="disabled">Disabled</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 148 } }}>
          <Select
            defaultValue="all"
            inputProps={{ 'aria-label': 'Filter by role' }}
            renderValue={(value) => <Stack direction="row" spacing={0.75} alignItems="center"><BadgeOutlinedIcon sx={{ fontSize: 17, color: 'text.secondary' }} /><Typography variant="body2" sx={{ fontWeight: 600 }}>{value === 'all' ? 'Role' : `Role: ${value.charAt(0).toUpperCase()}${value.slice(1)}`}</Typography></Stack>}
            sx={{ minHeight: { xs: 44, sm: 36 }, borderRadius: 999, '& .MuiSelect-select': { py: 0.75 } }}
          >
            <MenuItem value="all">All roles</MenuItem>
            <MenuItem value="user">User</MenuItem>
            <MenuItem value="instructor">Instructor</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 176 } }}>
          <Select
            defaultValue="all"
            inputProps={{ 'aria-label': 'Filter by account status' }}
            renderValue={(value) => <Stack direction="row" spacing={0.75} alignItems="center"><RadioButtonCheckedOutlinedIcon sx={{ fontSize: 17, color: 'text.secondary' }} /><Typography variant="body2" sx={{ fontWeight: 600 }}>{value === 'all' ? 'Account status' : `Account status: ${value === 'registered' ? 'Registered' : 'Pending signup'}`}</Typography></Stack>}
            sx={{ minHeight: { xs: 44, sm: 36 }, borderRadius: 999, '& .MuiSelect-select': { py: 0.75 } }}
          >
            <MenuItem value="all">All statuses</MenuItem>
            <MenuItem value="registered">Registered</MenuItem>
            <MenuItem value="pending">Pending signup</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer sx={{ display: { xs: 'none', lg: 'block' } }}>
        <Table
          size="small"
          aria-label="User accounts preview"
          sx={{
            tableLayout: 'fixed',
            '& .MuiTableCell-root': { borderRight: 1, borderColor: 'divider' },
            '& .MuiTableCell-root:last-of-type': { borderRight: 0 },
            '& .MuiTableRow-root:last-of-type .MuiTableCell-root': { borderBottom: 0 },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '32%', pl: 2, py: 1.25, color: 'text.secondary', fontWeight: 600, whiteSpace: 'nowrap' }}><Stack direction="row" spacing={0.75} alignItems="center"><AlternateEmailOutlinedIcon sx={{ fontSize: 17, color: 'text.disabled' }} />Account</Stack></TableCell>
              <TableCell sx={{ width: 150, py: 1.25, color: 'text.secondary', fontWeight: 600, whiteSpace: 'nowrap' }}><Stack direction="row" spacing={0.75} alignItems="center"><ToggleOnOutlinedIcon sx={{ fontSize: 17, color: 'text.disabled' }} />Access</Stack></TableCell>
              <TableCell sx={{ width: 160, py: 1.25, color: 'text.secondary', fontWeight: 600, whiteSpace: 'nowrap' }}><Stack direction="row" spacing={0.75} alignItems="center"><BadgeOutlinedIcon sx={{ fontSize: 17, color: 'text.disabled' }} />Role</Stack></TableCell>
              <TableCell sx={{ width: 150, py: 1.25, color: 'text.secondary', fontWeight: 600, whiteSpace: 'nowrap' }}><Stack direction="row" spacing={0.75} alignItems="center"><RadioButtonCheckedOutlinedIcon sx={{ fontSize: 17, color: 'text.disabled' }} />Account status</Stack></TableCell>
              <TableCell align="right" sx={{ width: 170, py: 1.25, pr: 2, color: 'text.secondary', fontWeight: 600, whiteSpace: 'nowrap' }}><Stack direction="row" spacing={0.75} alignItems="center" justifyContent="flex-end"><MoreHorizOutlinedIcon sx={{ fontSize: 17, color: 'text.disabled' }} />Account action</Stack></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {directoryUsers.map((user) => (
              <TableRow key={user.email} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                <TableCell sx={{ pl: 2, py: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{user.email}</Typography>
                  <Typography variant="caption" color="text.secondary">{user.type}</Typography>
                </TableCell>
                <TableCell sx={{ py: 1 }}>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Switch size="small" defaultChecked={user.enabled} inputProps={{ 'aria-label': `Toggle access for ${user.email}` }} />
                    <Typography variant="caption">{user.enabled ? 'Enabled' : 'Disabled'}</Typography>
                  </Stack>
                </TableCell>
                <TableCell sx={{ py: 0.5 }}>
                  <FormControl size="small" fullWidth>
                    <Select defaultValue={user.role.toLowerCase()} variant="standard" disableUnderline inputProps={{ 'aria-label': `Role for ${user.email}` }} sx={{ minHeight: 34, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' }, '& .MuiSelect-select': { px: 1, py: 0.75, fontSize: '0.875rem' } }}>
                      <MenuItem value="user">User</MenuItem>
                      <MenuItem value="instructor">Instructor</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell sx={{ py: 1 }}>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Box aria-hidden="true" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: user.pending ? 'warning.main' : 'success.main' }} />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{user.pending ? 'Pending' : 'Registered'}</Typography>
                  </Box>
                </TableCell>
                <TableCell align="right" sx={{ py: 1, pr: 2, whiteSpace: 'nowrap' }}>
                  {user.pending ? (
                    <Typography variant="caption" color="text.secondary">Awaiting registration</Typography>
                  ) : user.type === 'Password' ? (
                    <Button size="small" startIcon={<VpnKeyOutlinedIcon />} sx={{ color: 'text.secondary', bgcolor: 'action.hover', whiteSpace: 'nowrap' }}>Reset password</Button>
                  ) : (
                    <Typography variant="caption" color="text.secondary">Managed by OAuth</Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />} sx={{ display: { xs: 'flex', lg: 'none' } }}>
        {directoryUsers.map((user) => (
          <Box key={user.email} sx={{ p: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" gap={1.5} alignItems="flex-start">
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{user.email}</Typography>
                <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
                  <Chip size="small" variant="outlined" label={user.type} />
                  <Chip size="small" label={user.pending ? 'Pending' : 'Registered'} color={user.pending ? 'warning' : 'success'} />
                </Stack>
              </Box>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                <Box component="label" sx={{ width: 44, height: 44, display: 'grid', placeItems: 'center', flexShrink: 0, cursor: 'pointer' }}>
                  <Switch size="small" defaultChecked={user.enabled} inputProps={{ 'aria-label': `Toggle access for ${user.email}` }} />
                </Box>
                <Typography variant="caption">{user.enabled ? 'Enabled' : 'Disabled'}</Typography>
              </Stack>
            </Stack>
          </Box>
        ))}
      </Stack>
    </AdminFormSurface>

    <Dialog open={addUsersOpen} onClose={() => setAddUsersOpen(false)} fullWidth maxWidth="sm" aria-labelledby="storybook-add-users-title">
      <DialogTitle component="div" id="storybook-add-users-title">
        <Typography component="h2" variant="h6">Add users</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Choose whether to grant access or create password-based accounts.
        </Typography>
      </DialogTitle>
      <Tabs value={addMethod} onChange={(_event, value) => setAddMethod(value)} variant="fullWidth" aria-label="Add user method" sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="whitelist" label="Whitelist access" />
        <Tab value="register" label="Password accounts" />
      </Tabs>
      <DialogContent sx={{ pt: 3 }}>
        <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 600 }}>
          {addMethod === 'whitelist' ? 'Grant product access' : 'Create password accounts'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
          {addMethod === 'whitelist'
            ? 'New addresses remain pending until their first sign-in.'
            : 'Use this only for non-SSO users.'}
        </Typography>
        {addMethod === 'register' && <TextField fullWidth select label="Class" defaultValue="interaction-design" sx={{ mb: 2 }}><MenuItem value="interaction-design">Interaction Design</MenuItem></TextField>}
        <TextField autoFocus fullWidth multiline minRows={4} label="Email addresses" placeholder={addMethod === 'whitelist' ? 'student@example.edu' : 'person@example.com'} />
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, '& .MuiButton-root': { minHeight: 44 } }}>
        <Button onClick={() => setAddUsersOpen(false)}>Cancel</Button>
        <Button variant="contained">{addMethod === 'whitelist' ? 'Grant access' : 'Create accounts'}</Button>
      </DialogActions>
    </Dialog>

    <Dialog open={assignmentOpen} onClose={() => setAssignmentOpen(false)} fullWidth maxWidth="sm" aria-labelledby="storybook-assignment-title">
      <DialogTitle component="div" id="storybook-assignment-title">
        <Typography component="h2" variant="h6">Instructor assignments</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Connect an instructor with a class and permission set.</Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'grid', gap: 2, pt: 3 }}>
        <TextField select label="Class" defaultValue="interaction-design"><MenuItem value="interaction-design">Interaction Design</MenuItem></TextField>
        <TextField select label="Instructor" defaultValue="maya"><MenuItem value="maya">maya.chen@example.edu</MenuItem></TextField>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, '& .MuiButton-root': { minHeight: 44 } }}>
        <Button onClick={() => setAssignmentOpen(false)}>Cancel</Button>
        <Button variant="contained" color="secondary">Assign instructor</Button>
      </DialogActions>
    </Dialog>
  </AdminPage>
  );
};

const meta = {
  title: 'Kiwi Design System/Patterns/Admin Page',
  component: AdminPagePreview,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <Paper square sx={{ minHeight: 420, p: 3, bgcolor: 'background.default' }}>
        <Story />
      </Paper>
    ),
  ],
  args: {
    maxWidth: 'lg',
  },
  parameters: {
    docs: {
      description: {
        component: `
> **Scope: Kiwi Design System.** This is a Kiwi product pattern contract, not a rule for authoring Storybook.

The standard width and bottom-spacing wrapper for Kiwi Admin page content. It relies on \`AdminLayout\` for outer padding, so pages should not add another top-level \`p: 3\` or large top margin.
        `,
      },
    },
  },
} satisfies Meta<typeof AdminPagePreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DenseOperationsDirectory: Story = {
  name: 'Dense operations directory',
  render: () => <DenseDirectoryPreview />,
  parameters: {
    docs: {
      description: {
        story: 'A high-density admin directory that separates page-level management actions from search and filtering. Add and assignment workflows use focused dialogs, while export remains attached to the account list it affects.',
      },
    },
  },
};
