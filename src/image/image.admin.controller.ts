import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { GrpcAuthGuard } from 'src/common/auth';
import { AdminImageDetailsDto } from './dto/admin.image.details.dto';
import { ImageService } from './image.service';

@ApiTags('Image Admin')
@Controller('api/admin/images')
@UseGuards(GrpcAuthGuard)
export class ImageAdminController {
    constructor(private readonly imageService: ImageService) {}

    @Get(':externalId')
    @ApiOperation({ summary: 'Get full image details by externalId (admin)' })
    @ApiParam({ name: 'externalId', type: String, required: true })
    @ApiOkResponse({ type: AdminImageDetailsDto })
    @ApiNotFoundResponse({ description: 'Image not found' })
    async getImageByExternalId(@Param('externalId') externalId: string): Promise<AdminImageDetailsDto> {
        const image = await this.imageService.getImageForAdminByExternalId(externalId);

        if (!image) {
            throw new NotFoundException('Image not found');
        }

        return image;
    }
}
