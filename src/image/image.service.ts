import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';

import { createHash, randomBytes } from 'crypto';
import { extname, dirname, basename, join } from 'path';
import * as fs from 'fs';
import * as util from 'util';
import sharp from 'sharp';
import { UploadImageDto } from './dto/upload.image.dto';
import { UpdateImageDto } from './dto/update.image.dto';
import { Image, ImageTopic } from 'generated/prisma/client';
import { ImageDto } from './dto/image.dto';

const writeFile = util.promisify(fs.writeFile);
const KAFKA_TOPIC_PATTERN = /^[a-zA-Z0-9._-]{1,150}$/;
const IMAGE_EVENT_VERSION = 1;
type TopicEventOperation = 'uploaded' | 'updated' | 'deleted';

@Injectable()
export class ImageService {
    constructor(private readonly prisma: PrismaService) {}

    private readonly unsupportedWebMimeTypes = ['image/gif', 'image/svg+xml'];

    async getImageByExternalId(externalId: string): Promise<Image | null>;
    async getImageByExternalId(topic: string, externalId: string): Promise<Image | null>;
    async getImageByExternalId(topicOrExternalId: string, externalIdMaybe?: string): Promise<Image | null> {
        const isTopicAwareCall = externalIdMaybe !== undefined;
        const normalizedExternalId = this.normalizeExternalId(
            isTopicAwareCall ? externalIdMaybe : topicOrExternalId,
        );
        const normalizedTopic = isTopicAwareCall
            ? (await this.getConfiguredTopicOrThrow(topicOrExternalId)).topic
            : undefined;

        const where = isTopicAwareCall
            ? {
                  topic: normalizedTopic,
                  externalId: normalizedExternalId,
              }
            : {
                  externalId: normalizedExternalId,
              };

        const image = await this.prisma.image.findFirst({ where });

        if (!image || image.deletedAt) {
            return null;
        }

        return image;
    }

    async getImageInfoByExternalId(topic: string, externalId: string): Promise<ImageDto | null> {
        const configuredTopic = await this.getConfiguredTopicOrThrow(topic);
        const normalizedExternalId = this.normalizeExternalId(externalId);
        const image = await this.prisma.image.findFirst({
            where: {
                topic: configuredTopic.topic,
                externalId: normalizedExternalId,
            },
        });

        if (!image) {
            return null;
        }

        return this.toImageDto(image);
    }

    async getImagesByIds(ids: string[]): Promise<ImageDto[]> {
        const normalizedIds = [...new Set(ids.map((id) => this.normalizeImageId(id)))];
        const images = await this.prisma.image.findMany({
            where: {
                id: {
                    in: normalizedIds,
                },
            },
        });

        const imageById = new Map(images.map((image) => [image.id, image]));
        const missingIds = normalizedIds.filter((id) => !imageById.has(id));
        if (missingIds.length > 0) {
            throw new NotFoundException(`Images not found: ${missingIds.join(', ')}`);
        }

        return normalizedIds
            .map((id) => imageById.get(id))
            .filter((image): image is Image => image !== undefined)
            .map((image) => this.toImageDto(image));
    }

    async getImageForAdminByExternalId(topic: string, externalId: string): Promise<Image | null> {
        const normalizedTopic = (await this.getConfiguredTopicOrThrow(topic)).topic;
        const normalizedExternalId = this.normalizeExternalId(externalId);

        return this.prisma.image.findFirst({
            where: {
                topic: normalizedTopic,
                externalId: normalizedExternalId,
            },
        });
    }

    getWebImagePath(imagePath: string): string {
        const dir = dirname(imagePath);
        const originalBaseName = basename(imagePath, extname(imagePath));

        return join(dir, `${originalBaseName}.web.webp`);
    }

    canGenerateWebVersion(mimeType: string): boolean {
        return !this.unsupportedWebMimeTypes.includes(mimeType);
    }

    async ensureWebVersion(image: Image): Promise<string | null> {
        if (!this.canGenerateWebVersion(image.mimeType) || !fs.existsSync(image.path)) {
            return null;
        }

        const webPath = this.getWebImagePath(image.path);
        if (fs.existsSync(webPath)) {
            return webPath;
        }

        await sharp(image.path)
            .rotate()
            .resize({
                width: 1920,
                height: 1920,
                fit: 'inside',
                withoutEnlargement: true,
            })
            .webp({ quality: 80 })
            .toFile(webPath);

        return webPath;
    }

    async uploadImage(topic: string, file: Express.Multer.File, dto: UploadImageDto): Promise<ImageDto> {
        const normalizedTopic = (await this.getConfiguredTopicOrThrow(topic, 'uploaded')).topic;
        const entityType = this.normalizeRequiredField(dto.entityType, 'entityType');
        const entityId = this.normalizeRequiredField(dto.entityId, 'entityId');
        const imageType = this.normalizeOptionalField(dto.imageType) ?? 'default';
        const title = this.normalizeOptionalField(dto.title);
        const description = this.normalizeOptionalField(dto.description);

        if (!file) {
            throw new BadRequestException('File is required');
        }

        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException('Only image files are allowed');
        }

