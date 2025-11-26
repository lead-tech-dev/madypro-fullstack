-- CreateEnum
CREATE TYPE "AnomalyStatus" AS ENUM ('NEW', 'RESOLVED');

-- CreateTable
CREATE TABLE "Anomaly" (
    "id" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT NOT NULL,
    "photos" TEXT[],
    "status" "AnomalyStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anomaly_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Anomaly" ADD CONSTRAINT "Anomaly_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anomaly" ADD CONSTRAINT "Anomaly_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Added: photos on Intervention
ALTER TABLE "Intervention" ADD COLUMN IF NOT EXISTS "photos" TEXT[] DEFAULT ARRAY[]::TEXT[];
