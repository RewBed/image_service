import { Module } from '@nestjs/common';
import { ImageController } from './image.controller';
import { ImageService } from './image.service';
import { AuthGrpcClientModule } from 'src/common/auth';

@Module({
    imports: [AuthGrpcClientModule],
    controllers: [ImageController],
    providers: [ImageService, AuthGrpcClientModule],
})
export class ImageModule {}
