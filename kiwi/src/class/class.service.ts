import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ClassService as DatabaseClassService } from 'src/common/database/class.service';
import { EnrollmentService } from 'src/common/database/enrollment.service';
import { UserService } from 'src/common/database/user.service';
import { MaterialService } from './material/material.service';
import { DocumentService } from 'src/document/document.service';
import { EngineChoice } from 'src/common/llm/interfaces/engine-config';
import { PendingEnrollmentService } from 'src/common/database/pending-enrollment.service';
import { ClassMetadata } from './interfaces/class-metadata.interface';

@Injectable()
export class ClassService {
  private readonly logger = new Logger(ClassService.name);
  constructor(
    private databaseClassService: DatabaseClassService,
    private userService: UserService,
    private enrollmentService: EnrollmentService,
    private pendingEnrollmentService: PendingEnrollmentService,
    private materialService: MaterialService,
    private documentService: DocumentService,
  ) {}

  async add(classDetails: ClassMetadata, professorId: string) {
    const newClass = await this.databaseClassService.createClass({
      classMetadata: classDetails,
      professorId,
    });
    const newEnrollment = await this.enrollmentService.createEnrollment({
      classId: newClass.id,
      userId: professorId,
      role: 'professor',
    });
    this.logger.debug('New class added', newEnrollment.classId);
    return {
      classId: newClass.id,
    };
  }

  async updateMetadata(classId: string, classDetails: ClassMetadata) {
    const updatedClass = await this.databaseClassService.updateClass({
      where: { id: classId },
      data: {
        classMetadata: classDetails,
      },
    });

    return {
      classId: updatedClass.id,
    };
  }

  async roster(classId: string) {
    const enrollments = await this.enrollmentService.enrollments({
      where: {
        classId,
      },
    });

    // get user from userservice
    const users = await Promise.all(
      enrollments.map(async (e) => {
        const dbUser = await this.userService.user({
          id: e.userId,
        });

        if (!dbUser) {
          return {
            userId: e.userId,
            role: e.role,
            researchNotes: '',
            email: '',
          };
        }

        return {
          userId: dbUser.id,
          role: e.role,
          researchNotes: JSON.stringify(dbUser.researchNotes),
          email: dbUser.email,
        };
      }),
    );

    return {
      classId: classId,
      users: users,
    };
  }

  async getPendingEnrollments(classId: string) {
    const pendingEnrollments =
      await this.pendingEnrollmentService.pendingEnrollments({
        where: {
          classId,
          status: 'not enrolled',
        },
      });
    const pendingUsers = pendingEnrollments.map((pendingEnrollment) => {
      return {
        id: pendingEnrollment.id,
        userEmail: pendingEnrollment.userEmail,
        role: pendingEnrollment.role,
        status: pendingEnrollment.status,
      };
    });

    return {
      classId: classId,
      pendingUsers: pendingUsers,
    };
  }

  async deletePendingEnrollments(classId: string, pendingUserIds: string[]) {
    try {
      await Promise.all(
        pendingUserIds.map(async (pendingId) => {
          try {
            const deletedPendingEnrollment =
              await this.pendingEnrollmentService.deletePendingEnrollment({
                id: pendingId,
              });
            return deletedPendingEnrollment;
          } catch (error) {
            this.logger.error('Error while deleting enrollment', error);

            if (error.code === 'P2025') {
              this.logger.error(`Student ${pendingId} not enrolled in class.`);
            }
            throw new NotFoundException(
              `Student with id ${pendingId} not enrolled in class.`,
            );
          }
        }),
      );
    } catch (error) {
      this.logger.error('Error while deleting student enrollment', error);

      throw error;
    }
    return {
      classId,
    };
  }

  async list() {
    const classes = await this.databaseClassService.classes({});

    return {
      classIds: classes.map((c) => c.id),
    };
  }

  async getClassById(id: string) {
    const classInfo = await this.databaseClassService.getClassById(id);
    return classInfo;
  }

  async enroll(classId: string, studentEmails: string[]) {
    try {
      // For each student, check if they are in the system
      const pendingStudents = [] as string[];
      const studentIds = [] as string[];

      await Promise.all(
        studentEmails.map(async (email) => {
          const user = await this.userService.user({
            email,
          });

          if (!user) {
            this.logger.log(`User with email ${email} not found`);
            pendingStudents.push(email);
          } else {
            studentIds.push(user.id);
          }
        }),
      );

      // For pending students, add them to the pending list
      if (pendingStudents.length > 0) {
        try {
          await Promise.all(
            pendingStudents.map(async (email) => {
              // Check if already pending
              const existingPendingEnrollments =
                await this.pendingEnrollmentService.pendingEnrollments({
                  where: {
                    classId,
                    userEmail: email,
                    status: 'not enrolled',
                  },
                });

              if (existingPendingEnrollments.length > 0) {
                this.logger.error(`User with email ${email} already pending`);
                throw new ConflictException(
                  `User with email ${email} already pending`,
                );
              }

              await this.pendingEnrollmentService.createPendingEnrollment({
                classId,
                userEmail: email,
                role: 'student',
                status: 'not enrolled',
              });
            }),
          );
        } catch (error) {
          this.logger.error('Error while adding pending students', error);
          throw error;
        }
      }

      // Add already existing students
      if (studentIds.length > 0) {
        try {
          const enrolledClasses = await Promise.all(
            studentIds.map(async (studentId) => {
              try {
                const enrolledClass =
                  await this.enrollmentService.createEnrollment({
                    classId,
                    userId: studentId,
                    role: 'student',
                  });

                return enrolledClass;
              } catch (error) {
                this.logger.error('Error while enrolling student', error);
                throw error;
              }
            }),
          );

          return {
            classId: enrolledClasses[0].classId,
          };
        } catch (e) {
          this.logger.error('Error while enrolling students', e);

          // Only if error is due to already enrolled
          if (e.code === 'P2002') {
            const enrolledStudents = await this.enrollmentService.enrollments({
              where: {
                classId,
              },
            });

            const enrolledStudentIds = enrolledStudents.map((e) => e.userId);

            this.logger.error('Already enrolled students', enrolledStudentIds);
            throw new ConflictException(
              `Students with ids ${enrolledStudentIds.join(', ')} are already enrolled in the class.`,
              `Students with ids ${enrolledStudentIds.join(
                ', ',
              )} are already enrolled in the class.`,
            );
          }
          throw new ConflictException('Error while enrolling students');
        }
      }

      // Report what is done, how many pending, how many normal
      this.logger.log(
        `Enrolled ${studentIds.length} students, ${pendingStudents.length} pending`,
      );

      return {
        classId,
      };
    } catch (error) {
      this.logger.error('Error while enrolling students', error);
      throw new ConflictException(`Error while enrolling students ${error}`);
    }
  }

