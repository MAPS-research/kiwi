export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  email: {
    smtp: {
      host:
        process.env.AWS_SES_SMTP_HOST || 'email-smtp.us-east-1.amazonaws.com',
      port: parseInt(process.env.AWS_SES_SMTP_PORT || '587', 10),
      user: process.env.AWS_SES_SMTP_USER || '',
      password: process.env.AWS_SES_SMTP_PASSWORD || '',
    },
    from: {
      email: process.env.AWS_SES_FROM_EMAIL || 'noreply@example.com',
      name: process.env.AWS_SES_FROM_NAME || 'Kiwi Platform',
    },
    replyTo: {
      email: process.env.AWS_SES_REPLY_TO_EMAIL || 'support@example.com',
      name: process.env.AWS_SES_REPLY_TO_NAME || 'Kiwi Platform Support',
    },
    testMode: process.env.EMAIL_TEST_MODE === 'true',
  },
});
