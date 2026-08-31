import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Button,
  Tab,
  Tabs,
  Snackbar,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Skeleton,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  CircularProgress,
} from '@mui/material';
import {
  EmailOutlined,
  ExpandMoreOutlined as ExpandMore,
  SendOutlined as SendIcon,
  GroupOutlined as GroupIcon,
  SchoolOutlined as SchoolIcon,
  PersonOutline as PersonIcon,
} from '@mui/icons-material';
import EmailComposer, { EmailData } from '../../components/Email/EmailComposer.tsx';
import TemplatedEmailForm from '../../components/Email/TemplatedEmailForm.tsx';
import RecipientSelector from '../../components/Email/RecipientSelector.tsx';
import apiClient, { emailApiClient } from '../../utils/api.ts';
import { SendEmailDto, SendTemplatedEmailDto, ClassEmailRecipients, SendEmailToClassDto, SendTemplatedEmailDtoTemplateEnum, EmailRecipient } from '../../services/index.ts';
import { AdminPage, AdminPageHeader } from '../../components/AdminPage/index.ts';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface ExtendedEmailRecipient extends EmailRecipient {
  status: 'active' | 'pending';
  classIds?: string[]; // For pending users, track which classes they're pending for
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const AdminEmail: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [allUsers, setAllUsers] = useState<ExtendedEmailRecipient[]>([]);
  const [classes, setClasses] = useState<{ classId: string; className: string; classRoster: EmailRecipient[] }[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [templateSelectedRecipients, setTemplateSelectedRecipients] = useState<string[]>([]);
  const [templateName, setTemplateName] = useState<SendTemplatedEmailDtoTemplateEnum>(SendTemplatedEmailDtoTemplateEnum.ClassAnnouncement);
  const [templateData, setTemplateData] = useState<any>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchPendingUsers = async (): Promise<ExtendedEmailRecipient[]> => {
    try {
      // Get all class IDs
      const classesResponse = await apiClient.classControllerList();
      const pendingUsersMap = new Map<string, ExtendedEmailRecipient>();

      // Fetch pending users for each class
      await Promise.all(classesResponse.classIds.map(async classId => {
        try {
          const pendingRes = await apiClient.classControllerGetPendingEnrollment({
            classPendingEnrollmentRequest: { classId: classId }
          });

          // Process each pending user
          pendingRes.pendingUsers.forEach((user: PendingUser) => {
            const key = user.userEmail; // Use email as unique key

            if (pendingUsersMap.has(key)) {
              // User is pending in multiple classes, add this classId
              const existingUser = pendingUsersMap.get(key)!;
              existingUser.classIds = [...(existingUser.classIds || []), classId];
            } else {
              // New pending user
              pendingUsersMap.set(key, {
                userId: user.id,
                email: user.userEmail,
                role: user.role,
                status: 'pending',
                classIds: [classId]
              });
            }
          });
        } catch (error) {
          console.error(`Error fetching pending users for class ${classId}:`, error);
        }
      }));

      return Array.from(pendingUsersMap.values());
    } catch (error) {
      console.error('Error fetching pending users:', error);
      return [];
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersResponse, classesResponse, pendingUsers] = await Promise.all([
        emailApiClient.emailControllerGetAllUsers(),
        apiClient.classControllerList(),
        fetchPendingUsers(),
      ]);

      // Convert active users to ExtendedEmailRecipient format
      const activeUsers: ExtendedEmailRecipient[] = usersResponse.users.map(user => ({
        ...user,
        status: 'active' as const
      }));

      // Combine active and pending users
      const combinedUsers = [...activeUsers, ...pendingUsers];
      setAllUsers(combinedUsers);
      // Fill classes with classId and className
      setClasses(await Promise.all(classesResponse.classIds.map(async classId => {
        try {
          const classInfo = await apiClient.classControllerGetById({ classID: classId });
          const classRoster = await apiClient.classControllerRoster({
            classRosterRequest: { classId: classId }
          });

          return {
            classId: classId,
            className: classInfo.className || classInfo.name || classId, // Try multiple fields and fallback to classId
            classRoster: classRoster.users,
          };
        } catch (error) {
          console.error(`Error fetching data for class ${classId}:`, error);
          // Return minimal class info if there's an error
          return {
            classId: classId,
            className: classId,
            classRoster: [],
          };
        }
      })));
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load email data',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };


  const handleSendEmail = async (emailData: EmailData) => {
    try {
      if (selectedRecipients.length === 0) {
        setSnackbar({
          open: true,
          message: 'No recipients selected',
          severity: 'error',
        });
        return;
      }

      const emailDto: SendEmailDto = {
        subject: emailData.subject,
        html: emailData.htmlContent,
        text: emailData.plainContent,
        recipients: selectedRecipients,
      };

      const response = await emailApiClient.emailControllerSendToUsers({
        sendEmailDto: emailDto
      });

      setSnackbar({
        open: true,
        message: `Email sent successfully to ${response?.recipientCount || 0} recipients`,
        severity: 'success',
      });

      // Reset selection after successful send
      setSelectedRecipients([]);
    } catch (error) {
      throw error;
    }
  };

  const handleSendTemplatedEmail = async () => {
    try {
      if (templateSelectedRecipients.length === 0) {
        setSnackbar({
          open: true,
          message: 'No recipients selected',
          severity: 'error',
        });
        return;
      }

      const templatedEmailDto: SendTemplatedEmailDto = {
        template: templateName,
        templateData: templateData,
        recipients: templateSelectedRecipients,
      };

      const response = await emailApiClient.emailControllerSendTemplatedEmail({
        sendTemplatedEmailDto: templatedEmailDto,
      });

      setSnackbar({
        open: true,
        message: `Templated email sent successfully to ${response.recipientCount} recipients`,
        severity: 'success',
      });

      // Reset form
      setTemplateData({});
      setTemplateSelectedRecipients([]);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to send templated email',
        severity: 'error',
      });
    }
  };


  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={300} height={40} />
        <Skeleton variant="rectangular" width="100%" height={400} sx={{ mt: 2 }} />
      </Box>
    );
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title="Email Management"
        description="Send emails to users and classes, or use an email template."
      />

      <Paper sx={{ p: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Custom Email" icon={<EmailOutlined />} iconPosition="start" />
            <Tab label="Templated Email" icon={<SendIcon />} iconPosition="start" />
            <Tab label="Email Lists" icon={<GroupIcon />} iconPosition="start" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <RecipientSelector
            allUsers={allUsers}
            classes={classes}
            selectedRecipients={selectedRecipients}
            onRecipientsChange={setSelectedRecipients}
          />

          <Box sx={{ mt: 3 }}>
            <EmailComposer
              recipients={[]}
              onSend={handleSendEmail}
            />
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Recipient Selection */}
            <RecipientSelector
              allUsers={allUsers}
              classes={classes}
              selectedRecipients={templateSelectedRecipients}
              onRecipientsChange={setTemplateSelectedRecipients}
            />

            {/* Template Selection */}
            <FormControl fullWidth>
              <InputLabel>Email Template</InputLabel>
              <Select
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value as SendTemplatedEmailDtoTemplateEnum)}
              >
                <MenuItem value={SendTemplatedEmailDtoTemplateEnum.ClassAnnouncement}>
                  Class Announcement
                </MenuItem>
                <MenuItem value={SendTemplatedEmailDtoTemplateEnum.AdminNotification}>
                  Admin Notification
                </MenuItem>
                <MenuItem value={SendTemplatedEmailDtoTemplateEnum.Welcome}>
                  Welcome Email
                </MenuItem>
              </Select>
            </FormControl>

            {/* Template Form */}
            <TemplatedEmailForm
              template={templateName}
              onChange={setTemplateData}
              onPreviewChange={() => { }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                onClick={handleSendTemplatedEmail}
                startIcon={<SendIcon />}
                disabled={!templateData || Object.keys(templateData).length === 0}
              >
                Send Templated Email
              </Button>
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Email Lists Overview
          </Typography>

          {/* All Users Section */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>All Users ({allUsers.length})</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                {allUsers.slice(0, 50).map(user => (
                  <ListItem key={user.userId}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {user.email}
                          <Chip
                            label={user.status}
                            size="small"
                            color={user.status === 'active' ? 'success' : 'warning'}
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2">{user.role}</Typography>
                          {user.status === 'pending' && user.classIds && user.classIds.length > 0 && (
                            <Typography variant="caption" color="text.secondary">
                              Pending in {user.classIds.length} class{user.classIds.length > 1 ? 'es' : ''}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
                {allUsers.length > 50 && (
                  <ListItem>
                    <ListItemText
                      primary={`... and ${allUsers.length - 50} more users`}
                      secondary="Showing first 50 users only"
                    />
                  </ListItem>
                )}
              </List>
            </AccordionDetails>
          </Accordion>

          {/* Pending Users Section */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>
                Pending Users ({allUsers.filter(u => u.status === 'pending').length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                {allUsers
                  .filter(user => user.status === 'pending')
                  .slice(0, 50)
                  .map(user => (
                    <ListItem key={user.userId}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {user.email}
                            <Chip
                              label="pending"
                              size="small"
                              color="warning"
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2">{user.role}</Typography>
                            {user.classIds && user.classIds.length > 0 && (
                              <Typography variant="caption" color="text.secondary">
                                Classes: {user.classIds.join(', ')}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                {allUsers.filter(u => u.status === 'pending').length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary="No pending users"
                      secondary="All users have been activated"
                    />
                  </ListItem>
                )}
                {allUsers.filter(u => u.status === 'pending').length > 50 && (
                  <ListItem>
                    <ListItemText
                      primary={`... and ${allUsers.filter(u => u.status === 'pending').length - 50} more pending users`}
                      secondary="Showing first 50 pending users only"
                    />
                  </ListItem>
                )}
              </List>
            </AccordionDetails>
          </Accordion>

          {classes.map(cls => (
            <Accordion key={cls.classId}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography>{cls.className} ({cls.classRoster.length} students)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {cls.classRoster.slice(0, 50).map((student, idx) => (
                    <ListItem key={idx}>
                      <ListItemText primary={student.email} />
                    </ListItem>
                  ))}
                  {cls.classRoster.length > 50 && (
                    <ListItem>
                      <ListItemText
                        primary={`... and ${cls.classRoster.length - 50} more students`}
                        secondary="Showing first 50 students only"
                      />
                    </ListItem>
                  )}
                </List>
              </AccordionDetails>
            </Accordion>
          ))}
        </TabPanel>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </AdminPage>
  );
};

export default AdminEmail;
