import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Checkbox,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Alert,
  Divider,
  InputAdornment,
  IconButton,
  Stack,
  Chip,
} from '@mui/material';
import {
  SearchOutlined as SearchIcon,
  ClearOutlined as ClearIcon,
  GroupOutlined as GroupIcon,
  SchoolOutlined as SchoolIcon,
  PersonOutlined as PersonIcon,
  HourglassEmptyOutlined as PendingIcon,
  ScheduleOutlined as ScheduleIcon,
} from '@mui/icons-material';
import { EmailRecipient } from '../../services/index.ts';

interface ExtendedEmailRecipient extends EmailRecipient {
  status: 'active' | 'pending';
  classIds?: string[]; // For pending users, track which classes they're pending for
}

interface RecipientSelectorProps {
  allUsers: ExtendedEmailRecipient[];
  classes: { classId: string; className: string; classRoster: EmailRecipient[] }[];
  selectedRecipients: string[];
  onRecipientsChange: (recipients: string[]) => void;
}

const RecipientSelector: React.FC<RecipientSelectorProps> = ({
  allUsers,
  classes,
  selectedRecipients,
  onRecipientsChange,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<ExtendedEmailRecipient[]>([]);

  // Get users based on filter type
  useEffect(() => {
    let users: ExtendedEmailRecipient[] = [];

    if (filterType === 'all') {
      users = allUsers;
    } else if (filterType === 'role-student') {
      users = allUsers.filter(u => u.role === 'student');
    } else if (filterType === 'role-professor') {
      users = allUsers.filter(u => u.role === 'professor');
    } else if (filterType === 'pending-all') {
      users = allUsers.filter(u => u.status === 'pending');
    } else if (filterType === 'pending-student') {
      users = allUsers.filter(u => u.status === 'pending' && u.role === 'student');
    } else if (filterType === 'pending-professor') {
      users = allUsers.filter(u => u.status === 'pending' && u.role === 'professor');
    } else if (filterType.startsWith('pending-class-')) {
      const classId = filterType.replace('pending-class-', '');
      users = allUsers.filter(u => 
        u.status === 'pending' && u.classIds?.includes(classId)
      );
    } else if (filterType.startsWith('class-')) {
      const classId = filterType.replace('class-', '');
      const classData = classes.find(c => c.classId === classId);
      // Convert EmailRecipient[] to ExtendedEmailRecipient[] for class roster
      users = (classData?.classRoster || []).map(user => ({
        ...user,
        status: 'active' as const
      }));
    }

    // Apply search filter
    if (searchQuery) {
      users = users.filter(u => 
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredUsers(users);
  }, [filterType, searchQuery, allUsers, classes]);

  const handleFilterChange = (event: any) => {
    setFilterType(event.target.value);
    setSearchQuery(''); // Clear search when changing filter
  };

  const handleToggleUser = (email: string) => {
    if (selectedRecipients.includes(email)) {
      onRecipientsChange(selectedRecipients.filter(r => r !== email));
    } else {
      onRecipientsChange([...selectedRecipients, email]);
    }
  };

  const handleSelectAll = () => {
    const allFilteredEmails = filteredUsers.map(u => u.email);
    const newSelection = new Set([...selectedRecipients, ...allFilteredEmails]);
    onRecipientsChange(Array.from(newSelection));
  };

  const handleClearAll = () => {
    const filteredEmails = filteredUsers.map(u => u.email);
    onRecipientsChange(selectedRecipients.filter(email => !filteredEmails.includes(email)));
  };

  const getFilteredSelectionCount = () => {
    return filteredUsers.filter(u => selectedRecipients.includes(u.email)).length;
  };

  const allFilteredSelected = filteredUsers.length > 0 && 
    filteredUsers.every(u => selectedRecipients.includes(u.email));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Filter Selection */}
      <FormControl fullWidth>
        <InputLabel>Filter Recipients</InputLabel>
        <Select value={filterType} onChange={handleFilterChange}>
          <MenuItem value="all">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <GroupIcon fontSize="small" />
              All Users ({allUsers.length})
            </Box>
          </MenuItem>
          <MenuItem value="role-student">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon fontSize="small" />
              All Students ({allUsers.filter(u => u.role === 'student').length})
            </Box>
          </MenuItem>
          <MenuItem value="role-professor">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SchoolIcon fontSize="small" />
              All Professors ({allUsers.filter(u => u.role === 'professor').length})
            </Box>
          </MenuItem>
          
          <Divider />
          
          <MenuItem value="pending-all">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PendingIcon fontSize="small" color="warning" />
              All Pending Users ({allUsers.filter(u => u.status === 'pending').length})
            </Box>
          </MenuItem>
          <MenuItem value="pending-student">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon fontSize="small" color="warning" />
              Pending Students ({allUsers.filter(u => u.status === 'pending' && u.role === 'student').length})
            </Box>
          </MenuItem>
          <MenuItem value="pending-professor">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SchoolIcon fontSize="small" color="warning" />
              Pending Professors ({allUsers.filter(u => u.status === 'pending' && u.role === 'professor').length})
            </Box>
          </MenuItem>
          
          <Divider />
          
          {classes.map(cls => {
            const pendingInClass = allUsers.filter(u => 
              u.status === 'pending' && u.classIds?.includes(cls.classId)
            ).length;
            
            const items = [];
            
            // Add regular class item
            items.push(
              <MenuItem key={`class-${cls.classId}`} value={`class-${cls.classId}`}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SchoolIcon fontSize="small" />
                  {cls.className} ({cls.classRoster.length} active)
                </Box>
              </MenuItem>
            );
            
            // Add pending class item if there are pending users
            if (pendingInClass > 0) {
              items.push(
                <MenuItem key={`pending-class-${cls.classId}`} value={`pending-class-${cls.classId}`}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
                    <ScheduleIcon fontSize="small" color="warning" />
                    Pending in {cls.className} ({pendingInClass})
                  </Box>
                </MenuItem>
              );
            }
            
            return items;
          }).flat()}
        </Select>
      </FormControl>

      {/* Search Bar */}
      <TextField
        fullWidth
        placeholder="Search by email..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchQuery('')}>
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }
        }}
      />

      {/* Selection Info and Actions */}
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "center"
        }}>
        <Alert severity="info" sx={{ flex: 1, mr: 2 }}>
          {getFilteredSelectionCount()} of {filteredUsers.length} recipients selected
          {selectedRecipients.length > getFilteredSelectionCount() && 
            ` (${selectedRecipients.length} total selected)`}
        </Alert>
        <Stack direction="row" sx={{
          gap: 1
        }}>
          <Button 
            size="small" 
            onClick={handleSelectAll}
            disabled={allFilteredSelected || filteredUsers.length === 0}
          >
            Select All
          </Button>
          <Button 
            size="small" 
            onClick={handleClearAll}
            disabled={getFilteredSelectionCount() === 0}
          >
            Clear All
          </Button>
        </Stack>
      </Stack>

      {/* Recipients List */}
      <Paper 
        variant="outlined" 
        sx={{ 
          maxHeight: 400, 
          overflow: 'auto',
          bgcolor: 'background.default'
        }}
      >
        {filteredUsers.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography sx={{
              color: "text.secondary"
            }}>
              {searchQuery ? 'No users found matching your search' : 'No users in this filter'}
            </Typography>
          </Box>
        ) : (
          <List dense>
            {filteredUsers.map((user, index) => (
              <React.Fragment key={user.userId}>
                <ListItem
                  component="div"
                  onClick={() => handleToggleUser(user.email)}
                  sx={{
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={selectedRecipients.includes(user.email)}
                      tabIndex={-1}
                      disableRipple
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {user.email}
                        {user.status === 'pending' && (
                          <Chip
                            label="pending"
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      user.status === 'pending' && user.classIds && user.classIds.length > 0
                        ? `${user.role} • Pending in ${user.classIds.length} class${user.classIds.length > 1 ? 'es' : ''}`
                        : user.role
                    }
                  />
                </ListItem>
                {index < filteredUsers.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>

      {/* Total Selection Summary */}
      {selectedRecipients.length > 0 && (
        <Alert severity="success">
          Total recipients selected: {selectedRecipients.length}
        </Alert>
      )}
    </Box>
  );
};

export default RecipientSelector;
