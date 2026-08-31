import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { LectureKeyword, Prisma } from '@prisma/client';

@Injectable()
export class KeywordService {
    constructor(private database: DatabaseService) { }

    async getLectureKeywords(
        lectureKeywordWhereUniqueInput: Prisma.LectureKeywordWhereUniqueInput,
    ): Promise<LectureKeyword | null> {
        return this.database.lectureKeyword.findUnique({
            where: lectureKeywordWhereUniqueInput,
        });
    }

    async getLectureKeywordsByClassId(
        classId: string,
    ): Promise<LectureKeyword[]> {
        return this.database.lectureKeyword.findMany({
            where: {
                classId: classId,
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });
    }

    async getLectureKeywordsByLectureId(
        lectureId: string,
        classId: string,
    ): Promise<LectureKeyword | null> {
        return this.database.lectureKeyword.findUnique({
            where: {
                lectureId_classId: {
                    lectureId: lectureId,
                    classId: classId,
                },
            },
        });
    }

    async createLectureKeywords(
        data: Prisma.LectureKeywordCreateInput,
    ): Promise<LectureKeyword> {
        return this.database.lectureKeyword.create({
            data,
        });
    }

    async updateLectureKeywords(params: {
        where: Prisma.LectureKeywordWhereUniqueInput;
        data: Prisma.LectureKeywordUpdateInput;
    }): Promise<LectureKeyword> {
        const { where, data } = params;
        return this.database.lectureKeyword.update({
            data,
            where,
        });
    }

    async upsertLectureKeywords(params: {
        where: Prisma.LectureKeywordWhereUniqueInput;
        update: Prisma.LectureKeywordUpdateInput;
        create: Prisma.LectureKeywordCreateInput;
    }): Promise<LectureKeyword> {
        const { where, update, create } = params;
        return this.database.lectureKeyword.upsert({
            where,
            update,
            create,
        });
    }

    async deleteLectureKeywords(
        where: Prisma.LectureKeywordWhereUniqueInput,
    ): Promise<LectureKeyword> {
        return this.database.lectureKeyword.delete({
            where,
        });
    }

    async getAllPendingKeywords(): Promise<LectureKeyword[]> {
        return this.database.lectureKeyword.findMany({
            where: {
                status: 'pending',
            },
            orderBy: {
                createdAt: 'asc',
            },
        });
    }

    async updateKeywordStatus(
        id: string,
        status: string,
    ): Promise<LectureKeyword> {
        return this.database.lectureKeyword.update({
            where: { id },
            data: {
                status,
                updatedAt: new Date(),
            },
        });
    }
} 