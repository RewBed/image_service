import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { ImageService } from './image.service';
import express from 'express';
import * as fs from 'fs';
import {
    ApiBadRequestResponse,
    ApiNotFoundResponse,
    ApiOperation,
    ApiParam,
    ApiProduces,
    ApiTags,
} from '@nestjs/swagger';

@ApiTags('Images')
@Controller('api/images')
export class ImageController {
    constructor(private readonly imageService: ImageService) {}

    @Get(':externalId')
    @ApiOperation({
        summary: 'Download image file by externalId',
        description:
            'Returns binary image file by externalId. If possible, serves generated web version (webp).',
    })
    @ApiParam({
        name: 'externalId',
        required: true,
        description: 'Image external identifier',
    })
    @ApiProduces('image/webp', 'image/jpeg', 'image/png', 'image/gif', 'image/svg+xml')
    @ApiNotFoundResponse({ description: 'Image file not found' })
    @ApiBadRequestResponse({ description: 'Invalid externalId' })
    async downloadByExternalId(
        @Param('externalId') externalId: string,
        @Res() res: express.Response,
    ) {
        const image = await this.imageService.getImageByExternalId(externalId);

        if (!image || !fs.existsSync(image.path)) {
            throw new NotFoundException('Image file not found');
        }

        const webPath = await this.imageService.ensureWebVersion(image);
        const filePath = webPath ?? image.path;
        const stat = fs.statSync(filePath);

        res.setHeader('Content-Type', webPath ? 'image/webp' : image.mimeType);
        res.setHeader('Content-Length', stat.size.toString());

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    }
}
