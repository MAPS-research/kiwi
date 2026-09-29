// src/feature/feature-flag.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagsService } from './feature-flags.service';
import { FEATURE_FLAG_KEY } from './feature-flags.decorator';
import type { Feature } from '@prisma/client';
import { EngineChoice } from 'src/common/llm/interfaces/engine-config';

@Injectable()
export class FeatureFlagGuardByUserId implements CanActivate {
  constructor(
    private reflector: Reflector,
    private featureFlagsService: FeatureFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeatures = this.reflector.getAllAndMerge<Feature[]>(
      FEATURE_FLAG_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredFeatures || requiredFeatures.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.session.userId;
    if (!userId) {
      throw new ForbiddenException();
    }

    for (const feature of requiredFeatures) {
      const isEnabled = await this.featureFlagsService.isFeatureEnabled({
        feature,
        userId,
      });
      if (!isEnabled) {
        return false;
      }
    }
    return true;
  }
}

@Injectable()
export class FeatureFlagGuardQwenModel implements CanActivate {
  constructor(private featureFlagsService: FeatureFlagsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.session.userId;
    if (!userId) {
      throw new ForbiddenException();
    }

    const requestBody = request.body as {
      // v1 format
      type?: 'pdf' | 'codegen';
      studentContext?: {
        classId: string;
      };
      codegenContext?: {
        problemId: string;
      };
      // v2 format
      context?: {
        pdf?: {
          classId: string;
        };
        codegen?: {
          problemId: string;
        };
      };
      engineChoice: EngineChoice;
    };

    const {
      type,
      studentContext,
      context: unifiedContext,
      engineChoice,
    } = requestBody;

    // Check for codegen type (v1) or codegen context (v2)
    if (type === 'codegen' || unifiedContext?.codegen) {
      return true;
    }

    // Get classId from v1 or v2 format
    const classId = studentContext?.classId || unifiedContext?.pdf?.classId;

    if (!engineChoice) {
      throw new BadRequestException('engineChoice is required');
    }

    // OpenAI is always allowed regardless of class context.
    if (engineChoice === 'openai') {
      return true;
    }

    // App-wide agent/navigation requests may have no class context. Don't 400 —
    // still gate Qwen at the USER level (isFeatureEnabled falls back to
    // user-scoped flags when classId is omitted), so this is not a fail-open
    // bypass of the model gate.
    const isEnabled = await this.featureFlagsService.isFeatureEnabled({
      feature: 'QwenModel',
      userId,
      classId: classId || undefined,
    });

    if (!isEnabled) {
      return false;
    }

    return true;
  }
}

@Injectable()
export class FeatureFlagGuardTokenLimit implements CanActivate {
  constructor(private featureFlagsService: FeatureFlagsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.session.userId;
    if (!userId) {
      throw new ForbiddenException();
    }

    const requestBody = request.body as {
      // v1 format
      type?: 'pdf' | 'codegen';
      studentContext?: {
        classId: string;
      };
      codegenContext?: {
        problemId: string;
      };
      classId?: string; // Support direct classId field
      // v2 format
      context?: {
        pdf?: {
          classId: string;
        };
        codegen?: {
          problemId: string;
        };
      };
    };

    const {
      type,
      studentContext,
      classId,
      context: unifiedContext,
    } = requestBody;

    // Check for codegen type (v1) or codegen context (v2)
    if (type === 'codegen' || unifiedContext?.codegen) {
      return true;
    }

    // Try to get classId from multiple sources: v1 studentContext, v2 context.pdf, direct field, query params, or route params
    const extractedClassId =
      studentContext?.classId ||
      unifiedContext?.pdf?.classId ||
      classId ||
      request.query?.classId ||
      request.params?.classId ||
      request.query?.classID ||
      request.params?.classID;

    // App-wide agent/navigation chat requests aren't scoped to a document, so
    // classId may be absent. Don't 400 — but still enforce the quota at the USER
    // level (isFeatureEnabled falls back to user-scoped flags when classId is
    // omitted), so this is not a fail-open quota bypass.
    const isEnabled = await this.featureFlagsService.isFeatureEnabled({
      feature: 'TokenLimit',
      userId,
      classId: extractedClassId || undefined,
    });

    if (!isEnabled) {
      return false;
    }

    return true;
  }
}
