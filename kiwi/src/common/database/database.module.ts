import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserSessionService } from './user-session.service';
import { UserInteractionService } from './user-interaction.service';
import { ClassService } from './class.service';
import { ClassMaterialService } from './class-material.service';
import { DatabaseService } from './database.service';
import { DocumentService } from './document.service';
import { DocumentCommentService } from './document-comment.service';
import { DocumentSummaryService } from './document-summary.service';
import { EmbeddingService } from './embedding.service';
import { EnrollmentService } from './enrollment.service';
import { PendingEnrollmentService } from './pending-enrollment.service';
import { MaterialPersonalizationService } from './material-personalization.service';
import { UserWhitelistService } from './user-whistelist.service';
import { FeatureFlagService } from './feature-flags.service';
import { CompetitionService } from './competition.service';
import { PendingAdminService } from './pending-admin.service';
import { EmailAuditLogService } from './email-audit-log.service';
import { WebhookEventService } from './webhook-event.service';
import { KeywordService } from './keyword.service';
import { ExperimentDatabaseService } from './experiment.service';

@Module({
  providers: [
    DatabaseService,
    ExperimentDatabaseService,
    UserService,
    UserSessionService,
    UserInteractionService,
    ClassService,
    ClassMaterialService,
    DocumentService,
    DocumentCommentService,
    DocumentSummaryService,
    EmbeddingService,
    EnrollmentService,
    PendingEnrollmentService,
    MaterialPersonalizationService,
    UserWhitelistService,
    FeatureFlagService,
    CompetitionService,
    PendingAdminService,
    EmailAuditLogService,
    WebhookEventService,
    KeywordService,
  ],
  exports: [
    UserService,
    UserSessionService,
    UserInteractionService,
    ClassService,
    ClassMaterialService,
    DocumentService,
    DocumentCommentService,
    DocumentSummaryService,
    DatabaseService,
    ExperimentDatabaseService,
    EmbeddingService,
    EnrollmentService,
    PendingEnrollmentService,
    MaterialPersonalizationService,
    UserWhitelistService,
    FeatureFlagService,
    CompetitionService,
    PendingAdminService,
    EmailAuditLogService,
    WebhookEventService,
    KeywordService,
  ],
})
export class DatabaseModule { }
