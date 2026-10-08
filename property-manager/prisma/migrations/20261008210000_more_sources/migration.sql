-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReservationSource" ADD VALUE 'VRBO';
ALTER TYPE "ReservationSource" ADD VALUE 'EXPEDIA';
ALTER TYPE "ReservationSource" ADD VALUE 'AGODA';
ALTER TYPE "ReservationSource" ADD VALUE 'TRIP_COM';
ALTER TYPE "ReservationSource" ADD VALUE 'HOLIDU';
ALTER TYPE "ReservationSource" ADD VALUE 'HOMETOGO';
ALTER TYPE "ReservationSource" ADD VALUE 'TRAVEL_AGENCY';

