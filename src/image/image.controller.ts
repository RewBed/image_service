import { Controller, Post, UploadedFile, UseInterceptors, Body, Get, Param, Res, NotFoundException, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageService } from './image.service';
import { UploadImageDto } from './dto/upload.image.dto';
import express from 'express';
import * as fs from 'fs';
import { ImageDto } from './dto/image.dto';
import { ApiOkResponse } from '@nestjs/swagger';
import { GrpcAuthGuard } from 'src/common/guards/grpc-auth.guard';

@Controller('images')
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

    @Post('upload')
    @ApiOkResponse({ type: ImageDto })
    @UseGuards(GrpcAuthGuard)
    @UseInterceptors(FileInterceptor('file'))
    async upload(@UploadedFile() file: Express.Multer.File, @Body() body: UploadImageDto): Promise<ImageDto> {        
        return await this.imageService.uploadImage(file, body);
    }

    @Get(':externalId')
    async getByExternalId(@Param('externalId') externalId: string, @Res() res: express.Response) {
        const image = await this.imageService.getImageByExternalId(externalId);
        
        if(!image || !fs.existsSync(image.path))
            throw new NotFoundException('Image file not found');

        const webPath = await this.imageService.ensureWebVersion(image);
        const filePath = webPath ?? image.path;
        const stat = fs.statSync(filePath);

        res.setHeader('Content-Type', webPath ? 'image/webp' : image.mimeType);
        res.setHeader('Content-Length', stat.size.toString());

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    }
}
