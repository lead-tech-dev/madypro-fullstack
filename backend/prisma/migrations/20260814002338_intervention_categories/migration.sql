-- AlterTable
ALTER TABLE "Intervention" ADD COLUMN     "categoryId" TEXT;

-- AlterTable
ALTER TABLE "TemplateStop" ADD COLUMN     "categoryId" TEXT;

-- CreateTable
CREATE TABLE "InterventionCategory" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterventionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteCategory" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteCategoryChecklistItem" (
    "id" TEXT NOT NULL,
    "siteCategoryId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteCategoryChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteCategory_siteId_categoryId_key" ON "SiteCategory"("siteId", "categoryId");

-- AddForeignKey
ALTER TABLE "SiteCategory" ADD CONSTRAINT "SiteCategory_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteCategory" ADD CONSTRAINT "SiteCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InterventionCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteCategoryChecklistItem" ADD CONSTRAINT "SiteCategoryChecklistItem_siteCategoryId_fkey" FOREIGN KEY ("siteCategoryId") REFERENCES "SiteCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InterventionCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateStop" ADD CONSTRAINT "TemplateStop_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InterventionCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
