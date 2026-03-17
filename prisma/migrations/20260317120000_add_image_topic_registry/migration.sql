-- CreateTable
CREATE TABLE "ImageTopic" (
    "id" TEXT NOT NULL,
    "topic" VARCHAR(150) NOT NULL,
    "description" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "allowUpload" BOOLEAN NOT NULL DEFAULT true,
    "allowUpdate" BOOLEAN NOT NULL DEFAULT true,
    "allowDelete" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImageTopic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImageTopic_topic_key" ON "ImageTopic"("topic");

-- CreateIndex
CREATE INDEX "ImageTopic_isActive_idx" ON "ImageTopic"("isActive");
