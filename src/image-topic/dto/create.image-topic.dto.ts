import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const IMAGE_TOPIC_PATTERN = /^[a-zA-Z0-9._-]{1,150}$/;

export class CreateImageTopicDto {
    @ApiProperty({
        description: 'Kafka topic allowed for image operations',
        example: 'catalog_product',
    })
    @IsString()
    @Matches(IMAGE_TOPIC_PATTERN, {
        message: 'topic must contain only letters, numbers, dot, underscore or hyphen',
    })
    topic: string;

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
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiPropertyOptional({
        description: 'Allow upload operation and {topic}.image.uploaded event',
        example: true,
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    allowUpload?: boolean;

    @ApiPropertyOptional({
        description: 'Allow update operation and {topic}.image.updated event',
        example: true,
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    allowUpdate?: boolean;

    @ApiPropertyOptional({
        description: 'Allow delete operation and {topic}.image.deleted event',
        example: true,
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    allowDelete?: boolean;
}
