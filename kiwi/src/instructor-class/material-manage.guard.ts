import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from 'src/common/database/user.service';
import { EnrollmentService } from 'src/common/database/enrollment.service';
import { InstructorClassService } from './instructor-class.service';

@Injectable()
export class MaterialManageGuard implements CanActivate {
  private readonly logger = new Logger(MaterialManageGuard.name);
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

    // Admin can always manage materials
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

    if (isProf && enrollments.length > 0) {
      return true;
    }

    // Check if user is an instructor with canManageMaterials permission for ANY class
    if (user.systemRole === 'instructor') {
      // Get all classes this instructor is assigned to
      const instructorClasses = await this.instructorClassService.getClassesForInstructor(userId);

      // Check if instructor has canManageMaterials permission for any class
      for (const instructorClass of instructorClasses) {
        const hasPermission = await this.instructorClassService.checkInstructorPermission(
          userId,
          instructorClass.id,
          'canManageMaterials',
        );

        if (hasPermission) {
          return true;
        }
      }
    }

    throw new ForbiddenException('User does not have permission to manage materials');
  }
}