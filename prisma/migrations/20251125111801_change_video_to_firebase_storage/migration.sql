/*
  Warnings:

  - You are about to drop the column `cfUid` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `playbackUrl` on the `Video` table. All the data in the column will be lost.
  - Added the required column `storagePath` to the `Video` table without a default value. This is not possible if the table is not empty.
  - Added the required column `videoUrl` to the `Video` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Video_cfUid_key";

-- AlterTable
ALTER TABLE "Video" DROP COLUMN "cfUid",
DROP COLUMN "playbackUrl",
ADD COLUMN     "storagePath" TEXT NOT NULL,
ADD COLUMN     "videoUrl" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'READY';
