import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class GetImagesByIdsDto {
    @ApiProperty({
        type: [String],
        description: 'Array of internal image UUIDs',
        example: [
            'd7af3686-6d6d-4fb7-9b25-33b1ef2257c2',
            'a80d92b7-f417-4294-b85d-74c134b8e6ec',
        ],
    })
    @IsArray()
    @ArrayMinSize(1)
    @IsUUID('4', { each: true })
    ids: string[];
}
