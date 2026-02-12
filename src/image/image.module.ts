import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { ImageController } from './image.controller';
import { ImageService } from './image.service';
import { GrpcAuthGuard } from 'src/common/guards/grpc-auth.guard';

@Module({
    imports: [
        ClientsModule.registerAsync([
            {
                name: 'AUTH_SERVICE_GRPC',
                inject: [ConfigService],
                useFactory: (configService: ConfigService) => ({
                    transport: Transport.GRPC,
                    options: {
                        url: configService.getOrThrow<string>('AUTH_GRPC_URL'),
                        package: 'auth',
                        protoPath: join(process.cwd(), 'grpc/proto/auth.proto'),
                        loader: {
                            keepCase: false,
                        },
                    },
                }),
            },
        ]),
    ],
    controllers: [ImageController],
    providers: [ImageService, GrpcAuthGuard],
})
export class ImageModule {}
