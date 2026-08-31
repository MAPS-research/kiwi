-- CreateTable
CREATE TABLE "LectureKeyword" (
    "id" TEXT NOT NULL,
    "lectureId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "keywords" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "LectureKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LectureKeyword_classId_idx" ON "LectureKeyword"("classId");

-- CreateIndex
CREATE INDEX "LectureKeyword_lectureId_idx" ON "LectureKeyword"("lectureId");

-- CreateIndex
CREATE INDEX "LectureKeyword_status_idx" ON "LectureKeyword"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LectureKeyword_lectureId_classId_key" ON "LectureKeyword"("lectureId", "classId");

-- AddForeignKey
ALTER TABLE "LectureKeyword" ADD CONSTRAINT "LectureKeyword_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
