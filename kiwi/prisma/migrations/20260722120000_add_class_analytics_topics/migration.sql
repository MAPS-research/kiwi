-- CreateTable
CREATE TABLE "ClassAnalyticsTopics" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "topics" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "lastProcessedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassAnalyticsTopics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClassAnalyticsTopics_classId_key" ON "ClassAnalyticsTopics"("classId");

-- CreateIndex
CREATE INDEX "ClassAnalyticsTopics_status_idx" ON "ClassAnalyticsTopics"("status");

-- AddForeignKey
ALTER TABLE "ClassAnalyticsTopics" ADD CONSTRAINT "ClassAnalyticsTopics_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