        const externalId = randomBytes(36).toString('hex');
        const extension = extname(file.originalname).replace('.', '').toLowerCase();
        const mimeType = file.mimetype;
        const size = file.size;

        let width: number | null = null;
        let height: number | null = null;

        try {
            const metadata = await sharp(file.buffer).metadata();
            width = metadata.width ?? null;
            height = metadata.height ?? null;
        } catch {
            width = null;
            height = null;
        }

        const storageFolder = `./uploads/${normalizedTopic}/${entityType}/${entityId}`;
        if (!fs.existsSync(storageFolder)) {
            fs.mkdirSync(storageFolder, { recursive: true });
        }

        const fileName = `${externalId}.${extension}`;
        const filePath = `${storageFolder}/${fileName}`;
        await writeFile(filePath, file.buffer);

        const checksum = createHash('md5').update(file.buffer).digest('hex');
        const eventType = this.buildTopicEventType(normalizedTopic, 'uploaded');

        const image = await this.prisma.$transaction(async (tx) => {
            const createdImage = await tx.image.create({
                data: {
                    externalId,
                    topic: normalizedTopic,
                    entityType,
                    entityId,
                    imageType,
                    title,
                    description,
                    storage: 'LOCAL',
                    path: filePath,
                    originalName: file.originalname,
                    mimeType,
                    extension,
                    size,
                    width,
                    height,
                    checksum,
                    isPublic: false,
                },
            });

            await tx.outboxEvent.create({
                data: {
                    topic: normalizedTopic,
                    key: createdImage.externalId,
                    eventType,
                    eventVersion: IMAGE_EVENT_VERSION,
                    payload: {
                        eventId: randomBytes(16).toString('hex'),
                        eventType,
                        eventVersion: IMAGE_EVENT_VERSION,
                        occurredAt: new Date().toISOString(),
                        data: {
                            topic: normalizedTopic,
                            externalId: createdImage.externalId,
                            entityType: createdImage.entityType,
                            entityId: createdImage.entityId,
                            imageType: createdImage.imageType,
                            title: createdImage.title,
                            description: createdImage.description,
                            originalName: createdImage.originalName,
                            mimeType: createdImage.mimeType,
                            extension: createdImage.extension,
                            size: createdImage.size,
                            width: createdImage.width,
                            height: createdImage.height,
                            storage: createdImage.storage,
                            path: createdImage.path,
                            checksum: createdImage.checksum,
                            createdAt: createdImage.createdAt.toISOString(),
                        },
                    },
                },
            });

            return createdImage;
        });

