import { Injectable, Logger } from '@nestjs/common';
import { ClassMaterialService } from 'src/common/database/class-material.service';
import { ClassService as DatabaseClassService } from 'src/common/database/class.service';
import { DocumentService as DatabaseDocumentService } from 'src/common/database/document.service';
import { EnrollmentService } from 'src/common/database/enrollment.service';
import { UserService } from 'src/common/database/user.service';
import { DocumentService } from 'src/document/document.service';
import { ClassService } from '../class.service';
import { MaterialStatus, MaterialType } from './dto/material-enum';
import { ClassMaterial } from '@prisma/client';
import { StorageService } from 'src/common/storage/storage.service';

@Injectable()
export class MaterialService {
  private readonly logger = new Logger(ClassService.name);
  constructor(
    private databaseClassService: DatabaseClassService,
    private databaseDocumentService: DatabaseDocumentService,
    private userService: UserService,
    private enrollmentService: EnrollmentService,
    private classMaterialService: ClassMaterialService,
    private documentService: DocumentService,
    private storageService: StorageService,
  ) {}

  async add(classId: string, materialType: MaterialType, availableDate: Date) {
    const newMaterial = await this.classMaterialService.createClassMaterial({
      classId,
      materialType,
      status: MaterialStatus.WAITING,
      materialContent: '',
      materialMetadata: '',
      availableDate,
    });

    return {
      classMaterialId: newMaterial.id,
    };
  }

  async edit(
    materialId: string,
    materialType?: MaterialType,
    availableDate?: Date,
  ) {
    const updatedMaterial = await this.classMaterialService.updateClassMaterial(
      {
        where: {
          id: materialId,
        },
        data: {
          materialType,
          availableDate,
        },
      },
    );

    return {
      materialId: updatedMaterial.id,
    };
  }

  async delete(materialId: string) {
    await this.classMaterialService.updateClassMaterial({
      where: {
        id: materialId,
      },
      data: {
        status: MaterialStatus.UNAVAILABLE,
      },
    });
  }

  async isMaterialAvailable(material: ClassMaterial): Promise<boolean> {
    const now = new Date();
    const availableDate = new Date(material.availableDate);
    return now >= availableDate;
  }

  async list(classId?: string) {
    const materials = await this.classMaterialService.classMaterials(
      classId
        ? {
            where: {
              classId,
              status: {
                not: MaterialStatus.UNAVAILABLE,
              },
            },
            orderBy: {
              uploadedDate: 'asc',
            },
          }
        : {},
    );

    // Time gate the materials (using a promise)
    const availability = await Promise.all(
      materials.map((m) => this.isMaterialAvailable(m)),
    );
    const availableMaterials = materials.filter((_, i) => availability[i]);

    if (availableMaterials.length === 0) {
      return {
        materials: [],
      };
    }

    return {
      materials: availableMaterials.map((m) => ({
        id: m.id,
        materialType: m.materialType,
        availableDate: m.availableDate,
      })),
    };
  }

  // TO DOUBLE CHECK: Are documentId = materialId?
  // Whole Class
  async listDocuments(classId: string) {
    const { materials } = await this.list(classId);
    // If no materials are available, return an empty array
    if (!materials.length) {
      return [];
    }
    const materialIds = materials.map((m) => m.id);
    const allDocuments = await this.documentService.retrieveAllDocuments();
    const documentIds = allDocuments.filter(
      (doc) => doc.classMaterialId && materialIds.includes(doc.classMaterialId),
    );

    return documentIds;
  }

  // Single Material
  async listDocumentsByMaterialId(materialID: string) {
    const material = await this.classMaterialService.classMaterial({
      id: materialID,
    });

    if (!material) {
      this.logger.warn(`No material found for classMaterialId: ${materialID}`);
      return {
        documents: [],
      };
    }

    const isAvailable = await this.isMaterialAvailable(material);

    if (!isAvailable) {
      this.logger.warn(
        `Material is not available for classMaterialId: ${material.id}`,
      );
      return {
        documents: [],
      };
    }

    // const allDocuments = await this.documentService.retrieveAllDocuments();
    // const documents = allDocuments.filter(
    //   (doc) => doc.classMaterialId && doc.classMaterialId === material.id,
    // );
    const documents = await this.databaseDocumentService.documents({
      where: { classMaterialId: material.id },
      orderBy: { uploadedDate: 'desc' },
    });

    if (!documents || documents.length === 0) {
      this.logger.warn(
        `No documents found for classMaterialId: ${material.id}`,
      );
      return { documents: [] };
    }

    // Convert fileUrls to signed URLs and include flags
    const signedDocuments = await Promise.all(
      documents.map(async (doc) => {
        const signedUrl = await this.storageService.generateSignedUrl(
          doc.fileUrl,
        );
        return {
          id: doc.id,
          fileName: doc.fileName,
          file: signedUrl,
          updatedDate: doc.uploadedDate,
          isStudent: doc.isStudent,
          isLlm: doc.isLlm,
        };
      }),
    );

    return { documents: signedDocuments };
  }
}
