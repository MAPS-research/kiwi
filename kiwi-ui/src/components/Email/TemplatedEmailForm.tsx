import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert,
  Paper,
  Divider,
  SelectChangeEvent,
  Tabs,
  Tab,
} from '@mui/material';
import { SendTemplatedEmailDtoTemplateEnum } from '../../services/index.ts';
import { SUPPORT_EMAIL } from "../../config/branding";

interface TemplatedEmailFormProps {
  template: SendTemplatedEmailDtoTemplateEnum;
  onChange: (data: any) => void;
  onPreviewChange?: (preview: { html: string; text: string; subject: string }) => void;
}

export interface EmailTemplate {
  subject: string;
  generateHtml: (data: any) => string;
  generateText: (data: any) => string;
}

// Helper function to escape HTML special characters
function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Common styles shared by all HTML templates.
 * Simple, clean design that works well across email clients.
 */
const sharedStyles = `
  body {
    margin: 0;
    font-family: Arial, sans-serif;
    line-height: 1.6;
    color: #333333;
    background-color: #f5f5f5;
  }
  .container {
    max-width: 600px;
    margin: 20px auto;
    background-color: #ffffff;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }
  .header {
    background-color: #5C3B6E;
    color: #ffffff;
    padding: 30px 24px;
    text-align: center;
    font-size: 24px;
    font-weight: 700;
  }
  .sub-header {
    font-size: 18px;
    margin-top: 8px;
    font-weight: 400;
  }
  .content {
    padding: 30px 24px;
    color: #333333;
  }
  .footer {
    background-color: #f8f9fa;
    padding: 20px 24px;
    text-align: center;
    font-size: 12px;
    color: #666666;
    border-top: 1px solid #e9ecef;
  }
  a { 
    color: #5C3B6E; 
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
`;

export const emailTemplates = {
  classAnnouncement: {
    subject: 'Class Announcement: {{className}}',
    generateHtml: (data: {
      className: string;
      message: string;
      professorName?: string;
    }) => `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>${sharedStyles}</style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            Class Announcement
            <div class="sub-header">${escapeHtml(data.className)}</div>
          </div>
          <div class="content">
            ${data.professorName ? `<p><strong>From:</strong> ${escapeHtml(data.professorName)}</p>` : ''}
            <div style="margin-top: 20px;">${data.message}</div>
          </div>
          <div class="footer">This email was sent from Kiwi Platform. Please do not reply to this email.</div>
        </div>
      </body>
      </html>
    `,
    generateText: (data: {
      className: string;
      message: string;
      professorName?: string;
    }) => `
Class Announcement: ${data.className}
${data.professorName ? `From: ${data.professorName}\n` : ''}
${'-'.repeat(50)}

${data.message}

${'-'.repeat(50)}
This email was sent from Kiwi Platform. Please do not reply to this email.
    `,
  },

  adminNotification: {
    subject: 'Important Notification from Kiwi Platform',
    generateHtml: (data: { title: string; message: string }) => `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>${sharedStyles}</style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            Kiwi Platform
            <div class="sub-header">Important Notification</div>
          </div>
          <div class="content">
            <h3 style="margin-top:0; color: #5C3B6E;">${escapeHtml(data.title)}</h3>
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin-top: 15px;">${data.message}</div>
          </div>
          <div class="footer">This is an automated message from Kiwi Platform Administration. Please do not reply to this email.</div>
        </div>
      </body>
      </html>
    `,
    generateText: (data: { title: string; message: string }) => `
KIWI PLATFORM - IMPORTANT NOTIFICATION
${'-'.repeat(50)}

${data.title}

${data.message}

${'-'.repeat(50)}
This is an automated message from Kiwi Platform Administration.
Please do not reply to this email.
    `,
  },

  welcome: {
    subject: 'Access granted for Kiwi',
    generateHtml: (data: { frontendUrl?: string }) => `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>${sharedStyles}
          .btn {
            display: inline-block;
            padding: 12px 24px;
            margin: 20px 0;
            background-color: #5C3B6E;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            font-weight: 600;
          }
          .btn:hover {
            background-color: #4a2d5a;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">Welcome!</div>
          <div class="content">
            <p>Dear Students,</p>
            
            <p>You have been granted access to <strong>Kiwi</strong> as per your request. You can now log in from the <a href="${data.frontendUrl || window.location.origin}" target="_blank" rel="noopener">website</a>.</p>
            ${SUPPORT_EMAIL ? `<p>If you have any issues while exploring Kiwi, please contact us at: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>` : ""}
            <p style="margin-top: 30px;">Happy Kiwi-ing!</p>
            <p><strong>Kiwi Support Team</strong></p>
          </div>
          <div class="footer">This email was sent from Kiwi Platform. Please do not reply to this email.</div>
        </div>
      </body>
      </html>
    `,
    generateText: (data: { frontendUrl?: string }) => `
Dear Students,


You have been granted access to Kiwi as per your request. You can now log in from the website: ${data.frontendUrl || window.location.origin}


${SUPPORT_EMAIL ? `If you have any issues while exploring Kiwi, please contact us at: ${SUPPORT_EMAIL}` : ""}

Happy Kiwi-ing!
Kiwi Support Team
    `,
  },
};

export function renderTemplate(
  templateName: keyof typeof emailTemplates,
  data: any = {},
): {
  subject: string;
  html: string;
  text: string;
} {
  const template = emailTemplates[templateName];

  // Replace placeholders in subject (if any)
  let subject = template.subject;
  Object.keys(data).forEach((key) => {
    const sanitizedValue = String(data[key] || '').replace(/[<>]/g, '');
    subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), sanitizedValue);
  });

  return {
    subject,
    html: template.generateHtml(data),
    text: template.generateText(data),
  };
}

