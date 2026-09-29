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
  classEnrollment: {
    subject: "You've been added to {{className}} on Kiwi",
    generateHtml: (data: {
      className: string;
      professorName?: string;
      frontendUrl: string;
      firstSignIn: boolean;
      googleSignIn?: boolean;
      supportEmail?: string;
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
            Welcome to Kiwi
            <div class="sub-header">${escapeHtml(data.className)}</div>
          </div>
          <div class="content">
            <p>You have been added to <strong>${escapeHtml(data.className)}</strong>${data.professorName ? ` (${escapeHtml(data.professorName)})` : ''} on Kiwi.</p>
            ${
              data.firstSignIn
                ? data.googleSignIn
                  ? `<p>Sign in at <a href="${escapeHtml(data.frontendUrl)}" target="_blank" rel="noopener">${escapeHtml(data.frontendUrl)}</a> with your Google account for <strong>this email address</strong>. The class will be in your course list as soon as you sign in.</p>`
                  : `<p>Once your account for <strong>this email address</strong> is set up, sign in at <a href="${escapeHtml(data.frontendUrl)}" target="_blank" rel="noopener">${escapeHtml(data.frontendUrl)}</a>. The class will be in your course list.</p>`
                : `<p>It is already in your course list at <a href="${escapeHtml(data.frontendUrl)}" target="_blank" rel="noopener">${escapeHtml(data.frontendUrl)}</a>.</p>`
            }
            ${data.supportEmail ? `<p>If you have any issues, contact us at <a href="mailto:${escapeHtml(data.supportEmail)}">${escapeHtml(data.supportEmail)}</a>.</p>` : ''}
            <p><strong>Kiwi Support Team</strong></p>
          </div>
          <div class="footer">This email was sent from Kiwi Platform. Please do not reply to this email.</div>
        </div>
      </body>
      </html>
    `,
    generateText: (data: {
      className: string;
      professorName?: string;
      frontendUrl: string;
      firstSignIn: boolean;
      googleSignIn?: boolean;
      supportEmail?: string;
    }) => `
You have been added to ${data.className}${data.professorName ? ` (${data.professorName})` : ''} on Kiwi.

${
  data.firstSignIn
    ? data.googleSignIn
      ? `Sign in at ${data.frontendUrl} with your Google account for this email address. The class will be in your course list as soon as you sign in.`
      : `Once your account for this email address is set up, sign in at ${data.frontendUrl}. The class will be in your course list.`
    : `It is already in your course list at ${data.frontendUrl}.`
}
${
  data.supportEmail
    ? `
If you have any issues, contact us at ${data.supportEmail}.
`
    : ''
}
Kiwi Support Team
    `,
  },

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
    generateHtml: (data: {
      frontendUrl?: string;
      institutionName?: string;
      supportEmail?: string;
      guideUrl?: string;
    }) => `
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
            background-color: #4a3053;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">Welcome to ${data.institutionName || 'Kiwi'}!</div>
          <div class="content">
            <p>Dear Students,</p>
            <p>Welcome to <strong>${data.institutionName || 'Kiwi'}</strong>!</p>
            <p>You have been granted access to <strong>Kiwi</strong> as per your request. You can now log in from the <a href="${data.frontendUrl || 'http://localhost:3001/'}" target="_blank" rel="noopener">website</a>.</p>
            ${data.guideUrl ? `<p>Please follow this <a href="${data.guideUrl}" target="_blank" rel="noopener">guide</a> to learn about how to best use Kiwi to support your self‑learning experience with AI.</p>` : ''}
            ${data.supportEmail ? `<p>If you have any issues while exploring Kiwi, please contact us at: <a href="mailto:${data.supportEmail}">${data.supportEmail}</a></p>` : ''}
            <p style="margin-top: 30px;">Happy Kiwi-ing!</p>
            <p><strong>Kiwi Support Team</strong></p>
          </div>
          <div class="footer">This email was sent from Kiwi Platform. Please do not reply to this email.</div>
        </div>
      </body>
      </html>
    `,
    generateText: (data: {
      frontendUrl?: string;
      institutionName?: string;
      supportEmail?: string;
      guideUrl?: string;
    }) => `
Dear Students,

Welcome to ${data.institutionName || 'Kiwi'}!

You have been granted access to Kiwi as per your request. You can now log in from the website: ${data.frontendUrl || 'http://localhost:3001/'}
${
  data.guideUrl
    ? `
Please follow this guide to learn about how to best use Kiwi to support your self‑learning experience with AI:
${data.guideUrl}
`
    : ''
}${
      data.supportEmail
        ? `
If you have any issues while exploring Kiwi, please contact us at: ${data.supportEmail}
`
        : ''
    }
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
