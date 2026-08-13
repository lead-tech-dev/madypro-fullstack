-- AlterEnum
BEGIN;
CREATE TYPE "ApprovalActionType_new" AS ENUM ('CREATE_INTERVENTION', 'UPDATE_INTERVENTION_SCHEDULE', 'ASSIGN_AGENT', 'UNASSIGN_AGENT', 'CANCEL_INTERVENTION', 'CREATE_TEMPLATE_BATCH');
ALTER TABLE "ApprovalRequest" ALTER COLUMN "actionType" TYPE "ApprovalActionType_new" USING ("actionType"::text::"ApprovalActionType_new");
ALTER TYPE "ApprovalActionType" RENAME TO "ApprovalActionType_old";
ALTER TYPE "ApprovalActionType_new" RENAME TO "ApprovalActionType";
DROP TYPE "ApprovalActionType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Intervention" DROP CONSTRAINT "Intervention_generatedFromRuleId_fkey";

-- DropForeignKey
ALTER TABLE "Intervention" DROP CONSTRAINT "Intervention_generatedFromTourId_fkey";

-- DropForeignKey
ALTER TABLE "InterventionRule" DROP CONSTRAINT "InterventionRule_siteId_fkey";

-- DropForeignKey
ALTER TABLE "TourStop" DROP CONSTRAINT "TourStop_siteId_fkey";

-- DropForeignKey
ALTER TABLE "TourStop" DROP CONSTRAINT "TourStop_tourRuleId_fkey";

-- AlterTable
ALTER TABLE "Intervention" DROP COLUMN "generatedFromRuleId",
DROP COLUMN "generatedFromTourId";

-- DropTable
DROP TABLE "InterventionRule";

-- DropTable
DROP TABLE "TourRule";

-- DropTable
DROP TABLE "TourStop";

