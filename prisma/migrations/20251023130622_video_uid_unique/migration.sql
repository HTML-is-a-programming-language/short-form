/*
  Warnings:

  - A unique constraint covering the columns `[uid]` on the table `Video` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `uid` to the `Video` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "uid" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Video_uid_key" ON "Video"("uid");
