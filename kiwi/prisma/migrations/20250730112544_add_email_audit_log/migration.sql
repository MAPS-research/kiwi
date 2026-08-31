-- CreateTable
CREATE TABLE "EmailAuditLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fromEmail" TEXT NOT NULL,
    "toEmails" TEXT[],
    "subject" TEXT NOT NULL,
    "emailType" TEXT NOT NULL,
    "templateName" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "userId" TEXT,
    "classId" TEXT,
    "messageId" TEXT,
    "metadata" JSONB,

    CONSTRAINT "EmailAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailAuditLog_userId_idx" ON "EmailAuditLog"("userId");

-- CreateIndex
CREATE INDEX "EmailAuditLog_classId_idx" ON "EmailAuditLog"("classId");

-- CreateIndex
CREATE INDEX "EmailAuditLog_status_idx" ON "EmailAuditLog"("status");

-- CreateIndex
CREATE INDEX "EmailAuditLog_timestamp_idx" ON "EmailAuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "EmailAuditLog_emailType_idx" ON "EmailAuditLog"("emailType");

-- AddForeignKey
ALTER TABLE "EmailAuditLog" ADD CONSTRAINT "EmailAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAuditLog" ADD CONSTRAINT "EmailAuditLog_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
