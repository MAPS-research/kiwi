-- CreateEnum
CREATE TYPE "DocumentRole" AS ENUM ('NONE', 'STUDENT', 'LLM');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "role" "DocumentRole" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "sortIndex" INTEGER NOT NULL DEFAULT 0;
