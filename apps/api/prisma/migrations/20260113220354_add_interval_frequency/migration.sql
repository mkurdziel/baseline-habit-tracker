-- AlterEnum
ALTER TYPE "Frequency" ADD VALUE 'INTERVAL';

-- AlterTable
ALTER TABLE "habits" ADD COLUMN     "intervalDays" INTEGER;
