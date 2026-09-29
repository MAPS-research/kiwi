import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { Experiment, ExperimentAssignment, Prisma } from '@prisma/client';

/**
 * Raw Prisma access for the experiment models. Business logic (assignment,
 * config resolution, flag granting) lives in src/experiment/experiment.service.ts.
 */
@Injectable()
export class ExperimentDatabaseService {
  constructor(private database: DatabaseService) {}

  async experiment(
    where: Prisma.ExperimentWhereUniqueInput,
  ): Promise<Experiment | null> {
    return this.database.experiment.findUnique({ where });
  }

  async experiments(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ExperimentWhereUniqueInput;
    where?: Prisma.ExperimentWhereInput;
    orderBy?: Prisma.ExperimentOrderByWithRelationInput;
  }): Promise<Experiment[]> {
    return this.database.experiment.findMany(params);
  }

  /** The single active experiment for a class, if any. */
  async activeExperimentForClass(classId: string): Promise<Experiment | null> {
    return this.database.experiment.findFirst({
      where: { classId, status: 'active' },
    });
  }

  /** Enrolled students of a class as {userId, email} — for email→user resolution. */
  async studentRoster(
    classId: string,
  ): Promise<{ userId: string; email: string }[]> {
    const rows = await this.database.enrollment.findMany({
      where: { classId, role: 'student' },
      include: { user: { select: { id: true, email: true } } },
    });
    return rows.map((r) => ({ userId: r.user.id, email: r.user.email }));
  }

  async createExperiment(
    data: Prisma.ExperimentUncheckedCreateInput,
  ): Promise<Experiment> {
    return this.database.experiment.create({ data });
  }

  async updateExperiment(params: {
    where: Prisma.ExperimentWhereUniqueInput;
    data: Prisma.ExperimentUpdateInput;
  }): Promise<Experiment> {
    return this.database.experiment.update(params);
  }

  // --- Assignments -----------------------------------------------------

  async assignment(
    experimentId: string,
    userId: string,
  ): Promise<ExperimentAssignment | null> {
    return this.database.experimentAssignment.findUnique({
      where: { experimentId_userId: { experimentId, userId } },
    });
  }

  async assignments(
    where: Prisma.ExperimentAssignmentWhereInput,
  ): Promise<ExperimentAssignment[]> {
    return this.database.experimentAssignment.findMany({ where });
  }

  /**
   * Idempotently record a sticky assignment. If a row already exists it is
   * returned unchanged (assignments are never re-written).
   */
  async upsertAssignment(data: {
    experimentId: string;
    userId: string;
    variantKey: string;
    method?: string;
  }): Promise<ExperimentAssignment> {
    return this.database.experimentAssignment.upsert({
      where: {
        experimentId_userId: {
          experimentId: data.experimentId,
          userId: data.userId,
        },
      },
      create: {
        experimentId: data.experimentId,
        userId: data.userId,
        variantKey: data.variantKey,
        method: data.method ?? 'auto',
      },
      update: {}, // never overwrite an existing sticky assignment
    });
  }

  /** Count assignments grouped by variantKey (for analytics / detail view). */
  async countByVariant(
    experimentId: string,
  ): Promise<{ variantKey: string; count: number }[]> {
    const rows = await this.database.experimentAssignment.groupBy({
      by: ['variantKey'],
      where: { experimentId },
      _count: { _all: true },
    });
    return rows.map((r) => ({
      variantKey: r.variantKey,
      count: r._count._all,
    }));
  }

  /**
   * Per-variant student count + total chat interactions, for the analytics view.
   * Joins assignments to chat interactions in the class in memory (assignment
   * sets are class-sized, so this stays small).
   */
  async chatStatsByVariant(
    experimentId: string,
    classId: string,
  ): Promise<{ variantKey: string; students: number; interactions: number }[]> {
    const assignments = await this.database.experimentAssignment.findMany({
      where: { experimentId },
    });
    if (assignments.length === 0) return [];

    const userIds = assignments.map((a) => a.userId);
    const grouped = await this.database.userInteraction.groupBy({
      by: ['userId'],
      where: {
        classId,
        userId: { in: userIds },
        type: 'frontend-interaction-chat',
      },
      _count: { _all: true },
    });
    const countByUser = new Map(grouped.map((g) => [g.userId, g._count._all]));

    const agg = new Map<string, { students: number; interactions: number }>();
    for (const a of assignments) {
      const cur = agg.get(a.variantKey) ?? { students: 0, interactions: 0 };
      cur.students += 1;
      cur.interactions += countByUser.get(a.userId) ?? 0;
      agg.set(a.variantKey, cur);
    }
    return [...agg.entries()].map(([variantKey, v]) => ({
      variantKey,
      ...v,
    }));
  }
}
