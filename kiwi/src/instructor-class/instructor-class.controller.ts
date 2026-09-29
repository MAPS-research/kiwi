import {
  Controller,
  Post,
  Put,
  Get,
  Param,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard, AdminGuard } from 'src/auth/auth.guard';
import { InstructorClassService } from './instructor-class.service';
import {
  AssignInstructorToClassDto,
  AssignInstructorToClassResponse,
  UpdateInstructorPermissionsDto,
  UpdateInstructorPermissionsResponse,
  ListInstructorsForClassResponse,
  MyInstructorPermissionsResponse,
} from './dto/instructor-class-assign.dto';
import { InstructorClassListResponse } from './dto/instructor-class-list.dto';

@Controller('instructor-class')
export class InstructorClassController {
  constructor(
    private readonly instructorClassService: InstructorClassService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('assign')
  @ApiBody({ type: AssignInstructorToClassDto })
  @ApiResponse({
    status: 200,
    description: 'Instructor assigned to class successfully',
    type: AssignInstructorToClassResponse,
  })
  async assignInstructorToClass(@Body() dto: AssignInstructorToClassDto) {
    const instructorClass =
      await this.instructorClassService.assignInstructorToClass(
        dto.classId,
        dto.userEmail,
        dto.permissions,
        dto.role || 'instructor',
      );

    return {
      message: 'Instructor assigned to class successfully',
      instructorClassId: instructorClass.id,
    };
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @Put('permissions')
  @ApiBody({ type: UpdateInstructorPermissionsDto })
  @ApiResponse({
    status: 200,
    description: 'Instructor permissions updated successfully',
    type: UpdateInstructorPermissionsResponse,
  })
  async updateInstructorPermissions(
    @Body() dto: UpdateInstructorPermissionsDto,
  ) {
    const updated =
      await this.instructorClassService.updateInstructorClassPermissions(
        dto.classId,
        dto.userEmail,
        dto.permissions,
      );

    return {
      message: 'Instructor permissions updated successfully',
      instructorClassId: updated.id,
    };
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('class/:classId/instructors')
  @ApiResponse({
    status: 200,
    description: 'Instructors assigned to the class',
    type: ListInstructorsForClassResponse,
  })
  async listInstructorsForClass(@Param('classId') classId: string) {
    const instructors =
      await this.instructorClassService.getInstructorsForClass(classId);
    return { instructors };
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('me/permissions/:classId')
  @ApiResponse({
    status: 200,
    description: "Current user's instructor permissions for a given class",
    type: MyInstructorPermissionsResponse,
  })
  async getMyInstructorPermissions(
    @Request() req: any,
    @Param('classId') classId: string,
  ) {
    const permissions =
      await this.instructorClassService.getInstructorPermissionsForClass(
        req.user.sub,
        classId,
      );
    if (!permissions) {
      return { isAssigned: false };
    }
    return { isAssigned: true, permissions };
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('classes')
  @ApiResponse({
    status: 200,
    description: 'Classes assigned to instructor',
    type: InstructorClassListResponse,
  })
  async getInstructorClasses(@Request() req: any) {
    const classes = await this.instructorClassService.getClassesForInstructor(
      req.user.sub,
    );

    return { classes };
  }
}