  async getEnrollmentsPerUser(userId: string) {
    const enrollments = await this.enrollmentService.enrollments({
      where: {
        userId,
      },
    });

    return enrollments;
  }

  async checkPendingProfessor(userId: string) {
    // Get all classes
    const classes = await this.databaseClassService.classes({});

    // Get username using userid
    const user = await this.userService.user({
      id: userId,
    });

    if (!user) {
      return false;
    }

    const email = user?.email;

    // Filter classes with pending professor
    const pendingClasses = classes.filter((c) => c.professorId === email);

    if (pendingClasses.length === 0) {
      return false;
    }

    // Create list of class ids
    const classIds = pendingClasses.map((c) => c.id);

    return {
      classIds,
    };
  }

  async assignProfessor(classId: string, userId: string) {
    const updatedClass = await this.databaseClassService.updateClass({
      where: {
        id: classId,
      },
      data: {
        professorId: userId,
      },
    });

    this.enrollmentService.createEnrollment({
      classId: updatedClass.id,
      userId,
      role: 'professor',
    });

    return {
      classId: updatedClass.id,
    };
  }

  async deleteEnrollment(classId: string, studentIds: string[]) {
    try {
      await Promise.all(
        studentIds.map(async (studentId) => {
          try {
            const deletedEnrollment =
              await this.enrollmentService.deleteEnrollment({
                classId_userId: {
                  classId,
                  userId: studentId,
                },
              });

            return deletedEnrollment;
          } catch (error) {
            this.logger.error('Error while deleting enrollment', error);

            if (error.code === 'P2025') {
              this.logger.error(`Student ${studentId} not enrolled in class.`);
            }
            throw new NotFoundException(
              `Student with id ${studentId} not enrolled in class.`,
            );
          }
        }),
      );
    } catch (error) {
      this.logger.error('Error while deleting student enrollment', error);

      throw error;
    }
    return {
      classId,
    };
  }

  // RAG for class
  async queryClassDocuments(
    // p ? o
    query: string,
    classId: string,
    n: number,
    documentId?: string,
    pageNumber?: number,
    oMode?: boolean,
    engineChoice?: EngineChoice,
  ) {
    let queryIds = [];

    if (documentId) {
      queryIds = [documentId];
    } else {
      const classDocuments = await this.materialService.listDocuments(classId);

      const classDocumentIds = classDocuments.map((doc) => doc.id);
      queryIds = classDocumentIds;
    }

    const { results: queryResults } = await this.documentService.queryDocument(
      query,
      queryIds,
      pageNumber,
      n,
      oMode,
      /* materialId */ undefined,
      engineChoice,
    );

    return queryResults;
  }

  async getDocumentByClassId(classId: string) {
    // 1) Get materials for this class (your existing method already time-gates/unavailable)
    const { materials } = await this.materialService.list(classId);

    // 2) For each material, get its documents (these already include signed `file` + flags)
    const res = await Promise.all(
      materials.map(async (m) => {
        const { documents } =
          await this.materialService.listDocumentsByMaterialId(m.id);
        if (!documents || documents.length === 0) return null;

        // Prefer the professor-chosen student doc; fallback to the latest (index 0)
        const chosen =
          documents.find((d) => d.isStudent === true) ?? documents[0];

        return {
          id: chosen.id,
          fileName: chosen.fileName,
          materialType: m.materialType,
          file: chosen.file,
          // NEW flags
          isStudent: !!chosen.isStudent,
          isLlm: !!chosen.isLlm,
        };
      }),
    );

    return {
      documents: res.filter((item) => item !== null) as Array<{
        id: string;
        fileName: string;
        materialType: string;
        file: any;
        isStudent: boolean;
        isLlm: boolean;
      }>,
    };
  }

  async getDocumentIdsByClassId(classId: string) {
    // 1) Get materials for this class
    const { materials } = await this.materialService.list(classId);

    // 2) For each material, get its documents (no need to generate signed url for ids endpoint)
    const res = await Promise.all(
      materials.map(async (m) => {
        const { documents } =
          await this.materialService.listDocumentsByMaterialId(m.id);
        if (!documents || documents.length === 0) return null;

        // Prefer the professor-chosen student doc; fallback to the latest
        const chosen =
          documents.find((d) => d.isStudent === true) ?? documents[0];

        return {
          id: chosen.id,
          fileName: chosen.fileName,
          materialType: m.materialType,
          // NEW flags
          isStudent: !!chosen.isStudent,
          isLlm: !!chosen.isLlm,
        };
      }),
    );

    return {
      documentIds: res.filter((item) => item !== null) as Array<{
        id: string;
        fileName: string;
        materialType: string;
        isStudent: boolean;
        isLlm: boolean;
      }>,
    };
  }
}
