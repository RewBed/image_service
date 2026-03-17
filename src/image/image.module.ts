import { Module } from '@nestjs/common';
import { ImageController } from './image.controller';
import { ImageService } from './image.service';
import { AuthGrpcClientModule } from 'src/common/auth';
import { ImageAdminController } from './image.admin.controller';
import { ImageTopicAdminController } from 'src/image-topic/image-topic.admin.controller';
import { ImageTopicService } from 'src/image-topic/image-topic.service';

@Module({
    imports: [AuthGrpcClientModule],
    controllers: [ImageController, ImageAdminController, ImageTopicAdminController],
    providers: [ImageService, ImageTopicService, AuthGrpcClientModule],
})
export class ImageModule {}
