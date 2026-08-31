/*
  Warnings:

  - You are about to drop the column `imageLargeUrl` on the `ClassMaterial` table. All the data in the column will be lost.
  - You are about to drop the column `imageSnippetUrl` on the `ClassMaterial` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ClassMaterial" DROP COLUMN "imageLargeUrl",
DROP COLUMN "imageSnippetUrl";
