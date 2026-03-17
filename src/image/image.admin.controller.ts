import {
    Body,
    Controller,
    Delete,
    Get,
    NotFoundException,
    Param,
    Patch,
    Post,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiBody,
    ApiConflictResponse,
    ApiConsumes,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { GrpcAuthGuard } from 'src/common/auth';
import { ImageService } from './image.service';
import { UploadImageDto } from './dto/upload.image.dto';
import { ImageDto } from './dto/image.dto';
import { UpdateImageDto } from './dto/update.image.dto';
import { GetImagesByIdsDto } from './dto/get-images-by-ids.dto';

@ApiTags('Image Admin')
@Controller('api/admin/images')
@ApiBearerAuth()
@UseGuards(GrpcAuthGuard)
export class ImageAdminController {
    constructor(private readonly imageService: ImageService) {}

    @Post('by-ids')
    @ApiOperation({
        summary: 'Get full image metadata by internal ids (admin)',
        description:
            'Accepts an array of internal image UUIDs and returns full metadata for each image in the same order. Deleted images are also returned if ids exist.',
    })
    @ApiBody({ type: GetImagesByIdsDto })
    @ApiOkResponse({
        type: ImageDto,
        isArray: true,
        description: 'Full image metadata for all requested ids',
    })
    @ApiBadRequestResponse({
        description: 'Invalid request body or one of ids has invalid UUID format',
    })
    @ApiNotFoundResponse({
        description: 'One or more images were not found by provided ids',
    })
    @ApiUnauthorizedResponse({ description: 'Valid Bearer token is required' })
    async getImagesByIds(@Body() body: GetImagesByIdsDto): Promise<ImageDto[]> {
        return this.imageService.getImagesByIds(body.ids);
    }

    @Post(':topic')
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({
        summary: 'Upload image to topic (admin)',
        description:
            'Uploads image to selected topic, stores image metadata, and writes outbox event {topic}.image.uploaded. Topic must be pre-registered in image topic registry.',
    })
    @ApiParam({
        name: 'topic',
        required: true,
        description: 'Kafka topic/domain context for image',
        example: 'catalog_product',
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            required: ['file', 'entityType', 'entityId'],
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Image file',
                },
                entityType: {
                    type: 'string',
                    description: 'Domain entity type',
                    example: 'catalog.product',
                },
                entityId: {
                    type: 'string',
                    description: 'Domain entity id',
                    example: '123',
                },
                imageType: {
                    type: 'string',
                    description: 'Image role/type in entity',
                    example: 'main',
                },
                title: {
                    type: 'string',
                    description: 'Image title',
                    example: 'Category banner',
                },
                description: {
                    type: 'string',
                    description: 'Image description',
                    example: 'Hero banner for category page',
                },
            },
        },
    })
    @ApiOkResponse({
        type: ImageDto,
        description: 'Full image metadata',
    })
    @ApiBadRequestResponse({
        description: 'Invalid topic, missing file, invalid mime type, or invalid body fields',
    })
    @ApiNotFoundResponse({ description: 'Topic is not configured in image topic registry' })
    @ApiConflictResponse({ description: 'Topic exists but upload event is disabled for it' })
    @ApiUnauthorizedResponse({ description: 'Valid Bearer token is required' })
    async upload(
        @Param('topic') topic: string,
        @UploadedFile() file: Express.Multer.File,
        @Body() body: UploadImageDto,
    ): Promise<ImageDto> {
        return this.imageService.uploadImage(topic, file, body);
    }

    @Get(':topic/:externalId')
    @ApiOperation({
        summary: 'Get image metadata by topic and externalId (admin)',
        description:
            'Returns full image metadata in selected topic. Topic must exist in image topic registry.',
    })
    @ApiParam({
        name: 'topic',
        type: String,
        required: true,
        description: 'Image topic',
        example: 'catalog_product',
    })
    @ApiParam({
        name: 'externalId',
        type: String,
        required: true,
        description: 'Image external id',
    })
    @ApiOkResponse({ type: ImageDto })
    @ApiNotFoundResponse({ description: 'Topic is not configured or image not found' })
    @ApiUnauthorizedResponse({ description: 'Valid Bearer token is required' })
    @ApiBadRequestResponse({ description: 'Invalid topic or externalId' })
    async getImageByExternalId(
        @Param('topic') topic: string,
        @Param('externalId') externalId: string,
    ): Promise<ImageDto> {
        const image = await this.imageService.getImageInfoByExternalId(topic, externalId);

        if (!image) {
            throw new NotFoundException('Image not found');
        }

        return image;
    }

    @Patch(':topic/:externalId')
    @ApiOperation({
        summary: 'Update image metadata by topic and externalId (admin)',
        description:
            'Updates image metadata (imageType/title/description) and creates outbox event {topic}.image.updated. Topic must be pre-registered in image topic registry.',
    })
    @ApiParam({
        name: 'topic',
        required: true,
        description: 'Image topic',
        example: 'catalog_product',
    })
    @ApiParam({
        name: 'externalId',
        required: true,
        description: 'Image external id',
    })
    @ApiOkResponse({
        type: ImageDto,
        description: 'Image metadata after update',
    })
    @ApiNotFoundResponse({ description: 'Topic is not configured or image not found' })
    @ApiConflictResponse({ description: 'Topic exists but update event is disabled for it' })
    @ApiUnauthorizedResponse({ description: 'Valid Bearer token is required' })
    @ApiBadRequestResponse({ description: 'Invalid topic, externalId, or request body' })
    async updateByExternalId(
        @Param('topic') topic: string,
        @Param('externalId') externalId: string,
        @Body() body: UpdateImageDto,
    ): Promise<ImageDto> {
        const image = await this.imageService.updateImageByExternalId(topic, externalId, body);

        if (!image) {
            throw new NotFoundException('Image not found');
        }

        return image;
    }

    @Delete(':topic/:externalId')
    @ApiOperation({
        summary: 'Soft-delete image by topic and externalId (admin)',
        description:
            'Marks image as deleted and creates outbox event {topic}.image.deleted. Topic must be pre-registered in image topic registry.',
    })
    @ApiParam({
        name: 'topic',
        required: true,
        description: 'Image topic',
        example: 'catalog_product',
    })
    @ApiParam({
        name: 'externalId',
        required: true,
        description: 'Image external id',
    })
    @ApiOkResponse({
        type: ImageDto,
        description: 'Image metadata after soft-delete',
    })
    @ApiNotFoundResponse({ description: 'Topic is not configured or image not found' })
    @ApiConflictResponse({ description: 'Topic exists but delete event is disabled for it' })
    @ApiUnauthorizedResponse({ description: 'Valid Bearer token is required' })
    @ApiBadRequestResponse({ description: 'Invalid topic or externalId' })
    async deleteByExternalId(
        @Param('topic') topic: string,
        @Param('externalId') externalId: string,
    ): Promise<ImageDto> {
        const image = await this.imageService.markImageDeleted(topic, externalId);

        if (!image) {
            throw new NotFoundException('Image not found');
        }

        return image;
    }
}
