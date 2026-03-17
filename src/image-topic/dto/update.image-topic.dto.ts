import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateImageTopicDto {
    @ApiPropertyOptional({
        description: 'Optional description of topic purpose',
        example: 'Images for catalog products',
    })
    @IsString()
    @IsOptional()
    @MaxLength(255)
    description?: string;

    @ApiPropertyOptional({
        description: 'Whether topic is active and available for use',
        example: true,
    })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiPropertyOptional({
        description: 'Allow upload operation and {topic}.image.uploaded event',
        example: true,
    })
    @IsBoolean()
    @IsOptional()
    allowUpload?: boolean;

    @ApiPropertyOptional({
        description: 'Allow update operation and {topic}.image.updated event',
        example: true,
    })
    @IsBoolean()
    @IsOptional()
    allowUpdate?: boolean;

    @ApiPropertyOptional({
        description: 'Allow delete operation and {topic}.image.deleted event',
        example: true,
    })
    @IsBoolean()
    @IsOptional()
    allowDelete?: boolean;
}
