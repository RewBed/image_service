import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadImageDto {
    @ApiProperty({
        description: 'Domain entity type linked to image',
        example: 'catalog.product',
    })
    @IsString()
    entityType: string;

    @ApiProperty({
        description: 'Domain entity identifier',
        example: '123',
    })
    @IsString()
    entityId: string;

    @ApiProperty({
        description: 'Logical image type inside entity',
        required: false,
        example: 'main',
    })
    @IsString()
    @IsOptional()
    imageType?: string;

    @ApiProperty({
        description: 'Image title',
        required: false,
        example: 'Category banner',
    })
    @IsString()
    @IsOptional()
    title?: string;

    @ApiProperty({
        description: 'Image description',
        required: false,
        example: 'Hero banner for category page',
    })
    @IsString()
    @IsOptional()
    description?: string;
}
