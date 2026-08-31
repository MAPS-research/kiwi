import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { UserService } from 'src/common/database/user.service';
import { ClassService as DatabaseClassService } from 'src/common/database/class.service';
import { EnrollmentService } from 'src/common/database/enrollment.service';
import { EmailAuditLogService } from 'src/common/database/email-audit-log.service';
import { renderTemplate } from './email.templates';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
  }>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private fromEmail: string;
  private fromName: string;
  private replyToEmail: string;
  private replyToName: string;

  constructor(
    private configService: ConfigService,
    private userService: UserService,
    private databaseClassService: DatabaseClassService,
    private enrollmentService: EnrollmentService,
    private emailAuditLogService: EmailAuditLogService,
  ) {
    const emailConfig = this.configService.get('email');

    this.fromEmail = emailConfig.from.email;
    this.fromName = emailConfig.from.name;
    this.replyToEmail = emailConfig.replyTo.email;
    this.replyToName = emailConfig.replyTo.name;

    this.transporter = nodemailer.createTransport({
      host: emailConfig.smtp.host,
      port: emailConfig.smtp.port,
      secure: emailConfig.smtp.port === 465, // true for 465, false for other ports
      auth: {
        user: emailConfig.smtp.user,
        pass: emailConfig.smtp.password,
      },
    });

    // Verify transporter configuration
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('Email transporter verification failed:', error);
      } else {
        this.logger.log('Email transporter is ready to send emails');
      }
    });
  }

  async sendEmail(
    options: EmailOptions,
    auditMetadata?: {
      userId?: string;
      classId?: string;
      emailType?: string;
      templateName?: string;
    },
  ): Promise<void> {
    const emailConfig = this.configService.get('email');
    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    // Create audit log entry
    const auditLog = {
      fromEmail: this.fromEmail,
      toEmails: recipients,
      subject: options.subject,
      emailType: auditMetadata?.emailType || 'direct',
      templateName: auditMetadata?.templateName || null,
      userId: auditMetadata?.userId || null,
      classId: auditMetadata?.classId || null,
      metadata: auditMetadata || undefined,
    };

    // In test mode, just log the email instead of sending
    if (emailConfig.testMode) {
      this.logger.log('TEST MODE - Email would be sent:');
      this.logger.log(
        `To: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`,
      );
      this.logger.log(`Subject: ${options.subject}`);
      this.logger.log(`Text: ${options.text?.substring(0, 100)}...`);

      // Log as test mode in audit log
      await this.emailAuditLogService.createEmailAuditLog({
        ...auditLog,
        status: 'test_mode',
      });

      return;
    }

    try {
      const replyTo =
        options.replyTo || `"${this.replyToName}" <${this.replyToEmail}>`;

      // When sending to multiple recipients, use BCC for privacy
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      const isMultipleRecipients = recipients.length > 1;

      const mailOptions: any = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        replyTo: replyTo,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      };

      if (isMultipleRecipients) {
        // For multiple recipients, use BCC to hide email addresses
        mailOptions.to = `"${this.fromName}" <${this.fromEmail}>`;
        mailOptions.bcc = recipients.join(', ');
      } else {
        // For single recipient, use normal to field
        mailOptions.to = recipients[0];
      }

      const info = await this.transporter.sendMail(mailOptions);

      this.logger.log(`Email sent successfully: ${info.messageId}`);

      // Log successful send in audit log
      await this.emailAuditLogService.createEmailAuditLog({
        ...auditLog,
        status: 'sent',
        messageId: info.messageId,
      });
    } catch (error) {
      this.logger.error('Failed to send email:', error);

      // Log failed send in audit log
      await this.emailAuditLogService.createEmailAuditLog({
        ...auditLog,
        status: 'failed',
        errorMessage: error.message || 'Unknown error',
      });

      throw error;
    }
  }

  async getUserEmails(userIds: string[]): Promise<string[]> {
    const users = await Promise.all(
      userIds.map((id) => this.userService.user({ id })),
    );
    return users
      .filter((user) => user !== null && user.email)
      .map((user) => user!.email);
  }

  async getClassStudentEmails(classId: string): Promise<string[]> {
    const enrollments = await this.enrollmentService.enrollments({
      where: {
        classId,
        role: 'student',
      },
    });

    const userIds = enrollments.map((e) => e.userId);
    return this.getUserEmails(userIds);
  }

  async getClassProfessorEmail(classId: string): Promise<string | null> {
    const classData = await this.databaseClassService.class({
      id: classId,
    });

    if (!classData) {
      return null;
    }

    const professor = await this.userService.user({
      id: classData.professorId,
    });

    return professor?.email || null;
  }

  async getAllUserEmails(): Promise<string[]> {
    const users = await this.userService.users({});
    return users.map((user) => user.email);
  }

  async getProfessorClasses(professorId: string): Promise<string[]> {
    const enrollments = await this.enrollmentService.enrollments({
      where: {
        userId: professorId,
        role: 'professor',
      },
    });

    return enrollments.map((e) => e.classId);
  }

  async validateProfessorAccess(
    professorId: string,
    classId: string,
  ): Promise<boolean> {
    const professorClasses = await this.getProfessorClasses(professorId);
    return professorClasses.includes(classId);
  }

  async sendTemplatedEmail(
    to: string | string[],
    templateName: keyof typeof import('./email.templates').emailTemplates,
    templateData: any,
    subjectOverride?: string,
    auditMetadata?: {
      userId?: string;
      classId?: string;
    },
  ): Promise<void> {
    const { subject, html, text } = renderTemplate(templateName, templateData);

    await this.sendEmail(
      {
        to,
        subject: subjectOverride || subject,
        html,
        text,
      },
      {
        ...auditMetadata,
        emailType: 'template',
        templateName,
      },
    );
  }

  async sendWelcomeEmail(
    userEmail: string,
    userName: string,
    className?: string,
    userId?: string,
  ): Promise<void> {
    const frontendUrls =
      this.configService.get('FRONTEND_URL')?.split(',') || [];
    const frontendUrl = frontendUrls[0] || 'http://localhost:3001/';

    await this.sendTemplatedEmail(
      userEmail,
      'welcome',
      {
        userName,
        className,
        frontendUrl,
        institutionName: this.configService.get('INSTITUTION_NAME'),
        supportEmail: this.configService.get('SUPPORT_EMAIL'),
        guideUrl: this.configService.get('ONBOARDING_GUIDE_URL'),
      },
      undefined,
      { userId },
    );
  }

  async sendClassAnnouncementEmail(
    recipients: string[],
    className: string,
    message: string,
    professorName?: string,
    auditMetadata?: {
      userId?: string;
      classId?: string;
    },
  ): Promise<void> {
    await this.sendTemplatedEmail(
      recipients,
      'classAnnouncement',
      {
        className,
        message,
        professorName,
      },
      undefined,
      auditMetadata,
    );
  }

  async sendAdminNotificationEmail(
    recipients: string[],
    title: string,
    message: string,
    userId?: string,
  ): Promise<void> {
    await this.sendTemplatedEmail(
      recipients,
      'adminNotification',
      {
        title,
        message,
      },
      undefined,
      { userId },
    );
  }
}
