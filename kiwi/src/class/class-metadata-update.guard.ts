import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from 'src/common/database/user.service';
import { EnrollmentService } from 'src/common/database/enrollment.service';
import { InstructorClassService } from '../instructor-class/instructor-class.service';

@Injectable()
export class ClassMetadataUpdateGuard implements CanActivate {
  private readonly logger = new Logger(ClassMetadataUpdateGuard.name);
  constructor(
    private userService: UserService,
    private enrollmentService: EnrollmentService,
    private instructorClassService: InstructorClassService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.NO_AUTH === 'true') {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.session.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const user = await this.userService.user({
      id: userId,
    });
    if (!user) {
      throw new UnauthorizedException();
    }

    // Admin can always update metadata
    if (user.systemRole === 'admin') {
      return true;
    }

    // Check if user is a professor via enrollment (existing ProfGuard logic)
    const enrollments = await this.enrollmentService.enrollments({
      where: {
        userId: userId,
      },
    });

    const isProf = enrollments.some(
      (enrollment) => enrollment.role === 'professor',
    );

    // If user is a professor, check if they're associated with the specific class
    if (isProf && enrollments.length > 0) {
      // Extract classId from request body
      const classId = request.body?.classId;
      
      if (classId) {
        // Check if professor is enrolled in this specific class
        const isProfForThisClass = enrollments.some(
          (enrollment) => 
            enrollment.role === 'professor' && 
            enrollment.classId === classId
        );
        
        if (isProfForThisClass) {
          return true;
        }
      }
    }

    // Check if user is an instructor with canUpdateMetadata or canManageMaterials permission
    const classId = request.body?.classId;
    
    if (classId) {
      // Check for canUpdateMetadata permission first, fallback to canManageMaterials
      const hasUpdatePermission = await this.instructorClassService.checkInstructorPermission(
        userId,
        classId,
        'canUpdateMetadata' as any,
      );
      
      if (hasUpdatePermission) {
        return true;
      }
      
      // Fallback to canManageMaterials permission for backward compatibility
      const hasManagePermission = await this.instructorClassService.checkInstructorPermission(
        userId,
        classId,
        'canManageMaterials',
      );
      
      if (hasManagePermission) {
        return true;
      }
    }

    throw new UnauthorizedException('User does not have permission to update class metadata');
  }
}