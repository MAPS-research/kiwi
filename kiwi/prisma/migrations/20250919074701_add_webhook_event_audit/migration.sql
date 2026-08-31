-- CreateTable
CREATE TABLE "WebhookEventAudit" (
    "id" TEXT NOT NULL,
    "webhookEventId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEventAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebhookEventAudit_webhookEventId_idx" ON "WebhookEventAudit"("webhookEventId");

-- CreateIndex
CREATE INDEX "WebhookEventAudit_performedBy_idx" ON "WebhookEventAudit"("performedBy");

-- CreateIndex
CREATE INDEX "WebhookEventAudit_timestamp_idx" ON "WebhookEventAudit"("timestamp");

-- CreateIndex
CREATE INDEX "WebhookEventAudit_action_idx" ON "WebhookEventAudit"("action");

-- AddForeignKey
ALTER TABLE "WebhookEventAudit" ADD CONSTRAINT "WebhookEventAudit_webhookEventId_fkey" FOREIGN KEY ("webhookEventId") REFERENCES "WebhookEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEventAudit" ADD CONSTRAINT "WebhookEventAudit_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
