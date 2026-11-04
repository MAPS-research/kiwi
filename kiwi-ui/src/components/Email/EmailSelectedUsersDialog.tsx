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
  AlertTitle,
  List,
  ListItem,
  ListItemText,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import {
  EmailOutlined as EmailIcon,
} from '@mui/icons-material';
import { emailApiClient } from '../../utils/api.ts';
import { SendTemplatedEmailDtoTemplateEnum } from '../../services/models/SendTemplatedEmailDto.ts';
import { renderTemplate } from '../Email/TemplatedEmailForm.tsx';
import StatusChip from '../StatusChip/StatusChip.tsx';
import { countNoun } from '../AdminPage/countNoun.ts';

interface EnrolledUser {
  id: string;
  email: string;
  role: 'admin' | 'student' | 'professor' | 'instructor';
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

/** A recipient's role chip and status chip words. */
const roleLabel = (role: EnrolledUser['role']) =>
  role === 'admin' ? 'Admin' : role === 'professor' || role === 'instructor' ? 'Instructor' : 'Student';

/**
 * The email preview is paper (DESIGN.md, Paper stays paper): the templated HTML
 * keeps its own rendering on the white page, framed by a hairline that follows
 * the mode, and in dark mode the page is dimmed to 92 % rather than recoloured.
 */
const PreviewFrame = ({ html, title, height }: { html: string; title: string; height: number }) => (
  // The frame follows the mode; the page inside it is paper, square like a PDF page.
  <Box sx={{ height, border: '1px solid var(--paper-frame)', borderRadius: 0, overflow: 'hidden' }}>
    <Box sx={{ height: '100%', bgcolor: 'var(--on-paper-page)', opacity: 'var(--opacity-paper-dim)' }}>
      <Box
        component="iframe"
        srcDoc={html}
        title={title}
        sx={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
      />
    </Box>
  </Box>
);

/** The plain-text part of the email is text the app draws, so it follows the mode like a code block. */
const PlainTextPreview = ({ text }: { text: string }) => (
  <Box
    sx={{
      height: 300,
      overflow: 'auto',
      p: 'var(--space-4)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-control)',
      bgcolor: 'background.paper',
      color: 'text.primary',
      whiteSpace: 'pre-wrap',
      fontFamily: 'var(--type-code-family)',
      fontSize: 'var(--type-code-size)',
      lineHeight: 'var(--type-code-leading)',
    }}
  >
    {text}
  </Box>
);

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
  const classLabel = className || `class ${classId}`;

  // Generate email previews
  const generateWelcomePreview = () => {
    try {
      return renderTemplate('welcome', {
        frontendUrl: window.location.origin,
      });
    } catch (error) {
      return {
        subject: 'You can now sign in to Kiwi',
        html: '<p>The preview appears here.</p>',
        text: 'The preview appears here.',
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
        html: '<p>The preview appears as you fill in the form.</p>',
        text: 'The preview appears as you fill in the form.',
      };
    }
  };

  // Auto-set email type based on selection
  React.useEffect(() => {
    if (pendingUsers.length > 0 && activeUsers.length === 0) {
      setEmailType('welcome');
      setSubject('You can now sign in to Kiwi');
      setMessage('This uses the standard welcome email.');
    } else if (activeUsers.length > 0 && pendingUsers.length === 0) {
      setEmailType('announcement');
      setSubject(`Class Announcement: ${className || classId}`);
      setMessage(`You've been added to ${classLabel} on Kiwi. It's already in your classes at ${window.location.origin}.`);
    } else {
      // Mixed selection
      setEmailType('announcement');
      setSubject(`You've been added to ${classLabel} on Kiwi`);
      setMessage(`You've been added to ${classLabel} on Kiwi.`);
    }
  }, [pendingUsers.length, activeUsers.length, className, classId]);

  const handleSend = async () => {
    // Busy: the button says "Sending…" and ignores presses until the sends settle.
    if (sending) return;
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
        setError(
          `Couldn't send emails to ${failedTypes.join(', ')} users. The server didn't respond as expected. Your changes are still in the form. Check the email audit before you send again.`
        );
      }
    } catch (err: any) {
      console.error('Error sending emails:', err);
      // The library's own text is never shown; this sentence is the whole message.
      setError(
        "Couldn't send the emails. The server didn't respond as expected. Your changes are still in the form. Check the email audit before you send again."
      );
    } finally {
      setSending(false);
    }
  };

  const sendUnavailable =
    // For pure announcement (only active users) - require message only (className is automatic)
    (emailType === 'announcement' && activeUsers.length > 0 && pendingUsers.length === 0 && !message) ||
    // For mixed selection (both pending and active) - require message for active users
    (pendingUsers.length > 0 && activeUsers.length > 0 && !message) ||
    // For pure welcome (only pending users) - no validation needed as template is predefined
    (emailType === 'welcome' && pendingUsers.length === 0);

  return (
    // The dialog renders in a portal, outside the admin area: it keeps the page's compact density.
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth data-density="compact">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <EmailIcon color="primary" aria-hidden />
        Email selected users
      </DialogTitle>
      <DialogContent>
        <Box>
          {/* User Summary */}
          <Alert severity="info" role="note" sx={{ mb: 'var(--space-5)' }}>
            <Box
              component="span"
              sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}
            >
              <span>
                Sending to{' '}
                <Box component="strong" sx={{ fontWeight: 'var(--weight-semibold)' }}>
                  {countNoun(selectedUsers.length, 'selected user')}
                </Box>
                :
              </span>
              {pendingUsers.length > 0 && (
                <StatusChip kind="info" label={`${pendingUsers.length} pending`} />
              )}
              {activeUsers.length > 0 && (
                <StatusChip kind="success" label={`${activeUsers.length} active`} />
              )}
            </Box>
          </Alert>

          {/* Recipients List */}
          <Typography variant="subtitle2" component="h3" sx={{ mb: 'var(--space-2)' }}>
            Recipients:
          </Typography>
          <Box
            sx={{
              maxHeight: 150,
              overflowY: 'auto',
              mb: 'var(--space-5)',
              bgcolor: 'action.hover',
              px: 'var(--space-2)',
              borderRadius: 'var(--radius-control)',
            }}
          >
            <List dense>
              {selectedUsers.map((user, index) => (
                <React.Fragment key={user.id}>
                  <ListItem>
                    <ListItemText
                      primary={user.email}
                      slotProps={{ secondary: { component: "div" } }}
                      secondary={
                        <Box
                          sx={{
                            display: 'flex',
                            gap: 'var(--space-2)',
                            alignItems: 'center',
                            mt: 'var(--space-1)',
                          }}
                        >
                          <StatusChip
                            kind={user.status === 'active' ? 'success' : 'info'}
                            label={user.status === 'active' ? 'Active' : 'Pending'}
                          />
                          <Chip label={roleLabel(user.role)} />
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < selectedUsers.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          </Box>

          {/* Email Form */}
          {emailType === 'welcome' && pendingUsers.length > 0 && activeUsers.length === 0 ? (
            <Alert severity="info" role="note" sx={{ mb: 'var(--space-4)' }}>
              <AlertTitle>Welcome email</AlertTitle>
              Pending users get the standard welcome email with sign-in instructions. You don't need to write a message.
            </Alert>
          ) : pendingUsers.length > 0 && activeUsers.length > 0 ? (
            <Alert severity="warning" role="note" sx={{ mb: 'var(--space-4)' }}>
              <AlertTitle>Mixed selection</AlertTitle>
              Pending users get the welcome email. Active users get the announcement below.
            </Alert>
          ) : null}

          {(emailType === 'announcement' || (pendingUsers.length > 0 && activeUsers.length > 0)) && (
            <Box sx={{ display: 'grid', gap: 'var(--space-stack)' }}>
              <TextField
                fullWidth
                label="Class name (for the subject line)"
                value={className || classId}
                onChange={(e) => setSubject(e.target.value)}
                slotProps={{ input: { readOnly: true } }}
                helperText={`The subject will be "Class announcement: ${className || classId}".`}
              />

              {/* The message is a reading surface: comfortable inside the compact dialog. */}
              <Box data-density="comfortable">
                <TextField
                  fullWidth
                  label="Announcement message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  multiline
                  rows={6}
                  required
                  helperText="Sent with the class announcement template."
                />
              </Box>
            </Box>
          )}

          {/* Email Preview */}
          {(pendingUsers.length > 0 || activeUsers.length > 0) && (
            <Box
              sx={{
                p: 'var(--space-4)',
                mt: 'var(--space-5)',
                bgcolor: 'action.hover',
                borderRadius: 'var(--radius-control)',
              }}
            >
              <Typography variant="subtitle1" component="h3" sx={{ mb: 'var(--space-2)' }}>
                Email preview
              </Typography>
              <Divider sx={{ mb: 'var(--space-4)' }} />

              {pendingUsers.length > 0 && activeUsers.length > 0 ? (
                // Mixed selection - show both previews
                <>
                  <Typography variant="subtitle2" component="h4" sx={{ mb: 'var(--space-2)' }}>
                    Welcome email (for {countNoun(pendingUsers.length, 'pending user')}):
                  </Typography>
                  <Box sx={{ mb: 'var(--space-5)' }}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "text.secondary",
                        mb: 'var(--space-2)'
                      }}>
                      Subject: {generateWelcomePreview().subject}
                    </Typography>
                    <PreviewFrame
                      html={generateWelcomePreview().html}
                      title="Welcome email preview"
                      height={200}
                    />
                  </Box>

                  <Typography variant="subtitle2" component="h4" sx={{ mb: 'var(--space-2)' }}>
                    Class announcement (for {countNoun(activeUsers.length, 'active user')}):
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      mb: 'var(--space-2)'
                    }}>
                    Subject: {generateAnnouncementPreview().subject}
                  </Typography>
                  <PreviewFrame
                    html={generateAnnouncementPreview().html}
                    title="Announcement email preview"
                    height={200}
                  />
                </>
              ) : pendingUsers.length > 0 ? (
                // Only pending users - show welcome preview
                <>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      mb: 'var(--space-2)'
                    }}>
                    Subject: {generateWelcomePreview().subject}
                  </Typography>
                  <Box sx={{ borderBottom: '1px solid var(--border-subtle)', mb: 'var(--space-4)' }}>
                    <Tabs value={previewTab} onChange={(e, newValue) => setPreviewTab(newValue)}>
                      <Tab label="HTML preview" />
                      <Tab label="Plain text" />
                    </Tabs>
                  </Box>
                  {previewTab === 0 ? (
                    <PreviewFrame
                      html={generateWelcomePreview().html}
                      title="Welcome email preview"
                      height={300}
                    />
                  ) : (
                    <PlainTextPreview text={generateWelcomePreview().text} />
                  )}
                </>
              ) : (
                // Only active users - show announcement preview
                <>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      mb: 'var(--space-2)'
                    }}>
                    Subject: {generateAnnouncementPreview().subject}
                  </Typography>
                  <Box sx={{ borderBottom: '1px solid var(--border-subtle)', mb: 'var(--space-4)' }}>
                    <Tabs value={previewTab} onChange={(e, newValue) => setPreviewTab(newValue)}>
                      <Tab label="HTML preview" />
                      <Tab label="Plain text" />
                    </Tabs>
                  </Box>
                  {previewTab === 0 ? (
                    <PreviewFrame
                      html={generateAnnouncementPreview().html}
                      title="Announcement email preview"
                      height={300}
                    />
                  ) : (
                    <PlainTextPreview text={generateAnnouncementPreview().text} />
                  )}
                </>
              )}
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 'var(--space-4)' }}>
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
          aria-busy={sending || undefined}
          disabled={!sending && sendUnavailable}
          startIcon={<EmailIcon />}
        >
          {sending ? 'Sending…' : 'Send email'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
