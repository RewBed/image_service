import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';

import { randomBytes } from 'crypto';
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
    constructor(private prisma: PrismaService) {}
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

        console.log(webPath);

        return webPath;
    }

    async uploadImage(file: Express.Multer.File, dto: UploadImageDto) : Promise<ImageDto> {
        const { entityType, entityId, imageType } = dto;

        if (!file) {
            throw new Error('File is required');
        }

        // Разрешённые MIME-типы изображений
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new Error('Only image files are allowed');
        }

        // Генерация безопасного внешнего ключа
        const externalId = randomBytes(36).toString('hex'); // 48 символов

        // Метаданные файла
        const extension = extname(file.originalname).replace('.', '').toLowerCase();
        const mimeType = file.mimetype;
        const size = file.size;

        // Получаем размеры изображения, если это картинка
        let width: number | null = null;
        let height: number | null = null;
        try {
        const metadata = await sharp(file.buffer).metadata();
            width = metadata.width ?? null;
            height = metadata.height ?? null;
        } catch (err) {
            // если не изображение, оставляем null
        }

        // Локальное хранилище
        const storageFolder = `./uploads/${entityType}/${entityId}`;
        if (!fs.existsSync(storageFolder)) fs.mkdirSync(storageFolder, { recursive: true });
        const fileName = `${externalId}.${extension}`;
        const filePath = `${storageFolder}/${fileName}`;
        await writeFile(filePath, file.buffer);

        // Вычисляем checksum (md5)
        const checksum = require('crypto').createHash('md5').update(file.buffer).digest('hex');

        // Создаем запись в базе
        const image = await this.prisma.image.create({
            data: {
                externalId,
                entityType,
                entityId,
                imageType,
                storage: 'LOCAL', // локальное хранение
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

        return {
            externalId: image.externalId
        };
    }
}

