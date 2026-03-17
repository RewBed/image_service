import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImageDto {
    @ApiProperty({ description: 'Internal image record UUID' })
    id: string;

    @ApiProperty({ description: 'External image identifier' })
    externalId: string;

    @ApiProperty({
        description: 'Kafka topic where the image belongs',
        example: 'catalog_product',
    })
    topic: string;

    @ApiPropertyOptional({
        type: String,
        nullable: true,
        example: 'catalog.category',
        description: 'Domain entity type',
    })
    entityType: string | null;

    @ApiPropertyOptional({
        type: String,
        nullable: true,
        example: '42',
        description: 'Domain entity identifier',
    })
    entityId: string | null;

    @ApiPropertyOptional({
        type: String,
        nullable: true,
        example: 'main',
        description: 'Image role/type for entity',
    })
    imageType: string | null;

    @ApiPropertyOptional({
        type: String,
        nullable: true,
        example: 'Category banner',
        description: 'Image title',
    })
    title: string | null;

    @ApiPropertyOptional({
        type: String,
        nullable: true,
        example: 'Hero banner for category page',
        description: 'Image description',
    })
    description: string | null;

    @ApiProperty({
        description: 'Storage provider',
        enum: ['LOCAL', 'S3', 'MINIO'],
    })
    storage: string;

    @ApiPropertyOptional({
        type: String,
        nullable: true,
        example: null,
        description: 'Bucket name (for object storage)',
    })
    bucket: string | null;

    @ApiProperty({ description: 'Physical image path' })
    path: string;

    @ApiProperty({ description: 'Original uploaded filename' })
    originalName: string;

    @ApiProperty({ description: 'Original image MIME type' })
    mimeType: string;

    @ApiProperty({ description: 'Image file extension (without dot)' })
    extension: string;

    @ApiProperty({ description: 'Image size in bytes' })
    size: number;

    @ApiPropertyOptional({
        type: Number,
        nullable: true,
        example: 1280,
        description: 'Image width in pixels',
    })
    width: number | null;

    @ApiPropertyOptional({
        type: Number,
        nullable: true,
        example: 720,
        description: 'Image height in pixels',
    })
    height: number | null;

    @ApiProperty({ description: 'Public access flag' })
    isPublic: boolean;

    @ApiPropertyOptional({
        type: String,
        nullable: true,
        example: 'd41d8cd98f00b204e9800998ecf8427e',
        description: 'File checksum (md5)',
    })
    checksum: string | null;

    @ApiProperty({
        type: String,
        format: 'date-time',
        example: '2026-03-13T13:57:51.388Z',
        description: 'Created timestamp',
    })
    createdAt: Date;

    @ApiProperty({
        type: String,
        format: 'date-time',
        example: '2026-03-13T13:57:51.388Z',
        description: 'Updated timestamp',
    })
    updatedAt: Date;

    @ApiPropertyOptional({
        type: String,
        format: 'date-time',
        nullable: true,
        example: null,
        description: 'Soft-delete timestamp',
    })
    deletedAt: Date | null;
}
