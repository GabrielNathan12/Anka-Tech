/*
  Warnings:

  - You are about to drop the `Clients` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Goals` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Simulations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `wallet` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."PortfolioKind" AS ENUM ('CURRENT', 'PLAN');

-- CreateEnum
CREATE TYPE "public"."AssetClass" AS ENUM ('EQUITIES', 'FIXED_INCOME', 'CASH', 'REAL_ESTATE', 'INTERNATIONAL', 'ALTERNATIVES');

-- CreateEnum
CREATE TYPE "public"."GoalType" AS ENUM ('RETIREMENT', 'SHORT_TERM', 'MEDIUM_TERM', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."EventFrequency" AS ENUM ('ONE_TIME', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "public"."EventType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'CONTRIBUTION', 'EXPENSE', 'REBALANCE');

-- CreateEnum
CREATE TYPE "public"."AlignmentCategory" AS ENUM ('GREEN', 'YELLOW_LIGHT', 'YELLOW_DARK', 'RED');

-- CreateEnum
CREATE TYPE "public"."InsuranceType" AS ENUM ('LIFE', 'DISABILITY');

-- CreateEnum
CREATE TYPE "public"."Status" AS ENUM ('ACTIVE', 'INACTIVE');

-- DropTable
DROP TABLE "public"."Clients";

-- DropTable
DROP TABLE "public"."Events";

-- DropTable
DROP TABLE "public"."Goals";

-- DropTable
DROP TABLE "public"."Simulations";

-- DropTable
DROP TABLE "public"."wallet";

-- CreateTable
CREATE TABLE "public"."Client" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "age" INTEGER,
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "family_perfil" TEXT,
    "alignmentPercent" DECIMAL(7,4),
    "alignmentCategory" "public"."AlignmentCategory",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Goal" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "type" "public"."GoalType" NOT NULL,
    "name" TEXT NOT NULL,
    "targetValue" DECIMAL(18,2) NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PortfolioSnapshot" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "kind" "public"."PortfolioKind" NOT NULL,
    "asOfDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalValue" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WalletAllocation" (
    "id" SERIAL NOT NULL,
    "snapshotId" INTEGER NOT NULL,
    "assetClass" "public"."AssetClass" NOT NULL,
    "percent" DECIMAL(6,3) NOT NULL,

    CONSTRAINT "WalletAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Event" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "type" "public"."EventType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "frequency" "public"."EventFrequency" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "executionDay" INTEGER,
    "executionMonth" INTEGER,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Simulation" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "name" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "realRate" DECIMAL(6,4) NOT NULL DEFAULT 0.0400,
    "untilYear" INTEGER NOT NULL DEFAULT 2060,
    "inputs" JSONB,
    "resultSeries" JSONB,
    "alignmentPercent" DECIMAL(7,4),
    "alignmentCategory" "public"."AlignmentCategory",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Simulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Insurance" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "type" "public"."InsuranceType" NOT NULL,
    "coverage" DECIMAL(18,2) NOT NULL,
    "premium" DECIMAL(18,2),
    "provider" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insurance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_email_key" ON "public"."Client"("email");

-- CreateIndex
CREATE INDEX "Goal_clientId_idx" ON "public"."Goal"("clientId");

-- CreateIndex
CREATE INDEX "Goal_type_idx" ON "public"."Goal"("type");

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_clientId_kind_asOfDate_idx" ON "public"."PortfolioSnapshot"("clientId", "kind", "asOfDate");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioSnapshot_clientId_kind_asOfDate_key" ON "public"."PortfolioSnapshot"("clientId", "kind", "asOfDate");

-- CreateIndex
CREATE INDEX "WalletAllocation_snapshotId_idx" ON "public"."WalletAllocation"("snapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletAllocation_snapshotId_assetClass_key" ON "public"."WalletAllocation"("snapshotId", "assetClass");

-- CreateIndex
CREATE INDEX "Event_clientId_idx" ON "public"."Event"("clientId");

-- CreateIndex
CREATE INDEX "Event_frequency_startDate_idx" ON "public"."Event"("frequency", "startDate");

-- CreateIndex
CREATE INDEX "Simulation_clientId_createdAt_idx" ON "public"."Simulation"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "Insurance_clientId_idx" ON "public"."Insurance"("clientId");

-- CreateIndex
CREATE INDEX "Insurance_type_status_idx" ON "public"."Insurance"("type", "status");

-- AddForeignKey
ALTER TABLE "public"."Goal" ADD CONSTRAINT "Goal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PortfolioSnapshot" ADD CONSTRAINT "PortfolioSnapshot_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WalletAllocation" ADD CONSTRAINT "WalletAllocation_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "public"."PortfolioSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Simulation" ADD CONSTRAINT "Simulation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Insurance" ADD CONSTRAINT "Insurance_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
