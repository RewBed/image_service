-- AlterTable
ALTER TABLE "Image"
ADD COLUMN "topic" VARCHAR(150) NOT NULL DEFAULT 'image.uploaded';

-- AlterTable
ALTER TABLE "Image"
ALTER COLUMN "topic" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Image_topic_idx" ON "Image"("topic");
