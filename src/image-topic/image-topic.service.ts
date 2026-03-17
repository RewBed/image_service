import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/core/database/prisma.service';
import { CreateImageTopicDto } from './dto/create.image-topic.dto';
import { ImageTopicDto } from './dto/image-topic.dto';
import { UpdateImageTopicDto } from './dto/update.image-topic.dto';

const IMAGE_TOPIC_PATTERN = /^[a-zA-Z0-9._-]{1,150}$/;

@Injectable()
export class ImageTopicService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(): Promise<ImageTopicDto[]> {
        const topics = await this.prisma.imageTopic.findMany({
            orderBy: { topic: 'asc' },
        });

        return topics.map((topic) => this.toDto(topic));
    }

    async findOne(topic: string): Promise<ImageTopicDto> {
        const normalizedTopic = this.normalizeTopic(topic);
        const imageTopic = await this.prisma.imageTopic.findUnique({
            where: { topic: normalizedTopic },
        });

        if (!imageTopic) {
            throw new NotFoundException(`Topic "${normalizedTopic}" is not configured`);
        }

        return this.toDto(imageTopic);
    }

    async create(dto: CreateImageTopicDto): Promise<ImageTopicDto> {
        const topic = this.normalizeTopic(dto.topic);

        try {
            const createdTopic = await this.prisma.imageTopic.create({
                data: {
                    topic,
                    description: this.normalizeOptionalText(dto.description),
                    isActive: dto.isActive ?? true,
                    allowUpload: dto.allowUpload ?? true,
                    allowUpdate: dto.allowUpdate ?? true,
                    allowDelete: dto.allowDelete ?? true,
                },
            });

            return this.toDto(createdTopic);
        } catch (error) {
            this.handlePrismaError(error, topic);
        }
    }

    async update(topic: string, dto: UpdateImageTopicDto): Promise<ImageTopicDto> {
        const normalizedTopic = this.normalizeTopic(topic);
        const existingTopic = await this.prisma.imageTopic.findUnique({
            where: { topic: normalizedTopic },
            select: { id: true },
        });

        if (!existingTopic) {
            throw new NotFoundException(`Topic "${normalizedTopic}" is not configured`);
        }

        const updatedTopic = await this.prisma.imageTopic.update({
            where: { topic: normalizedTopic },
            data: {
                ...(dto.description !== undefined
                    ? { description: this.normalizeOptionalText(dto.description) }
                    : {}),
                ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
                ...(dto.allowUpload !== undefined ? { allowUpload: dto.allowUpload } : {}),
                ...(dto.allowUpdate !== undefined ? { allowUpdate: dto.allowUpdate } : {}),
                ...(dto.allowDelete !== undefined ? { allowDelete: dto.allowDelete } : {}),
            },
        });

        return this.toDto(updatedTopic);
    }

    private normalizeTopic(topic: string): string {
        const normalized = topic?.trim();
        if (!normalized || !IMAGE_TOPIC_PATTERN.test(normalized)) {
            throw new BadRequestException(
                'topic must contain only letters, numbers, dot, underscore or hyphen',
            );
        }

        return normalized;
    }

    private normalizeOptionalText(value?: string): string | null {
        const normalized = value?.trim();
        return normalized || null;
    }

    private handlePrismaError(error: unknown, topic: string): never {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new ConflictException(`Topic "${topic}" already exists`);
        }

        throw error;
    }

    private toDto(topic: {
        id: string;
        topic: string;
        description: string | null;
        isActive: boolean;
        allowUpload: boolean;
        allowUpdate: boolean;
        allowDelete: boolean;
        createdAt: Date;
        updatedAt: Date;
    }): ImageTopicDto {
        return {
            id: topic.id,
            topic: topic.topic,
            description: topic.description,
            isActive: topic.isActive,
            allowUpload: topic.allowUpload,
            allowUpdate: topic.allowUpdate,
            allowDelete: topic.allowDelete,
            createdAt: topic.createdAt,
            updatedAt: topic.updatedAt,
        };
    }
}
