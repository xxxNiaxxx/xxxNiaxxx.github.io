-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "idNumber" TEXT,
ADD COLUMN     "idType" TEXT;

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "paymentMethod" TEXT;

