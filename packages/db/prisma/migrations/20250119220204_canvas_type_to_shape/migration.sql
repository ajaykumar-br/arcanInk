/*
  Warnings:

  - You are about to drop the column `type` on the `Canvas` table. All the data in the column will be lost.
  - Added the required column `shape` to the `Canvas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Canvas" DROP COLUMN "type",
ADD COLUMN     "shape" "shapeTypes" NOT NULL;
