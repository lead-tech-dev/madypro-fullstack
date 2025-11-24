-- DropForeignKey
ALTER TABLE "InterventionRule" DROP CONSTRAINT "InterventionRule_siteId_fkey";

-- AlterTable
ALTER TABLE "Absence" ALTER COLUMN "createdBy" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "lastSeenLatitude" DOUBLE PRECISION,
ADD COLUMN     "lastSeenLongitude" DOUBLE PRECISION,
ADD COLUMN     "outsideSince" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "InterventionRule" ADD CONSTRAINT "InterventionRule_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
