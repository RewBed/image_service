import { ApiProperty } from "@nestjs/swagger";

export class ImageDto {

    @ApiProperty()
    externalId: string;
}