-- DropForeignKey
ALTER TABLE "Site" DROP CONSTRAINT "Site_clientId_fkey";

-- AlterTable
ALTER TABLE "Site" DROP COLUMN "clientId";

-- DropTable
DROP TABLE "Client";
