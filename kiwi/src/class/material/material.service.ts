import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
import { MaterialAccessService } from './material-access.service';

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
    private materialAccessService: MaterialAccessService,
  ) {}

  async add(
    classId: string,
    materialType: MaterialType,
    availableDate: Date,
    title?: string,
  ) {
    const newMaterial = await this.classMaterialService.createClassMaterial({
      classId,
      materialType,
      status: MaterialStatus.WAITING,
      materialContent: '',
      materialMetadata: '',
      availableDate,
      title: title?.trim() || null,
    });

    return {
      classMaterialId: newMaterial.id,
    };
  }

  async edit(
    materialId: string,
    materialType?: MaterialType,
    availableDate?: Date,
    title?: string,
  ) {
    const updatedMaterial = await this.classMaterialService.updateClassMaterial(
      {
        where: {
          id: materialId,
        },
        data: {
          materialType,
          availableDate,
          ...(title === undefined ? {} : { title: title.trim() || null }),
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
        // `status` stays written until the legacy column goes; `lifecycle` is
        // what reads look at.
        status: MaterialStatus.UNAVAILABLE,
        lifecycle: 'ARCHIVED',
      },
    });
  }

  /**
   * Everything staff need to manage a class's materials, including ones dated
   * in the future.
   *
   * `list()` time-gates on availableDate for everyone, so scheduling a material
   * ahead made it vanish from the instructor's own management page — they could
   * not add the answer key afterwards without moving the date back. Staff reads
   * are a different question from student reads, and this is the staff one.
   */
  async listForStaff(classId: string) {
    const materials = await this.classMaterialService.classMaterials({
      where: { classId, lifecycle: { not: 'ARCHIVED' } },
      orderBy: { availableDate: 'asc' },
    });

    const withDocuments = await Promise.all(
      materials.map(async (material) => {
        const documents = await this.databaseDocumentService.documents({
          where: { classMaterialId: material.id },
          orderBy: { uploadedDate: 'asc' },
        });

        const signed = await Promise.all(
          documents.map(async (document) => ({
            id: document.id,
            fileName: document.fileName,
            role: document.role,
            processingStatus: document.processingStatus,
            processingStage: document.processingStage,
            processingError: document.processingError,
            uploadedDate: document.uploadedDate,
            file: await this.storageService.generateSignedUrl(document.fileUrl),
          })),
        );

        return {
          id: material.id,
          materialType: material.materialType,
          title:
            material.title?.trim() ||
            signed.find((d) => d.role === 'STUDENT')?.fileName ||
            signed[0]?.fileName ||
            'Untitled material',
          availableDate: material.availableDate,
          lifecycle: material.lifecycle,
          documents: signed,
        };
      }),
    );

    return { materials: withDocuments };
  }

  /**
   * Enough to name a material and its class. Exists so a page that only needs a
   * breadcrumb does not have to pull the whole staff listing, which signs a URL
   * for every document in the class.
   */
  async summary(materialId: string) {
    const material = await this.classMaterialService.classMaterial({
      id: materialId,
    });
    if (!material) {
      throw new NotFoundException('Material not found');
    }

    const classRecord = await this.databaseClassService.class({
      id: material.classId,
    });
    const metadata = (classRecord?.classMetadata ?? {}) as {
      className?: string;
    };

    const documents = await this.databaseDocumentService.documents({
      where: { classMaterialId: material.id },
      orderBy: { uploadedDate: 'asc' },
    });

    return {
      id: material.id,
      title:
        material.title?.trim() ||
        documents.find((d) => d.role === 'STUDENT')?.fileName ||
        documents[0]?.fileName ||
        'Untitled material',
      materialType: material.materialType,
      classId: material.classId,
      // Empty rather than a placeholder: the caller decides whether an
      // unnamed class is worth a line in a breadcrumb.
      className: metadata.className?.trim() ?? '',
    };
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
              lifecycle: { not: 'ARCHIVED' },
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

  /**
   * The single document a student may open for this material, signed, or null.
   *
   * Replaces `documents.find(isStudent) ?? documents[0]` at the call sites. The
   * fallback in that expression resolved to the newest upload — which for a
   * recitation is the answer key — so any material whose flags were never set
   * handed students the answers. There is no fallback now: a material with no
   * student copy is simply not shown.
   */
  async getStudentDocumentView(materialId: string) {
    const document =
      await this.materialAccessService.getStudentDocument(materialId);
    if (!document) return null;

    return {
      id: document.id,
      fileName: document.fileName,
      file: await this.storageService.generateSignedUrl(document.fileUrl),
      updatedDate: document.uploadedDate,
      isStudent: true,
      isLlm: document.isLlm,
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
