import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateImageDto {

    @ApiProperty()
    @IsString()
    @IsOptional()
    imageType?: string;
}
