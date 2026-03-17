import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImageTopicDto {
    @ApiProperty({ description: 'Internal topic registry UUID' })
    id: string;

    @ApiProperty({
        description: 'Kafka topic allowed for image operations',
        example: 'catalog_product',
    })
    topic: string;

    @ApiPropertyOptional({
        description: 'Optional human-readable description of topic purpose',
        example: 'Images for catalog products',
        nullable: true,
    })
    description: string | null;

    @ApiProperty({
        description: 'Whether topic can currently be used by image service',
        example: true,
    })
    isActive: boolean;

    @ApiProperty({
        description: 'Whether image upload can publish {topic}.image.uploaded',
        example: true,
    })
    allowUpload: boolean;

    @ApiProperty({
        description: 'Whether image update can publish {topic}.image.updated',
        example: true,
    })
    allowUpdate: boolean;

    @ApiProperty({
        description: 'Whether image delete can publish {topic}.image.deleted',
        example: true,
    })
    allowDelete: boolean;

    @ApiProperty({
        type: String,
        format: 'date-time',
        description: 'Registry record creation timestamp',
        example: '2026-03-17T09:10:00.000Z',
    })
    createdAt: Date;

    @ApiProperty({
        type: String,
        format: 'date-time',
        description: 'Registry record update timestamp',
        example: '2026-03-17T09:10:00.000Z',
    })
    updatedAt: Date;
}
