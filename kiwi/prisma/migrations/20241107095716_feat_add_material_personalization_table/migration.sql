-- CreateTable
CREATE TABLE "MaterialPersonalization" (
    "personalizationId" TEXT NOT NULL,
    "timeSpent" TEXT NOT NULL,
    "learningStyle" TEXT NOT NULL,
    "questionStyle" TEXT NOT NULL,
    "studentGoodAt" TEXT NOT NULL,
    "studentsImproveAt" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,

    CONSTRAINT "MaterialPersonalization_pkey" PRIMARY KEY ("personalizationId")
);
