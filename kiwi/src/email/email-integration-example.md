# Email Templates Integration Examples

## 1. Welcome Email on User Registration

In `auth.service.ts`, after user registration:

```typescript
// In AuthService
constructor(
  // ... other dependencies
  private emailService: EmailService,
) {}

async registerUser(email: string, password: string, classId: string): Promise<any> {
  // ... existing registration code ...
  
  // Send welcome email
  try {
    const classData = await this.databaseClassService.class({ id: classId });
    const className = classData?.classMetadata?.name || 'the platform';
    
    await this.emailService.sendWelcomeEmail(
      email,
      email.split('@')[0], // Extract username from email
      className
    );
  } catch (error) {
    this.logger.error('Failed to send welcome email', error);
    // Don't fail registration if email fails
  }
  
  return { id: user.id, email: user.email };
}
```

## 2. Admin Notification for Important Updates

```typescript
// Send notification to all admins
async notifyAdmins(title: string, message: string): Promise<void> {
  const admins = await this.authService.listAdmins();
  const adminEmails = admins.map(admin => admin.email);
  
  await this.emailService.sendAdminNotificationEmail(
    adminEmails,
    title,
    message
  );
}
```

## 3. Using Templates in Other Services

```typescript
// In any service that needs to send emails
await this.emailService.sendTemplatedEmail(
  ['student@example.com'],
  'classAnnouncement',
  {
    className: 'Advanced Mathematics',
    message: 'Tomorrow\'s class has been moved to Room 301.',
    professorName: 'Dr. Johnson'
  }
);
```

## Benefits of Using Templates:

1. **Consistent Branding**: All emails have the same professional look
2. **Easy Updates**: Change email design in one place
3. **Better Formatting**: HTML emails with proper styling
4. **Reduced Errors**: No need to write HTML in controllers
5. **Reusability**: Same template for similar use cases

## Available Templates:

- `welcome`: For new user registrations
- `classAnnouncement`: For class-related announcements
- `adminNotification`: For admin alerts and system notifications

## Adding New Templates:

1. Add template to `email.templates.ts`
2. Create specific method in `EmailService` (optional)
3. Use `sendTemplatedEmail` method with template name