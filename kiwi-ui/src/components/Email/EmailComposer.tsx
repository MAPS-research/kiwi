import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  SelectChangeEvent,
  Paper,
} from '@mui/material';
import { SendOutlined } from '@mui/icons-material';

interface EmailComposerProps {
  recipients?: string[];
  recipientOptions?: { label: string; value: string }[];
  allowRecipientSelection?: boolean;
  subjectPrefix?: string;
  onSend: (data: EmailData) => Promise<void>;
  onCancel?: () => void;
}

export interface EmailData {
  recipients: string[];
  subject: string;
  htmlContent: string;
  plainContent: string;
}

const EmailComposer: React.FC<EmailComposerProps> = ({
  recipients = [],
  recipientOptions = [],
  allowRecipientSelection = false,
  subjectPrefix = '',
  onSend,
  onCancel,
}) => {
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>(recipients);
  const [subject, setSubject] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleRecipientChange = (event: SelectChangeEvent<typeof selectedRecipients>) => {
    const value = event.target.value;
    setSelectedRecipients(typeof value === 'string' ? value.split(',') : value);
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      setError('Please enter a subject');
      return;
    }
    if (!content.trim()) {
      setError('Please enter a message');
      return;
    }
    if (allowRecipientSelection && selectedRecipients.length === 0) {
      setError('Please select at least one recipient');
      return;
    }

    setSending(true);
    setError('');

    try {
      await onSend({
        recipients: selectedRecipients,
        subject: subjectPrefix ? `${subjectPrefix} ${subject}` : subject,
        htmlContent: content.replace(/\n/g, '<br/>'),
        plainContent: content,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
      setSending(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {allowRecipientSelection && (
        <FormControl fullWidth>
          <InputLabel>Recipients</InputLabel>
          <Select
            multiple
            value={selectedRecipients}
            onChange={handleRecipientChange}
            input={<OutlinedInput label="Recipients" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip
                    key={value}
                    label={recipientOptions.find(opt => opt.value === value)?.label || value}
                    size="small"
                  />
                ))}
              </Box>
            )}
          >
            {recipientOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {!allowRecipientSelection && recipients.length > 0 && (
        <Box>
          <Typography variant="body2" gutterBottom sx={{
            color: "text.secondary"
          }}>
            Recipients: {recipients.length} selected
          </Typography>
        </Box>
      )}

      <TextField
        fullWidth
        label="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        disabled={sending}
        slotProps={{
          input: {
            startAdornment: subjectPrefix ? (
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  mr: 1
                }}>
                {subjectPrefix}
              </Typography>
            ) : undefined,
          }
        }}
      />

      <TextField
        fullWidth
        multiline
        rows={12}
        label="Message"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={sending}
        placeholder="Compose your message..."
      />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
        {onCancel && (
          <Button onClick={onCancel} disabled={sending}>
            Cancel
          </Button>
        )}
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={sending || !subject.trim() || !content.trim()}
          startIcon={sending ? <CircularProgress size={20} /> : <SendOutlined />}
        >
          {sending ? 'Sending...' : 'Send Email'}
        </Button>
      </Box>
    </Box>
  );
};

export default EmailComposer;