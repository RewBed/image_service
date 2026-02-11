-- CreateEnum
CREATE TYPE "ImageStorageType" AS ENUM ('LOCAL', 'S3', 'MINIO');

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "imageType" TEXT,
    "storage" "ImageStorageType" NOT NULL,
    "bucket" TEXT,
    "path" VARCHAR(2048) NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "checksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Image_externalId_key" ON "Image"("externalId");

-- CreateIndex
CREATE INDEX "Image_createdAt_idx" ON "Image"("createdAt");
