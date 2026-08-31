import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Session,
  Logger,
  Post,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiResponse,
} from '@nestjs/swagger';
import { AdminGuard, InstructorClassGuard, JwtAuthGuard, ProfGuard } from 'src/auth/auth.guard';
import {
  DocumentChatResponse,
  DocumentIdsChatResponse,
} from 'src/document/dto/document-response.dto';
import { ClassService } from './class.service';
import { ClassAddRequest, ClassAddResponse } from './dto/class-add-request.dto';
import {
  ClassEnrollRequest,
  ClassEnrollResponse,
} from './dto/class-enroll-request.dto';
import { ClassInfoResponse } from './dto/class-info-response.dto';
import { ClassCompleteInfoResponse } from './dto/class-complete-info-response.dto';
import { ClassListResponse } from './dto/class-list-response.dto';
import {
  ClassRosterRequest,
  ClassRosterResponse,
  SetSelectedClassRequest,
  SetSelectedClassResponse,
} from './dto/class-roster-request.dto';
import { ClassEnrollDeleteRequest } from './dto/class-enroll-delete.dto';
import {
  ClassUpdateMetadataRequest,
  ClassUpdateMetadataResponse,
} from './dto/class-update-metadata.dto';
import {
  ClassPendingEnrollmentRequest,
  ClassPendingEnrollmentResponse,
  ClassDeletePendingEnrollmentRequest,
} from './dto/class-pending-enrollment.dto';
import { UserService } from '../common/database/user.service';
import { StorageService } from '../common/storage/storage.service';
import { ClassMetadata } from './interfaces/class-metadata.interface';

@Controller('class')
export class ClassController {
  private readonly logger = new Logger(ClassController.name);

