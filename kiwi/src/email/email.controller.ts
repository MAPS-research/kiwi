import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Session,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard, JwtAuthGuard, ProfGuard } from 'src/auth/auth.guard';
import { EmailService } from './email.service';
import {
  SendEmailDto,
  SendEmailToClassDto,
  SendEmailResponse,
} from './dto/send-email.dto';
import {
  SendTemplatedEmailDto,
  SendClassAnnouncementDto,
} from './dto/send-templated-email.dto';
import {
  AllUsersEmailResponse,
  ClassEmailRecipients,
  EmailRecipient,
  ProfessorClassesResponse,
} from './dto/email-recipients.dto';
import { UserService } from 'src/common/database/user.service';
import { ClassService as DatabaseClassService } from 'src/common/database/class.service';
import { EnrollmentService } from 'src/common/database/enrollment.service';
import { ClassMetadata } from 'src/class/interfaces/class-metadata.interface';

@ApiTags('email')
@Controller('email')
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly userService: UserService,
    private readonly databaseClassService: DatabaseClassService,
    private readonly enrollmentService: EnrollmentService,
  ) {}

  // Admin endpoints
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('send-to-users')
  @ApiOperation({ summary: 'Send email to specific users (Admin only)' })
  @ApiBody({ type: SendEmailDto })
  @ApiResponse({
    status: 200,
    description: 'Email sent successfully',
    type: SendEmailResponse,
  })
  async sendToUsers(
    @Body() sendEmailDto: SendEmailDto,
  ): Promise<SendEmailResponse> {
    if (!sendEmailDto.text && !sendEmailDto.html) {
      throw new BadRequestException(
        'Either text or html content must be provided',
      );
    }

    await this.emailService.sendEmail(
      {
        to: sendEmailDto.recipients,
        subject: sendEmailDto.subject,
        text: sendEmailDto.text,
        html: sendEmailDto.html,
      },
      {
        emailType: 'direct',
      },
    );

    return {
      message: `Email sent successfully to ${sendEmailDto.recipients.length} recipients`,
      recipientCount: sendEmailDto.recipients.length,
    };
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('send-to-class')
  @ApiOperation({
    summary: 'Send email to all students in a class (Admin only)',
  })
  @ApiBody({ type: SendEmailToClassDto })
  @ApiResponse({
    status: 200,
    description: 'Email sent successfully',
    type: SendEmailResponse,
  })
  async sendToClass(
    @Body() sendEmailToClassDto: SendEmailToClassDto,
  ): Promise<SendEmailResponse> {
    if (!sendEmailToClassDto.text && !sendEmailToClassDto.html) {
      throw new BadRequestException(
        'Either text or html content must be provided',
      );
    }

    const studentEmails = await this.emailService.getClassStudentEmails(
      sendEmailToClassDto.classId,
    );

    if (studentEmails.length === 0) {
      throw new BadRequestException('No students found in this class');
    }

    await this.emailService.sendEmail(
      {
        to: studentEmails,
        subject: sendEmailToClassDto.subject,
        text: sendEmailToClassDto.text,
        html: sendEmailToClassDto.html,
      },
      {
        classId: sendEmailToClassDto.classId,
        emailType: 'direct',
      },
    );

    return {
      message: `Email sent successfully to ${studentEmails.length} students`,
      recipientCount: studentEmails.length,
    };
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('recipients/all-users')
  @ApiOperation({ summary: 'Get all user emails (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'List of all users',
    type: AllUsersEmailResponse,
  })
  async getAllUsers(): Promise<AllUsersEmailResponse> {
    const users = await this.userService.users({});

    const emailRecipients: EmailRecipient[] = users.map((user) => ({
      userId: user.id,
      email: user.email,
      role: user.systemRole,
    }));

    return {
      users: emailRecipients,
      totalUsers: emailRecipients.length,
    };
  }

  // Professor endpoints
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, ProfGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('send-to-my-class')
  @ApiOperation({ summary: "Send email to students in professor's class" })
  @ApiBody({ type: SendEmailToClassDto })
  @ApiResponse({
    status: 200,
    description: 'Email sent successfully',
    type: SendEmailResponse,
  })
  async sendToMyClass(
    @Session() session: Record<string, any>,
    @Body() sendEmailToClassDto: SendEmailToClassDto,
  ): Promise<SendEmailResponse> {
    if (!sendEmailToClassDto.text && !sendEmailToClassDto.html) {
      throw new BadRequestException(
        'Either text or html content must be provided',
      );
    }

    const professorId = session.userId;
    if (!professorId) {
      throw new BadRequestException('User ID not found in session');
    }

    // Validate professor has access to this class
    const hasAccess = await this.emailService.validateProfessorAccess(
      professorId,
      sendEmailToClassDto.classId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this class');
    }

    const studentEmails = await this.emailService.getClassStudentEmails(
      sendEmailToClassDto.classId,
    );

    if (studentEmails.length === 0) {
      throw new BadRequestException('No students found in this class');
    }

    await this.emailService.sendEmail(
      {
        to: studentEmails,
        subject: sendEmailToClassDto.subject,
        text: sendEmailToClassDto.text,
        html: sendEmailToClassDto.html,
      },
      {
        userId: professorId,
        classId: sendEmailToClassDto.classId,
        emailType: 'direct',
      },
    );

    return {
      message: `Email sent successfully to ${studentEmails.length} students`,
      recipientCount: studentEmails.length,
    };
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, ProfGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('recipients/my-classes')
  @ApiOperation({ summary: "Get email lists for professor's classes" })
  @ApiResponse({
    status: 200,
    description: "List of professor's classes with student emails",
    type: ProfessorClassesResponse,
  })
  async getMyClassesRecipients(
    @Session() session: Record<string, any>,
  ): Promise<ProfessorClassesResponse> {
    const professorId = session.userId;
    if (!professorId) {
      throw new BadRequestException('User ID not found in session');
    }

    const classIds = await this.emailService.getProfessorClasses(professorId);

    const classesWithRecipients: ClassEmailRecipients[] = await Promise.all(
      classIds.map(async (classId) => {
        const classData = await this.databaseClassService.class({
          id: classId,
        });
        const enrollments = await this.enrollmentService.enrollments({
          where: {
            classId,
            role: 'student',
          },
        });

        const recipients: EmailRecipient[] = await Promise.all(
          enrollments.map(async (enrollment) => {
            const user = await this.userService.user({ id: enrollment.userId });
            return {
              userId: enrollment.userId,
              email: user?.email || '',
              role: enrollment.role,
            };
          }),
        );

        const metadata = classData?.classMetadata as ClassMetadata;
        const className =
          typeof metadata?.name === 'string' ? metadata.name : 'Unknown Class';

        return {
          classId,
          className,
          recipients: recipients.filter((r) => r.email),
          totalRecipients: recipients.filter((r) => r.email).length,
        };
      }),
    );

    return {
      classes: classesWithRecipients,
      totalClasses: classesWithRecipients.length,
    };
  }

  // Template-based email endpoint
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, ProfGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('send-announcement')
  @ApiOperation({ summary: 'Send a formatted announcement email to class' })
  @ApiBody({ type: SendClassAnnouncementDto })
  @ApiResponse({
    status: 200,
    description: 'Email sent successfully',
    type: SendEmailResponse,
  })
  async sendClassAnnouncement(
    @Session() session: Record<string, any>,
    @Body() dto: SendClassAnnouncementDto,
  ): Promise<SendEmailResponse> {
    const professorId = session.userId;
    if (!professorId) {
      throw new BadRequestException('User ID not found in session');
    }

    // Validate professor has access to this class
    const hasAccess = await this.emailService.validateProfessorAccess(
      professorId,
      dto.classId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this class');
    }

    // Get class details if not provided in DTO
    const classData = await this.databaseClassService.class({
      id: dto.classId,
    });
    const metadata = classData?.classMetadata as ClassMetadata;
    const className =
      dto.data.className ||
      (typeof metadata?.name === 'string' ? metadata.name : 'Your Class');

    // Get professor details if not provided
    const professor = await this.userService.user({ id: professorId });
    const professorName =
      dto.data.professorName ||
      professor?.email?.split('@')[0] ||
      'Your Professor';

    // Get student emails
    const studentEmails = await this.emailService.getClassStudentEmails(
      dto.classId,
    );

    if (studentEmails.length === 0) {
      throw new BadRequestException('No students found in this class');
    }

    // Send templated email with properly structured data
    if (dto.subjectOverride) {
      // If subject override is provided, use sendTemplatedEmail
      await this.emailService.sendTemplatedEmail(
        studentEmails,
        'classAnnouncement',
        {
          className,
          message: dto.data.message,
          professorName,
        },
        dto.subjectOverride,
        {
          userId: professorId,
          classId: dto.classId,
        },
      );
    } else {
      // Otherwise use the standard sendClassAnnouncementEmail
      await this.emailService.sendClassAnnouncementEmail(
        studentEmails,
        className,
        dto.data.message,
        professorName,
        {
          userId: professorId,
          classId: dto.classId,
        },
      );
    }

    return {
      message: `Announcement email sent successfully to ${studentEmails.length} students`,
      recipientCount: studentEmails.length,
    };
  }

  // Admin templated email endpoint
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('send-templated')
  @ApiOperation({
    summary: 'Send templated email to specified recipients (Admin only)',
  })
  @ApiBody({ type: SendTemplatedEmailDto })
  @ApiResponse({
    status: 200,
    description: 'Email sent successfully',
    type: SendEmailResponse,
  })
  async sendTemplatedEmail(
    @Body() dto: SendTemplatedEmailDto,
  ): Promise<SendEmailResponse> {
    // Validate template type and send email
    const validTemplates = [
      'classAnnouncement',
      'adminNotification',
      'welcome',
    ];
    if (!validTemplates.includes(dto.template)) {
      throw new BadRequestException(`Invalid template: ${dto.template}`);
    }

    await this.emailService.sendTemplatedEmail(
      dto.recipients,
      dto.template as 'classAnnouncement' | 'adminNotification' | 'welcome',
      dto.templateData,
      dto.subjectOverride,
    );

    return {
      message: `Templated email (${dto.template}) sent successfully to ${dto.recipients.length} recipients`,
      recipientCount: dto.recipients.length,
    };
  }
}
