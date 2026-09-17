import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InstructorClassService } from './instructor-class.service';
import { resolveRequestClassId } from 'src/auth/auth.guard';

const firstString = (...values: unknown[]): string | undefined =>
  values.find((v): v is string => typeof v === 'string' && v.length > 0);

/**
 * Allows managing materials and documents of ONE class: the class named by the
 * request, or the class that owns the material or document it names.
 *
 * Admins always pass; otherwise the user must be a professor enrolled in that
 * class or an instructor assigned to it with `canManageMaterials`. A request
 * that doesn't identify a class, material or document is refused.
 *
 * Multipart bodies are not parsed yet when guards run, so upload routes check
 * the material in the handler instead.
 */
@Injectable()
export class MaterialManageGuard implements CanActivate {
  constructor(private instructorClassService: InstructorClassService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.NO_AUTH === 'true') {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.session?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const classId = await this.resolveClassId(request);
    if (!(await this.instructorClassService.canManageMaterials(userId, classId))) {
      throw new ForbiddenException(
        'User does not have permission to manage materials in this class',
      );
    }
    return true;
  }

  private async resolveClassId(request: any): Promise<string> {
    const direct = resolveRequestClassId(request);
    if (direct) return direct;

    const materialId = firstString(
      request.params?.materialId,
      request.body?.materialId,
      request.query?.materialID,
      request.query?.materialId,
    );
    if (materialId) {
      const classId = await this.instructorClassService.classIdForMaterial(materialId);
      if (!classId) throw new NotFoundException('Material not found');
      return classId;
    }

    const documentId = firstString(
      request.params?.documentId,
      request.params?.id,
      request.body?.documentId,
      request.body?.id,
    );
    if (documentId) {
      const classId = await this.instructorClassService.classIdForDocument(documentId);
      if (!classId) throw new NotFoundException('Document not found');
      return classId;
    }

    throw new ForbiddenException('Request does not identify a class');
  }
}
