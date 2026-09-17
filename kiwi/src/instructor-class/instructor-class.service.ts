import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from 'src/common/database/database.service';
import { UserService } from 'src/common/database/user.service';

@Injectable()
export class InstructorClassService {
  private readonly logger = new Logger(InstructorClassService.name);

  constructor(
    private database: DatabaseService,
    private userService: UserService,
  ) {}

  async assignInstructorToClass(
    classId: string,
    userEmail: string,
    permissions: { canManageMaterials: boolean; canViewAnalytics: boolean },
    role: string = 'instructor',
  ) {
    // Find user by email
    const user = await this.userService.user({ email: userEmail });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if user has instructor system role
    if (user.systemRole !== 'instructor') {
      throw new BadRequestException('User must have instructor system role');
    }

    // Check if class exists
    const classExists = await this.database.class.findUnique({
      where: { id: classId },
    });
    if (!classExists) {
      throw new BadRequestException('Class not found');
    }

    // Check if instructor is already assigned to this class
    const existingAssignment = await this.database.instructorClass.findUnique({
      where: { userId_classId: { userId: user.id, classId } },
    });
    if (existingAssignment) {
      throw new BadRequestException('Instructor already assigned to this class');
    }

    // Create the instructor-class relationship
    const instructorClass = await this.database.instructorClass.create({
      data: {
        userId: user.id,
        classId,
        role,
        permissions,
        isActive: true,
      },
    });

    this.logger.log(`Assigned instructor ${userEmail} to class ${classId}`);
    return instructorClass;
  }

  async updateInstructorClassPermissions(
    classId: string,
    userEmail: string,
    permissions: { canManageMaterials: boolean; canViewAnalytics: boolean },
  ) {
    const user = await this.userService.user({ email: userEmail });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const existing = await this.database.instructorClass.findUnique({
      where: { userId_classId: { userId: user.id, classId } },
    });
    if (!existing) {
      throw new BadRequestException(
        'Instructor is not assigned to this class',
      );
    }

    const updated = await this.database.instructorClass.update({
      where: { userId_classId: { userId: user.id, classId } },
      data: { permissions },
    });

    this.logger.log(
      `Updated permissions for instructor ${userEmail} on class ${classId}`,
    );
    return updated;
  }

  async getInstructorsForClass(classId: string) {
    const instructorClasses = await this.database.instructorClass.findMany({
      where: { classId, isActive: true },
      include: { user: true },
    });

    return instructorClasses.map((ic: any) => ({
      userId: ic.userId,
      email: ic.user?.email,
      role: ic.role,
      permissions: ic.permissions,
      assignedAt: ic.assignedAt,
    }));
  }

  async getClassesForInstructor(userId: string) {
    // Get all active instructor-class relationships for the user
    const instructorClasses = await this.database.instructorClass.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        class: true,
      },
    });

    // Return just the class objects
    return instructorClasses.map((ic: any) => ic.class);
  }

  async checkInstructorPermission(
    userId: string,
    classId: string,
    permission: 'canManageMaterials' | 'canViewAnalytics' | 'canUpdateMetadata',
  ): Promise<boolean> {
    const instructorClass = await this.database.instructorClass.findUnique({
      where: {
        userId_classId: { userId, classId },
        isActive: true,
      },
    });

    if (!instructorClass) {
      return false;
    }

    const permissions = instructorClass.permissions as any;
    return permissions?.[permission] === true;
  }

  async getInstructorPermissionsForClass(
    userId: string,
    classId: string,
  ): Promise<{ canManageMaterials: boolean; canViewAnalytics: boolean } | null> {
    const instructorClass = await this.database.instructorClass.findUnique({
      where: {
        userId_classId: { userId, classId },
        isActive: true,
      },
    });

    if (!instructorClass) {
      return null;
    }

    const permissions = (instructorClass.permissions as any) ?? {};
    return {
      canManageMaterials: permissions.canManageMaterials === true,
      canViewAnalytics: permissions.canViewAnalytics === true,
    };
  }

  /**
   * Whether a user may manage a class: a system admin, a professor enrolled in
   * *this* class, or an instructor actively assigned to *this* class.
   *
   * A professor enrollment in some other class does not count.
   */
  async canManageClass(userId: string, classId: string): Promise<boolean> {
    if (!userId || !classId) return false;

    const user = await this.database.user.findUnique({
      where: { id: userId },
      select: { systemRole: true },
    });
    if (!user) return false;
    if (user.systemRole === 'admin') return true;

    const enrollment = await this.database.enrollment.findUnique({
      where: { classId_userId: { classId, userId } },
      select: { role: true },
    });
    if (enrollment?.role === 'professor') return true;

    return this.checkInstructorHasClassAccess(userId, classId);
  }

  /**
   * Whether a user may manage a class's materials and documents: a system
   * admin, a professor enrolled in *this* class, or an instructor assigned to
   * *this* class with the `canManageMaterials` permission.
   */
  async canManageMaterials(userId: string, classId: string): Promise<boolean> {
    if (!userId || !classId) return false;

    const user = await this.database.user.findUnique({
      where: { id: userId },
      select: { systemRole: true },
    });
    if (!user) return false;
    if (user.systemRole === 'admin') return true;

    const enrollment = await this.database.enrollment.findUnique({
      where: { classId_userId: { classId, userId } },
      select: { role: true },
    });
    if (enrollment?.role === 'professor') return true;

    return this.checkInstructorPermission(userId, classId, 'canManageMaterials');
  }

  /** The class a material belongs to, or null if it doesn't exist. */
  async classIdForMaterial(materialId: string): Promise<string | null> {
    if (!materialId) return null;
    const material = await this.database.classMaterial.findUnique({
      where: { id: materialId },
      select: { classId: true },
    });
    return material?.classId ?? null;
  }

  /** The class a document belongs to (through its material), or null. */
  async classIdForDocument(documentId: string): Promise<string | null> {
    if (!documentId) return null;
    const document = await this.database.document.findUnique({
      where: { id: documentId },
      select: { classMaterial: { select: { classId: true } } },
    });
    return document?.classMaterial?.classId ?? null;
  }

  async checkInstructorHasClassAccess(
    userId: string,
    classId: string,
  ): Promise<boolean> {
    const instructorClass = await this.database.instructorClass.findUnique({
      where: {
        userId_classId: { userId, classId },
        isActive: true,
      },
    });

    return !!instructorClass;
  }
}