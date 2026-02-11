import { IsOptional, IsString } from 'class-validator';

export class UploadImageDto {
    @IsString()
    entityType: string;

    @IsString()
    entityId: string;

    @IsString()
    @IsOptional()
    imageType?: string;
}