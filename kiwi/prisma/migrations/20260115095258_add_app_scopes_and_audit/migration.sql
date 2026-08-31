-- AlterTable
ALTER TABLE "ClassKiwiApp" ADD COLUMN     "enabledScopes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "KiwiAppWhitelist" ADD COLUMN     "maxScopes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "KiwiAppAuditLog" (
    "id" TEXT NOT NULL,
    "appSlug" TEXT NOT NULL,
    "userId" TEXT,
    "classId" TEXT,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KiwiAppAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KiwiAppAuditLog_appSlug_idx" ON "KiwiAppAuditLog"("appSlug");

-- CreateIndex
CREATE INDEX "KiwiAppAuditLog_userId_idx" ON "KiwiAppAuditLog"("userId");

-- CreateIndex
CREATE INDEX "KiwiAppAuditLog_classId_idx" ON "KiwiAppAuditLog"("classId");

-- CreateIndex
CREATE INDEX "KiwiAppAuditLog_eventType_idx" ON "KiwiAppAuditLog"("eventType");

-- CreateIndex
CREATE INDEX "KiwiAppAuditLog_createdAt_idx" ON "KiwiAppAuditLog"("createdAt");
