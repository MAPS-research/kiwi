# Email

How Kiwi sends email: SMTP configuration, the HTTP endpoints, the templates, and
the audit log. For operators and backend developers. The code is in
`kiwi/src/email/` and `kiwi/src/email-audit/`.

## What sends email today

Email goes out only when someone calls one of the endpoints below. Nothing in
the app sends mail on its own: no service outside `kiwi/src/email/` calls
`EmailService`, so registration, enrollment and webhook approval send no
welcome email. `sendWelcomeEmail` and `sendAdminNotificationEmail` exist but
have no callers.

## Configuration

Set these in `kiwi/.env`. Defaults come from `kiwi/src/config/configuration.ts`.

| Variable | Default | Purpose |
|---|---|---|
| `EMAIL_TEST_MODE` | `false` when unset (`kiwi/.env.example` sets `true`) | When `true`, emails are logged and audited but not sent |
| `AWS_SES_SMTP_HOST` | `email-smtp.us-east-1.amazonaws.com` | SMTP host; any SMTP server works |
| `AWS_SES_SMTP_PORT` | `587` | Port `465` uses TLS from the start; other ports use STARTTLS if offered |
| `AWS_SES_SMTP_USER`, `AWS_SES_SMTP_PASSWORD` | empty | SMTP credentials |
| `AWS_SES_FROM_EMAIL`, `AWS_SES_FROM_NAME` | `noreply@example.com`, `Kiwi Platform` | Sender |
| `AWS_SES_REPLY_TO_EMAIL`, `AWS_SES_REPLY_TO_NAME` | `support@example.com`, `Kiwi Platform Support` | Reply-to |

Only the welcome template reads these:

| Variable | Used as |
|---|---|
| `FRONTEND_URL` | Login link; the first entry of the comma-separated list, else `http://localhost:3001/` |
| `INSTITUTION_NAME` | Name in the heading; defaults to "Kiwi" |
| `SUPPORT_EMAIL` | Support paragraph, omitted if unset |
| `ONBOARDING_GUIDE_URL` | Guide paragraph, omitted if unset |

The backend checks the SMTP connection at startup and logs
`Email transporter verification failed` if it cannot connect. It logs this in
test mode too, and the error does not stop the app.

With more than one recipient, the message is addressed to the sender and the
recipients are put in `Bcc`.

## Endpoints

All endpoints need a bearer token and the session cookie. "Professor" means an
admin or a user with a `professor` enrollment in any class. The class-scoped
professor endpoints also require a `professor` enrollment in the target class;
admins without one get `403` there.

| Method and path | Access | Body or result |
|---|---|---|
| `POST /email/send-to-users` | Admin | `recipients` (emails), `subject`, `text` and/or `html` |
| `POST /email/send-to-class` | Admin | `classId`, `subject`, `text` and/or `html`; sent to the class's students |
| `POST /email/send-to-my-class` | Professor of the class | Same body as `send-to-class` |
| `POST /email/send-announcement` | Professor of the class | `classId`, `data: {message, className?, professorName?}`, `subjectOverride?`; uses the `classAnnouncement` template |
| `POST /email/send-templated` | Admin | `recipients`, `template`, `templateData`, `subjectOverride?` |
| `GET /email/recipients/all-users` | Admin | Every user's id, email and system role |
| `GET /email/recipients/my-classes` | Professor | Students' emails for each class where you are a professor |

The send endpoints return `200` with
`{"message": "...", "recipientCount": n}`. They return `400` if neither `text`
nor `html` is given, or if the class has no students.

In `send-announcement`, `className` defaults to the class name, and
`professorName` defaults to the part of your email before the `@`.

Example, as the seeded admin, sending to the seeded class's student. See
[Exploring the API](development.md#exploring-the-api) for how to get `$TOKEN`
and `cookies.txt`. Run it from the directory that holds `cookies.txt`.

```bash
curl -s -b cookies.txt -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"classId":"seed-class-001","subject":"Room change","text":"Lab moved to room 301."}' \
  http://localhost:3000/email/send-to-class
```

## Templates

Templates are defined in `kiwi/src/email/email.templates.ts`. Each has a
subject, an HTML body and a plain-text body.

| Name | Data | Subject |
|---|---|---|
| `classAnnouncement` | `className`, `message`, `professorName?` | `Class Announcement: <className>` |
| `adminNotification` | `title`, `message` | `Important Notification from Kiwi Platform` |
| `welcome` | `frontendUrl?`, `institutionName?`, `supportEmail?`, `guideUrl?` | `Access granted for Kiwi` |

Notes:

- **`message` is inserted as raw HTML** in `classAnnouncement` and
  `adminNotification`. Only `className`, `professorName` and `title` are
  escaped. HTML formatting in `message` is therefore rendered, and so is any
  markup a sender includes. Pass only trusted input.
- The `welcome` template addresses "Dear Students" and ignores `userName` and
  `className`. It does not escape its values, which come from configuration.
- `sendWelcomeEmail` fills the welcome data from the configuration above.
  `POST /email/send-templated` with `"template": "welcome"` does not; pass those
  fields in `templateData` or the defaults apply.

To add a template, add an entry to `emailTemplates`. `sendTemplatedEmail`
accepts any key of that object. `POST /email/send-templated` only allows the
names in the `EmailTemplate` enum in
`kiwi/src/email/dto/send-templated-email.dto.ts` and in the controller's own
list, so update both to expose a new template there.

## Sending email from code

Import `EmailModule` into your feature module and inject `EmailService`.
`EmailModule` imports `AuthModule` and `ClassModule`, so those two modules
cannot import it.

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class EnrollmentNotifier {
  private readonly logger = new Logger(EnrollmentNotifier.name);

  constructor(private readonly emailService: EmailService) {}

  async welcome(user: { id: string; email: string }, className?: string) {
    try {
      // (email, userName, className?, userId?)
      await this.emailService.sendWelcomeEmail(
        user.email,
        user.email.split('@')[0],
        className,
        user.id,
      );
    } catch (error) {
      // Sending failures are already audited; don't fail the caller.
      this.logger.error('Welcome email failed', error);
    }
  }
}
```

Other methods:

- `sendEmail(options, auditMetadata?)`, where `options` has `to`, `subject`,
  `text?`, `html?`, `replyTo?` and `attachments?`.
- `sendTemplatedEmail(to, templateName, data, subjectOverride?, auditMetadata?)`.
- `sendClassAnnouncementEmail(recipients, className, message, professorName?, auditMetadata?)`.
- `sendAdminNotificationEmail(recipients, title, message, userId?)`.

`auditMetadata` takes `userId` and `classId`, which are recorded in the audit
log.

## Audit log

Every send attempt writes an `EmailAuditLog` row with sender, recipients,
subject, `emailType` (`direct` or `template`), template name, `userId`,
`classId` and a status:

- `sent`, with the SMTP message id;
- `failed`, with the error message (the error is also returned to the caller);
- `test_mode`, when `EMAIL_TEST_MODE=true`.

| Method and path | Access | Purpose |
|---|---|---|
| `GET /email-audit/logs` | Admin | List logs. Filters: `status`, `emailType`, `userId`, `classId`, `recipientEmail`, `startDate`, `endDate` |
| `GET /email-audit/logs/:id` | Admin | One log entry |
| `GET /email-audit/stats` | Admin | Totals by status and by `emailType`. Filters: `startDate`, `endDate`, `userId`, `classId` |
| `GET /email-audit/my-logs` | Professor | Logs of emails you sent |