  constructor(
    private readonly classService: ClassService,
    private readonly userService: UserService,
    private readonly storageService: StorageService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('add')
  @ApiBody({
    type: ClassAddRequest,
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: ClassAddResponse,
  })
  async add(
    @Session() session: Record<string, any>,
    @Body() classAddRequest: ClassAddRequest,
  ) {
    const { classDetails } = classAddRequest;

    // check user is an admin
    if (!session.userId) {
      throw new Error('User ID not found in session');
    }
    // call database to check if user's systemrole is admin
    const user = await this.userService.user({
      id: session.userId,
    });
    if (!user) {
      throw new Error('User not found');
    }
    if (user.systemRole !== 'admin') {
      throw new Error('User is not an admin');
    }

    this.logger.debug(
      'Adding class with details',
      classDetails,
      'and professorId',
      session.userId,
    );

    return await this.classService.add(classDetails, session.userId);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('SetSelectedClass')
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: SetSelectedClassResponse,
  })
  async setSelectedClass(
    @Session() session: Record<string, any>,
    @Body() setSelectedClassRequest: SetSelectedClassRequest,
  ) {
    this.logger.log('setSelectedClassRequest', setSelectedClassRequest);

    // check classes
    const { classIds: classIds } = await this.classService.list();

    // Check if the classId exists in the list of classes
    const classIdExists = classIds.some(
      (classId) => classId === setSelectedClassRequest.classId,
    );
    if (!classIdExists) {
      throw new BadRequestException('Class ID does not exist');
    }

    session.classId = setSelectedClassRequest.classId;
    return {
      message: 'Class ID set successfully',
    };
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, InstructorClassGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('update-metadata')
  @ApiBody({
    type: ClassUpdateMetadataRequest,
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: ClassUpdateMetadataResponse,
  })
  async updateMetadata(@Body() request: ClassUpdateMetadataRequest) {
    const { classId, classDetails } = request;

    this.logger.debug(
      'Updating class metadata',
      classId,
      'with details',
      classDetails,
    );

    return await this.classService.updateMetadata(classId, classDetails);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, ProfGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('roster')
  @ApiBody({
    type: ClassRosterRequest,
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: ClassRosterResponse,
  })
  async roster(@Body() classRosterRequest: ClassRosterRequest) {
    return await this.classService.roster(classRosterRequest.classId);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, ProfGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('pending-enrollment')
  @ApiBody({
    type: ClassPendingEnrollmentRequest,
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: ClassPendingEnrollmentResponse,
  })
  async getPendingEnrollment(
    @Body() classPendingEnrollmentRequest: ClassPendingEnrollmentRequest,
  ) {
    return await this.classService.getPendingEnrollments(
      classPendingEnrollmentRequest.classId,
    );
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('pending-enrollment/delete')
  @ApiBody({
    type: ClassDeletePendingEnrollmentRequest,
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response',
  })
  async deletePendingUsers(
    @Body()
    classPendingEnrollDeleteRequest: ClassDeletePendingEnrollmentRequest,
  ) {
    const { classId, pendingUserIds } = classPendingEnrollDeleteRequest;

    this.logger.debug('Deleting users', pendingUserIds, 'from class', classId);

    return await this.classService.deletePendingEnrollments(
      classId,
      pendingUserIds,
    );
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('list')
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: ClassListResponse,
  })
  async list() {
    return await this.classService.list();
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('id')
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: ClassInfoResponse,
  })
  async getById(@Query('classID') classID: string) {
    const classInfo = await this.classService.getClassById(classID);
    // map classInfo to ClassInfoResponse
    // used for type guard
    type ClassMetadata = {
      className?: string;
      professorName?: string;
      professorEmail?: string;
      description?: string;
      imageSnippetUrl?: string;
    };
    const classMetadata = classInfo.classMetadata as ClassMetadata; // Cast to custom type

    if (classMetadata.imageSnippetUrl) {
      const signedUrl = await this.storageService.generateSignedUrl(
        classMetadata.imageSnippetUrl,
      );
      classMetadata.imageSnippetUrl = signedUrl;
    } else {
      classMetadata.imageSnippetUrl = undefined;
    }

    const classInfoResponse: ClassInfoResponse = {
      id: classInfo.id,
      className: classMetadata.className ?? 'Class',
      professorName: classMetadata.professorName ?? 'Professor',
      professorEmail: classMetadata.professorEmail ?? 'Email',
      createdDate: classInfo.createdDate,
      professorId: classInfo.professorId,
      description: classMetadata.description ?? 'No description yet',
      imageSnippetUrl: classMetadata.imageSnippetUrl ?? undefined,
    };
    return classInfoResponse;
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, InstructorClassGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('id/complete')
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: ClassCompleteInfoResponse,
  })
  async getByIdComplete(@Query('classID') classID: string) {
    const classInfo = (await this.classService.getClassById(classID)) as {
      id: string;
      createdDate: Date;
      professorId: string;
      classMetadata: ClassMetadata;
    };

    const classMetadata = classInfo.classMetadata as ClassMetadata;

    let imageSnippetServerUrl = '';

    if (classMetadata.imageSnippetUrl) {
      const signedUrl = await this.storageService.generateSignedUrl(
        classMetadata.imageSnippetUrl,
      );
      imageSnippetServerUrl = signedUrl;
    }

    const classInfoResponse: ClassCompleteInfoResponse = {
      classInfo,
      imageSnippetServerUrl,
    };
    return classInfoResponse;
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('enroll')
  @ApiBody({
    type: ClassEnrollRequest,
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: ClassEnrollResponse,
  })
  @ApiConflictResponse({
    description: 'Conflict.',
  })
  async enroll(@Body() classEnrollRequest: ClassEnrollRequest) {
    const { classId, studentEmails } = classEnrollRequest;

    this.logger.debug('Enrolling students', studentEmails, 'in class', classId);

    return await this.classService.enroll(classId, studentEmails);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('enroll/delete')
  @ApiBody({
    type: ClassEnrollDeleteRequest,
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response',
  })
  async delete(@Body() classEnrollDeleteRequest: ClassEnrollDeleteRequest) {
    const { classId, studentIds } = classEnrollDeleteRequest;

    this.logger.debug('Deleting students', studentIds, 'from class', classId);

    return await this.classService.deleteEnrollment(classId, studentIds);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('/document/list')
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: DocumentChatResponse,
  })
  async getDocumentList(@Query('classID') classId: string) {
    const docs = await this.classService.getDocumentByClassId(classId);
    return docs;
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('/document/list/ids')
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: DocumentIdsChatResponse,
  })
  async getDocumentListIds(@Query('classID') classId: string) {
    const docs = await this.classService.getDocumentIdsByClassId(classId);
    return docs;
  }
}
