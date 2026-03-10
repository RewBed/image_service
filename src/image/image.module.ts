import { Module } from '@nestjs/common';
import { ImageController } from './image.controller';
import { ImageService } from './image.service';
import { AuthGrpcClientModule } from 'src/common/auth';
import { ImageAdminController } from './image.admin.controller';

@Module({
    imports: [AuthGrpcClientModule],
    controllers: [ImageController, ImageAdminController],
    providers: [ImageService, AuthGrpcClientModule],
})
export class ImageModule {}
