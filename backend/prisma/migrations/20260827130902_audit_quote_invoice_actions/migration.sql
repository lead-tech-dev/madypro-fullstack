-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CREATE_QUOTE';
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_QUOTE';
ALTER TYPE "AuditAction" ADD VALUE 'SEND_QUOTE';
ALTER TYPE "AuditAction" ADD VALUE 'DELETE_QUOTE';
ALTER TYPE "AuditAction" ADD VALUE 'CONVERT_QUOTE_TO_INVOICE';
ALTER TYPE "AuditAction" ADD VALUE 'CREATE_INVOICE';
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_INVOICE';
ALTER TYPE "AuditAction" ADD VALUE 'SEND_INVOICE';
ALTER TYPE "AuditAction" ADD VALUE 'RECORD_INVOICE_PAYMENT';
ALTER TYPE "AuditAction" ADD VALUE 'DELETE_INVOICE';

