-- AlterEnum
ALTER TYPE "ApprovalActionType" ADD VALUE 'VALIDATE_TEMPLATE';

-- AlterTable
ALTER TABLE "Intervention" ADD COLUMN     "generatedFromStopId" TEXT;

-- AlterTable
ALTER TABLE "InterventionTemplate" DROP COLUMN "autoGenerate",
ADD COLUMN     "validatedAt" TIMESTAMP(3),
ADD COLUMN     "validatedById" TEXT;

-- AlterTable
ALTER TABLE "TemplateStop" ADD COLUMN     "specificDate" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "InterventionTemplate" ADD CONSTRAINT "InterventionTemplate_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
