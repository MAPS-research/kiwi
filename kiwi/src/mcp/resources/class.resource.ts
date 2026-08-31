import { Injectable, Logger, Scope } from '@nestjs/common';
import { Resource, Context, HttpRequest } from '@rekog/mcp-nest';
import { ClassService } from 'src/class/class.service';

/**
 * MCP Resources for Class Data
 * Provides read-only access to class information, materials, and documents
 */
@Injectable({ scope: Scope.REQUEST })
export class ClassResource {
  private readonly logger = new Logger(ClassResource.name);

  constructor(private readonly classService: ClassService) {}

  /**
   * List of all classes the user is enrolled in
   * Includes class metadata, professor info, and user role
   */
  @Resource({
    name: 'classes-list',
    description:
      'List of all classes the authenticated user is enrolled in with metadata',
    mimeType: 'application/json',
    uri: 'kiwi://classes',
  })
  async getClassesList(
    { uri }: { uri: string },
    context: Context,
    httpRequest: HttpRequest,
  ) {
    try {
      const userId = (httpRequest.raw as any)?.user?.sub;
      if (!userId) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'User not authenticated' }, null, 2),
            },
          ],
        };
      }

      // Get user's enrolled classes
      const enrollments =
        await this.classService.getEnrollmentsPerUser(userId);
      const classDetails = [];

      for (const enrollment of enrollments) {
        const classInfo = await this.classService.getClassById(
          enrollment.classId,
        );
        if (classInfo) {
          const metadata = classInfo.classMetadata as any;
          classDetails.push({
            id: classInfo.id,
            name: metadata?.name,
            description: metadata?.description,
            professorName: metadata?.professorName,
            metadata: classInfo.classMetadata,
            professorId: classInfo.professorId,
            createdDate: classInfo.createdDate,
            userRole: enrollment.role,
          });
        }
      }

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                totalClasses: classDetails.length,
                classes: classDetails,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error getting classes list:', error);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ error: error.message }, null, 2),
          },
        ],
      };
    }
  }

  /**
   * Documents for a specific class
   * URI pattern: kiwi://class/{classId}/documents
   */
  @Resource({
    name: 'class-documents',
    description: 'Documents and materials for a specific class',
    mimeType: 'application/json',
    uri: 'kiwi://class/{classId}/documents',
  })
  async getClassDocuments(
    { uri }: { uri: string },
    context: Context,
    httpRequest: HttpRequest,
  ) {
    try {
      const userId = (httpRequest.raw as any)?.user?.sub;
      if (!userId) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'User not authenticated' }, null, 2),
            },
          ],
        };
      }

      // Extract classId from URI
      const match = uri.match(/^kiwi:\/\/class\/([^\/]+)\/documents$/);
      if (!match) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Invalid URI format' }, null, 2),
            },
          ],
        };
      }

      const classId = match[1];

      // Verify user has access to this class
      const enrollments =
        await this.classService.getEnrollmentsPerUser(userId);
      const hasAccess = enrollments.some(
        (enrollment) => enrollment.classId === classId,
      );

      if (!hasAccess) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                { error: 'Access denied to class documents' },
                null,
                2,
              ),
            },
          ],
        };
      }

      const documentsResult =
        await this.classService.getDocumentByClassId(classId);

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                classId,
                totalDocuments: documentsResult.documents.length,
                documents: documentsResult.documents.map((doc: any) => ({
                  id: doc.id,
                  fileName: doc.fileName,
                  fileUrl: doc.file, // Signed URL
                  isStudent: doc.isStudent,
                  isLlm: doc.isLlm,
                  materialType: doc.materialType,
                })),
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error getting class documents:', error);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ error: error.message }, null, 2),
          },
        ],
      };
    }
  }

  /**
   * All materials for a specific class (comprehensive view)
   * URI pattern: kiwi://class/{classId}/materials
   */
  @Resource({
    name: 'class-materials',
    description:
      'Comprehensive view of all materials for a class including documents and metadata',
    mimeType: 'application/json',
    uri: 'kiwi://class/{classId}/materials',
  })
  async getClassMaterials(
    { uri }: { uri: string },
    context: Context,
    httpRequest: HttpRequest,
  ) {
    try {
      const userId = (httpRequest.raw as any)?.user?.sub;
      if (!userId) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'User not authenticated' }, null, 2),
            },
          ],
        };
      }

      // Extract classId from URI
      const match = uri.match(/^kiwi:\/\/class\/([^\/]+)\/materials$/);
      if (!match) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Invalid URI format' }, null, 2),
            },
          ],
        };
      }

      const classId = match[1];

      // Verify user has access to this class
      const enrollments =
        await this.classService.getEnrollmentsPerUser(userId);
      const hasAccess = enrollments.some(
        (enrollment) => enrollment.classId === classId,
      );

      if (!hasAccess) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                { error: 'Access denied to class materials' },
                null,
                2,
              ),
            },
          ],
        };
      }

      // Get class info and documents
      const classInfo = await this.classService.getClassById(classId);
      const documentsResult =
        await this.classService.getDocumentByClassId(classId);

      const metadata = classInfo?.classMetadata as any;

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                classId,
                className: metadata?.name,
                description: metadata?.description,
                professorName: metadata?.professorName,
                materials: {
                  documents: documentsResult.documents.map((doc: any) => ({
                    id: doc.id,
                    fileName: doc.fileName,
                    fileUrl: doc.file,
                    isStudent: doc.isStudent,
                    isLlm: doc.isLlm,
                    materialType: doc.materialType,
                  })),
                  totalCount: documentsResult.documents.length,
                },
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error getting class materials:', error);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ error: error.message }, null, 2),
          },
        ],
      };
    }
  }
}
