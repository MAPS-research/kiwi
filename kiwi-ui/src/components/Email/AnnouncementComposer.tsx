import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Divider,
} from '@mui/material';
import { SendOutlined, InfoOutlined } from '@mui/icons-material';

interface AnnouncementComposerProps {
  classId: string;
  className: string;
  professorName: string;
  recipientCount: number;
  onSend: (message: string, subjectOverride?: string) => Promise<void>;
}

const AnnouncementComposer: React.FC<AnnouncementComposerProps> = ({
  classId,
  className,
  professorName,
  recipientCount,
  onSend,
}) => {
  const [message, setMessage] = useState<string>('');
  const [subjectOverride, setSubjectOverride] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleSend = async () => {
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    setSending(true);
    setError('');

    try {
      await onSend(message, subjectOverride.trim() || undefined);
      // Clear form on success
      setMessage('');
      setSubjectOverride('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send announcement');
    } finally {
      setSending(false);
    }
  };

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }} icon={<InfoOutlined />}>
        This will send a formatted announcement email with the class name and your name as the professor.
      </Alert>

      <Paper sx={{ p: 3 }} elevation={0} variant="outlined">
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Class Details
          </Typography>
          <Box sx={{ display: 'flex', gap: 4, mb: 2 }}>
            <Typography variant="body2">
              <strong>Class:</strong> {className}
            </Typography>
            <Typography variant="body2">
              <strong>From:</strong> {professorName}
            </Typography>
            <Typography variant="body2">
              <strong>Recipients:</strong> {recipientCount} student{recipientCount !== 1 ? 's' : ''}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Subject Override (Optional)"
            value={subjectOverride}
            onChange={(e) => setSubjectOverride(e.target.value)}
            disabled={sending}
            placeholder="Leave empty to use default subject format"
            helperText="Default: [Class Name] Announcement from [Professor Name]"
          />

          <TextField
            fullWidth
            multiline
            rows={10}
            label="Announcement Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={sending}
            placeholder="Type your announcement message here..."
            required
            error={!message.trim() && message !== ''}
            helperText={!message.trim() && message !== '' ? 'Message is required' : ''}
          />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleSend}
              disabled={sending || !message.trim()}
              startIcon={sending ? <CircularProgress size={20} /> : <SendOutlined />}
              size="large"
            >
              {sending ? 'Sending...' : 'Send Announcement'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default AnnouncementComposer;