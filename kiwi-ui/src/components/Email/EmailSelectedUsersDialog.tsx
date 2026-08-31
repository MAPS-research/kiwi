import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Chip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import {
  EmailOutlined as EmailIcon,
  PersonAddOutlined as PersonAddIcon,
  GroupOutlined as GroupIcon,
} from '@mui/icons-material';
import { emailApiClient } from '../../utils/api.ts';
import { SendTemplatedEmailDtoTemplateEnum } from '../../services/models/SendTemplatedEmailDto.ts';
import { renderTemplate } from '../Email/TemplatedEmailForm.tsx';

interface EnrolledUser {
  id: string;
  email: string;
  role: 'admin' | 'student' | 'professor';
  status: 'active' | 'pending';
  userId?: string;
}

interface EmailSelectedUsersDialogProps {
  open: boolean;
  onClose: () => void;
  selectedUsers: EnrolledUser[];
  classId: string;
  className?: string;
  onSuccess: () => void;
}

export const EmailSelectedUsersDialog: React.FC<EmailSelectedUsersDialogProps> = ({
  open,
  onClose,
  selectedUsers,
  classId,
  className,
  onSuccess,
}) => {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [emailType, setEmailType] = useState<'welcome' | 'announcement'>('welcome');
  const [previewTab, setPreviewTab] = useState(0);

  // Separate users by status
  const pendingUsers = selectedUsers.filter(user => user.status === 'pending');
  const activeUsers = selectedUsers.filter(user => user.status === 'active');

  // Generate email previews
  const generateWelcomePreview = () => {
    try {
      return renderTemplate('welcome', {
        frontendUrl: window.location.origin,
      });
    } catch (error) {
      return {
        subject: 'Access granted for Kiwi',
        html: '<p>Preview will be generated...</p>',
        text: 'Preview will be generated...',
      };
    }
  };

  const generateAnnouncementPreview = () => {
    try {
      return renderTemplate('classAnnouncement', {
        className: className || classId,
        message: message,
        professorName: undefined,
      });
    } catch (error) {
      return {
        subject: `Class Announcement: ${className || classId}`,
        html: '<p>Preview will be generated as you fill in the form...</p>',
        text: 'Preview will be generated as you fill in the form...',
      };
    }
  };

  // Auto-set email type based on selection
  React.useEffect(() => {
    if (pendingUsers.length > 0 && activeUsers.length === 0) {
      setEmailType('welcome');
      setSubject(`Access granted for Kiwi`);
      setMessage('This will use the standard welcome email template.');
    } else if (activeUsers.length > 0 && pendingUsers.length === 0) {
      setEmailType('announcement');
      setSubject(`Class Announcement: ${className || classId}`);
      setMessage(`You have been added to ${className || `class ${classId}`}. 

You can now access all class materials and discussions.

If you have any questions, please contact your instructor.`);
    } else {
      // Mixed selection
      setEmailType('announcement');
      setSubject(`Class Enrollment Notification`);
      setMessage(`You have been enrolled in ${className || `class ${classId}`}.`);
    }
  }, [pendingUsers.length, activeUsers.length, className, classId]);

  const handleSend = async () => {
    setSending(true);
    setError(null);

    try {
      const results = [];

      // Send welcome emails to pending users using the proper template
      if (pendingUsers.length > 0) {
        try {
          const welcomeResult = await emailApiClient.emailControllerSendTemplatedEmail({
            sendTemplatedEmailDto: {
              recipients: pendingUsers.map(user => user.email),
              template: SendTemplatedEmailDtoTemplateEnum.Welcome,
              templateData: {
                frontendUrl: window.location.origin,
              },
            },
          });
          results.push({ type: 'pending', success: true, count: pendingUsers.length });
        } catch (err) {
          console.error('Error sending welcome emails:', err);
          results.push({ type: 'pending', success: false, error: err });
        }
      }

      // Send class announcement to active users using the proper template
      if (activeUsers.length > 0) {
        try {
          const announcementResult = await emailApiClient.emailControllerSendTemplatedEmail({
            sendTemplatedEmailDto: {
              recipients: activeUsers.map(user => user.email),
              template: SendTemplatedEmailDtoTemplateEnum.ClassAnnouncement,
              templateData: {
                className: className || classId,
                message: message,
                professorName: undefined, // Could be fetched from context if available
              },
            },
          });
          results.push({ type: 'active', success: true, count: activeUsers.length });
        } catch (err) {
          console.error('Error sending announcement emails:', err);
          results.push({ type: 'active', success: false, error: err });
        }
      }

      // Check results
      const allSuccess = results.every(r => r.success);
      if (allSuccess) {
        onSuccess();
        onClose();
      } else {
        const failedTypes = results.filter(r => !r.success).map(r => r.type);
        setError(`Failed to send emails to: ${failedTypes.join(', ')} users`);
      }
    } catch (err: any) {
      console.error('Error sending emails:', err);
      setError(err.message || 'Failed to send emails');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <EmailIcon color="primary" />
          <Typography variant="h6">Send Email to Selected Users</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* User Summary */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Sending to <strong>{selectedUsers.length}</strong> selected user(s):
              {pendingUsers.length > 0 && (
                <Box component="span" sx={{ ml: 1 }}>
                  <Chip
                    icon={<PersonAddIcon />}
                    label={`${pendingUsers.length} pending`}
                    size="small"
                    color="info"
                    sx={{ ml: 1 }}
                  />
                </Box>
              )}
              {activeUsers.length > 0 && (
                <Box component="span" sx={{ ml: 1 }}>
                  <Chip
                    icon={<GroupIcon />}
                    label={`${activeUsers.length} active`}
                    size="small"
                    color="success"
                    sx={{ ml: 1 }}
                  />
                </Box>
              )}
            </Typography>
          </Alert>

          {/* Recipients List */}
          <Typography variant="subtitle2" gutterBottom>
            Recipients:
          </Typography>
          <Box sx={{ maxHeight: 150, overflowY: 'auto', mb: 3, bgcolor: 'grey.50', p: 1, borderRadius: 1 }}>
            <List dense>
              {selectedUsers.map((user, index) => (
                <React.Fragment key={user.id}>
                  <ListItem>
                    <ListItemText
                      primary={user.email}
                      secondary={
                        <Box display="flex" gap={1} alignItems="center">
                          <Chip
                            label={user.status}
                            size="small"
                            color={user.status === 'active' ? 'success' : 'info'}
                          />
                          <Chip
                            label={user.role}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < selectedUsers.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Box>

          {/* Email Form */}
          {emailType === 'welcome' && pendingUsers.length > 0 && activeUsers.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
              <Typography variant="body2">
                <strong>Welcome Email Template:</strong> Pending users will receive the standard welcome email with access instructions. No custom message needed.
              </Typography>
            </Alert>
          ) : pendingUsers.length > 0 && activeUsers.length > 0 ? (
            <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
              <Typography variant="body2">
                <strong>Mixed Selection:</strong> Pending users will receive welcome emails, while active users will receive the class announcement below.
              </Typography>
            </Alert>
          ) : null}

          {(emailType === 'announcement' || (pendingUsers.length > 0 && activeUsers.length > 0)) && (
            <>
              <TextField
                fullWidth
                label="Class Name (for subject line)"
                value={className || classId}
                onChange={(e) => setSubject(e.target.value)}
                margin="normal"
                required
                disabled
                helperText={`Email subject will be: "Class Announcement: ${className || classId}"`}
              />

              <TextField
                fullWidth
                label="Announcement Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                margin="normal"
                multiline
                rows={6}
                required
                helperText="This message will be sent using the class announcement template"
              />
            </>
          )}

          {/* Email Preview */}
          {(pendingUsers.length > 0 || activeUsers.length > 0) && (
            <Paper sx={{ p: 2, bgcolor: 'grey.50', mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Email Preview
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {pendingUsers.length > 0 && activeUsers.length > 0 ? (
                // Mixed selection - show both previews
                <>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Welcome Email (for {pendingUsers.length} pending users):
                  </Typography>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Subject: {generateWelcomePreview().subject}
                    </Typography>
                    <Box
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: 'white',
                        height: 200,
                        overflow: 'hidden',
                      }}
                    >
                      <iframe
                        srcDoc={generateWelcomePreview().html}
                        style={{
                          width: '100%',
                          height: '100%',
                          border: 'none',
                          display: 'block',
                        }}
                        title="Welcome Email Preview"
                      />
                    </Box>
                  </Box>

                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Class Announcement (for {activeUsers.length} active users):
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Subject: {generateAnnouncementPreview().subject}
                  </Typography>
                  <Box
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      bgcolor: 'white',
                      height: 200,
                      overflow: 'hidden',
                    }}
                  >
                    <iframe
                      srcDoc={generateAnnouncementPreview().html}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        display: 'block',
                      }}
                      title="Announcement Email Preview"
                    />
                  </Box>
                </>
              ) : pendingUsers.length > 0 ? (
                // Only pending users - show welcome preview
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Subject: {generateWelcomePreview().subject}
                  </Typography>
                  <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                    <Tabs value={previewTab} onChange={(e, newValue) => setPreviewTab(newValue)}>
                      <Tab label="HTML Preview" />
                      <Tab label="Plain Text" />
                    </Tabs>
                  </Box>
                  {previewTab === 0 ? (
                    <Box
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: 'white',
                        height: 300,
                        overflow: 'hidden',
                      }}
                    >
                      <iframe
                        srcDoc={generateWelcomePreview().html}
                        style={{
                          width: '100%',
                          height: '100%',
                          border: 'none',
                          display: 'block',
                        }}
                        title="Welcome Email Preview"
                      />
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 2,
                        bgcolor: 'white',
                        height: 300,
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                      }}
                    >
                      {generateWelcomePreview().text}
                    </Box>
                  )}
                </>
              ) : (
                // Only active users - show announcement preview
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Subject: {generateAnnouncementPreview().subject}
                  </Typography>
                  <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                    <Tabs value={previewTab} onChange={(e, newValue) => setPreviewTab(newValue)}>
                      <Tab label="HTML Preview" />
                      <Tab label="Plain Text" />
                    </Tabs>
                  </Box>
                  {previewTab === 0 ? (
                    <Box
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: 'white',
                        height: 300,
                        overflow: 'hidden',
                      }}
                    >
                      <iframe
                        srcDoc={generateAnnouncementPreview().html}
                        style={{
                          width: '100%',
                          height: '100%',
                          border: 'none',
                          display: 'block',
                        }}
                        title="Announcement Email Preview"
                      />
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 2,
                        bgcolor: 'white',
                        height: 300,
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                      }}
                    >
                      {generateAnnouncementPreview().text}
                    </Box>
                  )}
                </>
              )}
            </Paper>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={sending}>
          Cancel
        </Button>
        <Button
          onClick={handleSend}
          variant="contained"
          disabled={
            sending ||
            // For pure announcement (only active users) - require message only (className is automatic)
            (emailType === 'announcement' && activeUsers.length > 0 && pendingUsers.length === 0 && !message) ||
            // For mixed selection (both pending and active) - require message for active users
            (pendingUsers.length > 0 && activeUsers.length > 0 && !message) ||
            // For pure welcome (only pending users) - no validation needed as template is predefined
            (emailType === 'welcome' && pendingUsers.length === 0)
          }
          startIcon={sending ? <CircularProgress size={20} /> : <EmailIcon />}
        >
          {sending ? 'Sending...' : 'Send Email'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
