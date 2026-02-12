import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/core/database/prisma.service';

import { createHash, randomBytes } from 'crypto';
import { extname, dirname, basename, join } from 'path';
import * as fs from 'fs';
import * as util from 'util';
import sharp from 'sharp';
import { UploadImageDto } from './dto/upload.image.dto';
import { ImageDto } from './dto/image.dto';
import { Image } from 'generated/prisma/client';

const writeFile = util.promisify(fs.writeFile);

@Injectable()
export class ImageService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) {}

    private readonly unsupportedWebMimeTypes = ['image/gif', 'image/svg+xml'];

    async getImageByExternalId(externalId: string): Promise<Image | null> {
        const image = await this.prisma.image.findUnique({
            where: { externalId },
        });

        if (!image || image.deletedAt) {
            return null;
        }

        return image;
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

    async uploadImage(file: Express.Multer.File, dto: UploadImageDto): Promise<ImageDto> {
        const { entityType, entityId, imageType } = dto;

        if (!file) {
            throw new Error('File is required');
        }

        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new Error('Only image files are allowed');
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

        const storageFolder = `./uploads/${entityType}/${entityId}`;
        if (!fs.existsSync(storageFolder)) {
            fs.mkdirSync(storageFolder, { recursive: true });
        }

        const fileName = `${externalId}.${extension}`;
        const filePath = `${storageFolder}/${fileName}`;
        await writeFile(filePath, file.buffer);

        const checksum = createHash('md5').update(file.buffer).digest('hex');
        const topic = this.configService.get<string>('KAFKA_TOPIC_IMAGE_UPLOADED', 'image.uploaded');

        const image = await this.prisma.$transaction(async (tx) => {
            const createdImage = await tx.image.create({
                data: {
                    externalId,
                    entityType,
                    entityId,
                    imageType,
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
                    topic,
                    key: createdImage.externalId,
                    eventType: 'image.uploaded',
                    eventVersion: 1,
                    payload: {
                        eventId: randomBytes(16).toString('hex'),
                        eventType: 'image.uploaded',
                        eventVersion: 1,
                        occurredAt: new Date().toISOString(),
                        data: {
                            externalId: createdImage.externalId,
                            entityType: createdImage.entityType,
                            entityId: createdImage.entityId,
                            imageType: createdImage.imageType,
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

        return {
            externalId: image.externalId,
        };
    }
}
