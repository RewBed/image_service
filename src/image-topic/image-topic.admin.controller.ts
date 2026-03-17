import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { GrpcAuthGuard } from 'src/common/auth';
import { CreateImageTopicDto } from './dto/create.image-topic.dto';
import { ImageTopicDto } from './dto/image-topic.dto';
import { UpdateImageTopicDto } from './dto/update.image-topic.dto';
import { ImageTopicService } from './image-topic.service';

@ApiTags('Image Topic Admin')
@Controller('api/admin/image-topics')
@ApiBearerAuth()
@UseGuards(GrpcAuthGuard)
export class ImageTopicAdminController {
    constructor(private readonly imageTopicService: ImageTopicService) {}

    @Get()
    @ApiOperation({
        summary: 'List configured image topics',
        description:
            'Returns all topics registered in image service. Only active configured topics can be used in image upload, update and delete endpoints.',
    })
    @ApiOkResponse({
        type: ImageTopicDto,
        isArray: true,
        description: 'Configured image topics',
    })
    @ApiUnauthorizedResponse({ description: 'Valid Bearer token is required' })
    async findAll(): Promise<ImageTopicDto[]> {
        return this.imageTopicService.findAll();
    }

    @Post()
    @ApiOperation({
        summary: 'Register image topic',
        description:
            'Creates a topic registry record and defines which lifecycle events are allowed for this topic.',
    })
    @ApiCreatedResponse({
        type: ImageTopicDto,
        description: 'Topic successfully registered',
    })
    @ApiBadRequestResponse({ description: 'Invalid request body or topic format' })
    @ApiConflictResponse({ description: 'Topic already exists' })
    @ApiUnauthorizedResponse({ description: 'Valid Bearer token is required' })
    async create(@Body() body: CreateImageTopicDto): Promise<ImageTopicDto> {
        return this.imageTopicService.create(body);
    }

    @Get(':topic')
    @ApiOperation({
        summary: 'Get configured image topic',
        description: 'Returns topic configuration used by image upload service.',
    })
    @ApiParam({
        name: 'topic',
        required: true,
        description: 'Registered Kafka topic',
        example: 'catalog_product',
    })
    @ApiOkResponse({
        type: ImageTopicDto,
        description: 'Topic configuration',
    })
    @ApiBadRequestResponse({ description: 'Invalid topic format' })
    @ApiNotFoundResponse({ description: 'Topic is not configured' })
    @ApiUnauthorizedResponse({ description: 'Valid Bearer token is required' })
    async findOne(@Param('topic') topic: string): Promise<ImageTopicDto> {
        return this.imageTopicService.findOne(topic);
    }

    @Patch(':topic')
    @ApiOperation({
        summary: 'Update image topic configuration',
        description:
            'Updates topic flags and description. Disabled operations will be rejected by image endpoints with HTTP 409.',
    })
    @ApiParam({
        name: 'topic',
        required: true,
        description: 'Registered Kafka topic',
        example: 'catalog_product',
    })
    @ApiOkResponse({
        type: ImageTopicDto,
        description: 'Updated topic configuration',
    })
    @ApiBadRequestResponse({ description: 'Invalid topic format or request body' })
    @ApiNotFoundResponse({ description: 'Topic is not configured' })
    @ApiUnauthorizedResponse({ description: 'Valid Bearer token is required' })
    async update(
        @Param('topic') topic: string,
        @Body() body: UpdateImageTopicDto,
    ): Promise<ImageTopicDto> {
        return this.imageTopicService.update(topic, body);
    }
}