const TemplatedEmailForm: React.FC<TemplatedEmailFormProps> = ({ template, onChange, onPreviewChange }) => {
  const [formData, setFormData] = useState<any>({});
  const [previewTab, setPreviewTab] = useState(0);

  useEffect(() => {
    // Initialize form data based on template
    const initialData: any = {};
    if (template === SendTemplatedEmailDtoTemplateEnum.ClassAnnouncement) {
      initialData.className = '';
      initialData.message = '';
      initialData.professorName = '';
    } else if (template === SendTemplatedEmailDtoTemplateEnum.AdminNotification) {
      initialData.title = '';
      initialData.message = '';
    } else if (template === SendTemplatedEmailDtoTemplateEnum.Welcome) {
      initialData.frontendUrl = '';
    }
    setFormData(initialData);
    onChange(initialData);
  }, [template, onChange]);

  useEffect(() => {
    // Generate preview whenever form data changes
    if (onPreviewChange && Object.keys(formData).length > 0) {
      const templateKey = template as keyof typeof emailTemplates;
      if (emailTemplates[templateKey]) {
        try {
          const preview = renderTemplate(templateKey, formData);
          onPreviewChange(preview);
        } catch (error) {
          console.error('Error generating preview:', error);
        }
      }
    }
  }, [formData, template, onPreviewChange]);

  const handleFieldChange = (field: string, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onChange(newData);
  };

  const renderTemplateFields = () => {
    switch (template) {
      case SendTemplatedEmailDtoTemplateEnum.ClassAnnouncement:
        return (
          <>
            <TextField
              fullWidth
              label="Class Name"
              value={formData.className || ''}
              onChange={(e) => handleFieldChange('className', e.target.value)}
              required
              helperText="Enter the name of the class for this announcement"
            />
            <TextField
              fullWidth
              label="Professor Name"
              value={formData.professorName || ''}
              onChange={(e) => handleFieldChange('professorName', e.target.value)}
              helperText="Optional: Your name will be shown in the email"
            />
            <TextField
              fullWidth
              multiline
              rows={8}
              label="Announcement Message"
              value={formData.message || ''}
              onChange={(e) => handleFieldChange('message', e.target.value)}
              required
              helperText="Enter your announcement message"
              placeholder="Dear students,\n\nI wanted to inform you about..."
            />
          </>
        );

      case SendTemplatedEmailDtoTemplateEnum.AdminNotification:
        return (
          <>
            <TextField
              fullWidth
              label="Notification Title"
              value={formData.title || ''}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              required
              helperText="Enter a title for this notification"
            />
            <TextField
              fullWidth
              multiline
              rows={8}
              label="Notification Message"
              value={formData.message || ''}
              onChange={(e) => handleFieldChange('message', e.target.value)}
              required
              helperText="Enter the notification message"
              placeholder="This is to inform all users that..."
            />
          </>
        );

      case SendTemplatedEmailDtoTemplateEnum.Welcome:
        return (
          <>
            <TextField
              fullWidth
              label="Frontend URL (Optional)"
              value={formData.frontendUrl || ''}
              onChange={(e) => handleFieldChange('frontendUrl', e.target.value)}
              helperText="Optional: Custom URL for the Kiwi platform (defaults to this site)"
              placeholder="https://kiwi.example.edu/"
            />
          </>
        );

      default:
        return null;
    }
  };

  const getTemplateDescription = () => {
    switch (template) {
      case SendTemplatedEmailDtoTemplateEnum.ClassAnnouncement:
        return 'Send announcements to class members with a professional email template';
      case SendTemplatedEmailDtoTemplateEnum.AdminNotification:
        return 'Send important notifications to users from the platform administration';
      case SendTemplatedEmailDtoTemplateEnum.Welcome:
        return 'Send a welcome email to new users who have been granted access to the Kiwi platform';
      default:
        return '';
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Alert severity="info">
        {getTemplateDescription()}
      </Alert>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {renderTemplateFields()}
      </Box>

      {/* Email Preview */}
      {onPreviewChange && (
        <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
          <Typography variant="h6" gutterBottom>
            Email Preview
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Typography variant="subtitle2" color="text.secondary">
            Subject:
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {(() => {
              try {
                const templateKey = template as keyof typeof emailTemplates;
                return renderTemplate(templateKey, formData).subject;
              } catch (error) {
                return emailTemplates[template as keyof typeof emailTemplates]?.subject.replace(/{{(\w+)}}/g, (match, key) => formData[key] || `[${key}]`) || '';
              }
            })()}
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
                maxHeight: 400,
                overflow: 'hidden',
              }}
            >
              <iframe
                srcDoc={(() => {
                  try {
                    const templateKey = template as keyof typeof emailTemplates;
                    return renderTemplate(templateKey, formData).html;
                  } catch (error) {
                    return '<html><body><p>Preview will appear as you fill in the form fields...</p></body></html>';
                  }
                })()}
                style={{
                  width: '100%',
                  height: '400px',
                  border: 'none',
                  display: 'block',
                }}
                title="Email Preview"
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
                maxHeight: 400,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
              }}
            >
              {(() => {
                try {
                  const templateKey = template as keyof typeof emailTemplates;
                  return renderTemplate(templateKey, formData).text;
                } catch (error) {
                  return 'Preview will appear as you fill in the form fields...';
                }
              })()}
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default TemplatedEmailForm;