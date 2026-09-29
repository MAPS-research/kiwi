import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from 'src/common/database/database.service';

/**
 * Who may see or manage a class's materials.
 *
 * The rules already existed, correctly, inside DocumentService's annotation
 * methods — resolve the document's class first, then check permissions *for
 * that class*. MaterialManageGuard did something different: it asked whether
 * the user could manage materials in ANY class, which let an instructor of one
 * class edit another's. Lifting the working version here makes it the single
 * implementation both use.
 */
@Injectable()
export class MaterialPermissionService {
  private readonly logger = new Logger(MaterialPermissionService.name);

  constructor(private readonly db: DatabaseService) {}

  /** Can this user manage materials in this specific class? */
  async canManageClass(userId: string, classId: string): Promise<boolean> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { systemRole: true },
    });
    if (!user) return false;

    if (user.systemRole === 'admin') return true;

    // A professor enrolment in *this* class. The old guard accepted a
    // professor enrolment in any class at all.
    const professor = await this.db.enrollment.findFirst({
      where: { classId, userId, role: 'professor' },
      select: { userId: true },
    });
    if (professor) return true;

    const instructor = await this.db.instructorClass.findFirst({
      where: { userId, classId, isActive: true },
      select: { permissions: true },
    });
    if (!instructor) return false;

    const permissions = (instructor.permissions ?? {}) as Record<
      string,
      unknown
    >;
    return permissions['canManageMaterials'] === true;
  }

  /** Is this user enrolled in this class at all? */
  async isEnrolled(userId: string, classId: string): Promise<boolean> {
    const enrollment = await this.db.enrollment.findFirst({
      where: { classId, userId },
      select: { userId: true },
    });
    return Boolean(enrollment);
  }

  /** The class a material belongs to, or null. */
  async classIdForMaterial(materialId: string): Promise<string | null> {
    const material = await this.db.classMaterial.findUnique({
      where: { id: materialId },
      select: { classId: true },
    });
    return material?.classId ?? null;
  }

  /** The class a document belongs to, or null when it is unattached. */
  async classIdForDocument(documentId: string): Promise<string | null> {
    const document = await this.db.document.findUnique({
      where: { id: documentId },
      select: { classMaterial: { select: { classId: true } } },
    });
    return document?.classMaterial?.classId ?? null;
  }

  /**
   * May this user open this document's file and text?
   *
   * Staff read anything in their class. Everyone else gets the student copy of
   * a released material and nothing else — not the answer key, not reference
   * material, and not a document whose material is archived or still scheduled.
   * This is the check that closes the hole where any authenticated user could
   * exchange a document id for a signed URL and the extracted chunk text.
   */
  async canReadDocument(userId: string, documentId: string): Promise<boolean> {
    const document = await this.db.document.findUnique({
      where: { id: documentId },
      select: {
        role: true,
        classMaterial: {
          select: {
            classId: true,
            availableDate: true,
            lifecycle: true,
            status: true,
          },
        },
      },
    });

    if (!document) return false;

    // An unattached document belongs to no class, so no class membership can
    // authorise it. Staff reach it through the admin surfaces instead.
    const material = document.classMaterial;
    if (!material) {
      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: { systemRole: true },
      });
      return user?.systemRole === 'admin';
    }

    if (await this.canManageClass(userId, material.classId)) return true;

    if (document.role !== 'STUDENT') return false;
    if (material.lifecycle === 'ARCHIVED') return false;
    if (material.status === 'unavailable') return false;
    if (new Date(material.availableDate) > new Date()) return false;

    return this.isEnrolled(userId, material.classId);
  }
}
