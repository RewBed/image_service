import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateImageDto {
    @ApiProperty({
        description: 'New logical image type',
        required: false,
        example: 'gallery',
    })
    @IsString()
    @IsOptional()
    imageType?: string;

    @ApiProperty({
        description: 'New image title',
        required: false,
        example: 'Updated category banner',
    })
    @IsString()
    @IsOptional()
    title?: string;

    @ApiProperty({
        description: 'New image description',
        required: false,
        example: 'Updated hero banner for category page',
    })
    @IsString()
    @IsOptional()
    description?: string;
}