        return this.toImageDto(image);
    }

    async markImageDeleted(topic: string, externalId: string): Promise<ImageDto | null> {
        const normalizedTopic = (await this.getConfiguredTopicOrThrow(topic, 'deleted')).topic;
        const normalizedExternalId = this.normalizeExternalId(externalId);
        const eventType = this.buildTopicEventType(normalizedTopic, 'deleted');

        return this.prisma.$transaction(async (tx) => {
            const image = await tx.image.findFirst({
                where: {
                    topic: normalizedTopic,
                    externalId: normalizedExternalId,
                },
            });

            if (!image || image.deletedAt) {
                return null;
            }

            const deletedImage = await tx.image.update({
                where: { id: image.id },
                data: {
                    deletedAt: new Date(),
                    isPublic: false,
                },
            });

            await tx.outboxEvent.create({
                data: {
                    topic: normalizedTopic,
                    key: deletedImage.externalId,
                    eventType,
                    eventVersion: IMAGE_EVENT_VERSION,
                    payload: {
                        eventId: randomBytes(16).toString('hex'),
                        eventType,
                        eventVersion: IMAGE_EVENT_VERSION,
                        occurredAt: new Date().toISOString(),
                        data: {
                            topic: normalizedTopic,
                            externalId: deletedImage.externalId,
                            entityType: deletedImage.entityType,
                            entityId: deletedImage.entityId,
                            imageType: deletedImage.imageType,
                            title: deletedImage.title,
                            description: deletedImage.description,
                            deletedAt: deletedImage.deletedAt?.toISOString() ?? new Date().toISOString(),
                        },
                    },
                },
            });

            return this.toImageDto(deletedImage);
        });
    }

    async updateImageByExternalId(
        topic: string,
        externalId: string,
        dto: UpdateImageDto,
    ): Promise<ImageDto | null> {
        const normalizedTopic = (await this.getConfiguredTopicOrThrow(topic, 'updated')).topic;
        const normalizedExternalId = this.normalizeExternalId(externalId);
        const eventType = this.buildTopicEventType(normalizedTopic, 'updated');

        return this.prisma.$transaction(async (tx) => {
            const image = await tx.image.findFirst({
                where: {
                    topic: normalizedTopic,
                    externalId: normalizedExternalId,
                },
            });

            if (!image || image.deletedAt) {
                return null;
            }

            const updateData: { imageType?: string | null; title?: string | null; description?: string | null } = {};
            if (dto.imageType !== undefined) {
                updateData.imageType = this.normalizeOptionalField(dto.imageType);
            }
            if (dto.title !== undefined) {
                updateData.title = this.normalizeOptionalField(dto.title);
            }
            if (dto.description !== undefined) {
                updateData.description = this.normalizeOptionalField(dto.description);
            }

            const updatedImage = await tx.image.update({
                where: { id: image.id },
                data: updateData,
            });

            await tx.outboxEvent.create({
                data: {
                    topic: normalizedTopic,
                    key: updatedImage.externalId,
                    eventType,
                    eventVersion: IMAGE_EVENT_VERSION,
                    payload: {
                        eventId: randomBytes(16).toString('hex'),
                        eventType,
                        eventVersion: IMAGE_EVENT_VERSION,
                        occurredAt: new Date().toISOString(),
                        data: {
                            topic: normalizedTopic,
                            externalId: updatedImage.externalId,
                            entityType: updatedImage.entityType,
                            entityId: updatedImage.entityId,
                            previousImageType: image.imageType,
                            imageType: updatedImage.imageType,
                            previousTitle: image.title,
                            title: updatedImage.title,
                            previousDescription: image.description,
                            description: updatedImage.description,
                            updatedAt: updatedImage.updatedAt.toISOString(),
                        },
                    },
                },
            });

            return this.toImageDto(updatedImage);
        });
    }

    private buildTopicEventType(
        topic: string,
        operation: TopicEventOperation,
    ): string {
        return `${topic}.image.${operation}`;
    }

    private async getConfiguredTopicOrThrow(
        topic: string,
        operation?: TopicEventOperation,
    ): Promise<ImageTopic> {
        const normalizedTopic = this.normalizeTopic(topic);
        const configuredTopic = await this.prisma.imageTopic.findUnique({
            where: { topic: normalizedTopic },
        });

        if (!configuredTopic || !configuredTopic.isActive) {
            throw new NotFoundException(`Topic "${normalizedTopic}" is not configured`);
        }

        if (operation) {
            this.ensureOperationAllowed(configuredTopic, operation);
        }

        return configuredTopic;
    }

    private ensureOperationAllowed(topic: ImageTopic, operation: TopicEventOperation): void {
        const isAllowed =
            operation === 'uploaded'
                ? topic.allowUpload
                : operation === 'updated'
                  ? topic.allowUpdate
                  : topic.allowDelete;

        if (isAllowed) {
            return;
        }

        throw new ConflictException(
            `Topic "${topic.topic}" does not allow ${this.buildTopicEventType(topic.topic, operation)} events`,
        );
    }

    private normalizeTopic(topic: string): string {
        const normalized = topic?.trim();

        if (!normalized) {
            throw new BadRequestException('Topic is required');
        }

        if (!KAFKA_TOPIC_PATTERN.test(normalized)) {
            throw new BadRequestException(
                'Topic must contain only letters, numbers, dot, underscore or hyphen',
            );
        }

        return normalized;
    }

    private normalizeExternalId(externalId: string): string {
        const normalized = externalId?.trim();

        if (!normalized) {
            throw new BadRequestException('externalId is required');
        }

        return normalized;
    }

    private normalizeImageId(imageId: string): string {
        const normalized = imageId?.trim();

        if (!normalized) {
            throw new BadRequestException('id is required');
        }

        return normalized;
    }

    private normalizeRequiredField(value: string, fieldName: string): string {
        const normalized = value?.trim();
        if (!normalized) {
            throw new BadRequestException(`${fieldName} is required`);
        }

        return normalized;
    }

    private normalizeOptionalField(value?: string): string | null {
        const normalized = value?.trim();
        return normalized || null;
    }

    private toImageDto(image: Image): ImageDto {
        return {
            id: image.id,
            externalId: image.externalId,
            topic: image.topic,
            entityType: image.entityType,
            entityId: image.entityId,
            imageType: image.imageType,
            title: image.title,
            description: image.description,
            storage: image.storage,
            bucket: image.bucket,
            path: image.path,
            originalName: image.originalName,
            mimeType: image.mimeType,
            extension: image.extension,
            size: image.size,
            width: image.width,
            height: image.height,
            isPublic: image.isPublic,
            checksum: image.checksum,
            createdAt: image.createdAt,
            updatedAt: image.updatedAt,
            deletedAt: image.deletedAt,
        };
    }
}
