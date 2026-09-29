import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Skeleton,
  Button,
  Tab,
  Tabs,
  Snackbar,
} from '@mui/material';
import EmailComposer, { EmailData } from '../../components/Email/EmailComposer.tsx';
import AnnouncementComposer from '../../components/Email/AnnouncementComposer.tsx';
import { emailApiClient } from '../../utils/api.ts';
import apiClient from '../../utils/api.ts';
import { useAuth } from '../../auth/AuthContext.tsx';
import { AdminPage, AdminPageHeader } from '../../components/AdminPage/index.ts';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const ClassEmail: React.FC = () => {
  const { classID } = useParams<{ classID: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [className, setClassName] = useState<string>('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    fetchClassData();
  }, [classID]);

  const fetchClassData = async () => {
    if (!classID) return;

    setLoading(true);
    try {
      // Fetch class details
      const classResponse = await apiClient.classControllerGetById({ classID: classID });
      setClassName(classResponse.className);

      // Fetch recipients based on user role
      if (user?.isAdmin) {
        const { users: usersResponseUsers } = await emailApiClient.emailControllerGetAllUsers();
        const { users: classRoster } = await apiClient.classControllerRoster({
          classRosterRequest: { classId: classID }
        });
        const classUsers = usersResponseUsers.filter(u => classRoster.some(c => c.userId === u.userId));
        setRecipients(classUsers.map(u => u.email));
      } else {
        // For professors, get their class recipients
        const { classes: recipientsResponseClasses } = await emailApiClient.emailControllerGetMyClassesRecipients();
        const currentClass = recipientsResponseClasses.filter(c => c.classId === classID);
        const recipients = currentClass[0]?.recipients || [];
        if (recipients) {
          setRecipients(recipients.map(r => r.email));
        }
      }
    } catch (error) {
      console.error('Failed to fetch class data:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load class information',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (emailData: EmailData) => {
    try {
      if (user?.isAdmin) {
        // Admin can send custom emails
        await emailApiClient.emailControllerSendToClass({
          sendEmailToClassDto: {
            classId: classID!,
            subject: emailData.subject,
            html: emailData.htmlContent,
            text: emailData.plainContent,
          },
        });
      } else {
        // Professors use announcement format
        await emailApiClient.emailControllerSendClassAnnouncement({
          sendClassAnnouncementDto: {
            classId: classID!,
            data: {
              className,
              message: emailData.plainContent,
              professorName: user?.username || 'Professor',
            },
            subjectOverride: emailData.subject,
          },
        });
      }

      setSnackbar({
        open: true,
        message: `Email sent successfully to ${recipients.length} recipients`,
        severity: 'success',
      });
    } catch (error) {
      throw error;
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <AdminPage>
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="rectangular" width="100%" height={400} sx={{ mt: 2 }} />
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title="Send Emails"
        description={`Send an email or announcement to students in ${className || 'this class'}.`}
      />

      {recipients.length === 0 ? (
        <Alert severity="warning">
          No students enrolled in this class yet.
        </Alert>
      ) : (
        <Paper sx={{ p: 3 }}>
          <Typography variant="body1" gutterBottom sx={{
            color: "text.secondary"
          }}>
            Send an email to {recipients.length} students in this class
          </Typography>

          {!user?.isAdmin ? (
            <Box sx={{ mt: 3 }}>
              <AnnouncementComposer
                classId={classID!}
                className={className}
                professorName={user?.username || 'Professor'}
                recipientCount={recipients.length}
                onSend={async (message: string, subjectOverride?: string) => {
                  try {
                    await emailApiClient.emailControllerSendClassAnnouncement({
                      sendClassAnnouncementDto: {
                        classId: classID!,
                        data: {
                          className,
                          message,
                          professorName: user?.username || 'Professor',
                        },
                        subjectOverride: subjectOverride || undefined,
                      },
                    });

                    setSnackbar({
                      open: true,
                      message: `Announcement sent successfully to ${recipients.length} recipients`,
                      severity: 'success',
                    });
                  } catch (error) {
                    setSnackbar({
                      open: true,
                      message: error instanceof Error ? error.message : 'Failed to send announcement',
                      severity: 'error',
                    });
                  }
                }}
              />
            </Box>
          ) : (
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab label="Custom Email" />
                <Tab label="Announcement Format" />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <EmailComposer
                  recipients={recipients}
                  onSend={handleSendEmail}
                />
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <AnnouncementComposer
                  classId={classID!}
                  className={className}
                  professorName={user?.username || 'Admin'}
                  recipientCount={recipients.length}
                  onSend={async (message: string, subjectOverride?: string) => {
                    try {
                      await emailApiClient.emailControllerSendClassAnnouncement({
                        sendClassAnnouncementDto: {
                          classId: classID!,
                          data: {
                            className,
                            message,
                            professorName: user?.username || 'Admin',
                          },
                          subjectOverride: subjectOverride || undefined,
                        },
                      });

                      setSnackbar({
                        open: true,
                        message: `Announcement sent successfully to ${recipients.length} recipients`,
                        severity: 'success',
                      });
                    } catch (error) {
                      setSnackbar({
                        open: true,
                        message: error instanceof Error ? error.message : 'Failed to send announcement',
                        severity: 'error',
                      });
                    }
                  }}
                />
              </TabPanel>
            </Box>
          )}
        </Paper>
      )}

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

export { ClassEmail };
