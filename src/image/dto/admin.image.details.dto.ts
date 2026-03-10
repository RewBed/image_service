import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminImageDetailsDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    externalId: string;

    @ApiPropertyOptional({ nullable: true })
    entityType: string | null;

    @ApiPropertyOptional({ nullable: true })
    entityId: string | null;

    @ApiPropertyOptional({ nullable: true })
    imageType: string | null;

    @ApiProperty()
    storage: string;

    @ApiPropertyOptional({ nullable: true })
    bucket: string | null;

    @ApiProperty()
    path: string;

    @ApiProperty()
    originalName: string;

    @ApiProperty()
    mimeType: string;

    @ApiProperty()
    extension: string;

    @ApiProperty()
    size: number;

    @ApiPropertyOptional({ nullable: true })
    width: number | null;

    @ApiPropertyOptional({ nullable: true })
    height: number | null;

    @ApiProperty()
    isPublic: boolean;

    @ApiPropertyOptional({ nullable: true })
    checksum: string | null;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    @ApiPropertyOptional({ nullable: true })
    deletedAt: Date | null;
}
