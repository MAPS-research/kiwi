-- CreateTable
CREATE TABLE "InstructorClass" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'instructor',
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "InstructorClass_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstructorClass_userId_idx" ON "InstructorClass"("userId");

-- CreateIndex
CREATE INDEX "InstructorClass_classId_idx" ON "InstructorClass"("classId");

-- CreateIndex
CREATE INDEX "InstructorClass_userId_isActive_idx" ON "InstructorClass"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "InstructorClass_userId_classId_key" ON "InstructorClass"("userId", "classId");

-- AddForeignKey
ALTER TABLE "InstructorClass" ADD CONSTRAINT "InstructorClass_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorClass" ADD CONSTRAINT "InstructorClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
