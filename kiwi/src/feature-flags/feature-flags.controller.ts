import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Patch,
  Post,
  Query,
  Session,
  UseGuards,
} from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { AdminGuard, JwtAuthGuard, ProfGuard } from 'src/auth/auth.guard';
import { ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';
import {
  AddFeatureRequest,
  EditFeatureRequest,
  FeatureResponse,
} from './dto/feature.dto';

@Controller('feature-flags')
export class FeatureFlagsController {
  private readonly logger = new Logger(FeatureFlagsController.name);

  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('class/add')
  @ApiBody({ type: AddFeatureRequest })
  @ApiResponse({ status: 200, description: 'Feature added successfully' })
  async addClassFeature(@Body() addFeatureRequest: AddFeatureRequest) {
    return await this.featureFlagsService.addClassFeature(addFeatureRequest);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('user/add')
  @ApiBody({ type: AddFeatureRequest })
  @ApiResponse({ status: 200, description: 'Feature added successfully' })
  async addUserFeature(@Body() addFeatureRequest: AddFeatureRequest) {
    return await this.featureFlagsService.addUserFeature(addFeatureRequest);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(ProfGuard)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('class/list')
  @ApiResponse({
    status: 200,
    description: 'List of features for the class',
    type: [FeatureResponse],
  })
  async listClassFeatures(@Query('classId') classId: string) {
    return await this.featureFlagsService.listClassFeatures(classId);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('user/list')
  @ApiResponse({
    status: 200,
    description: 'List of features for a user',
    type: [FeatureResponse],
  })
  async listUserFeatures(@Query('userId') userId: string) {
    return await this.featureFlagsService.listUserFeatures(userId);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('me/list')
  @ApiResponse({
    status: 200,
    description: 'List of features for the current user',
    type: [FeatureResponse],
  })
  async listMyFeatures(@Session() session: { userId: string }) {
    return await this.featureFlagsService.listCurrentUserFeatures(
      session.userId,
    );
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('list')
  @ApiResponse({
    status: 200,
    description: 'List of all features',
    type: [FeatureResponse],
  })
  async listAllFeatures() {
    return await this.featureFlagsService.listAllFeatures();
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Patch('class/edit')
  @ApiBody({ type: EditFeatureRequest })
  @ApiResponse({ status: 200, description: 'Feature edited successfully' })
  async editClassFeature(@Body() editFeatureRequest: EditFeatureRequest) {
    return await this.featureFlagsService.editClassFeature(editFeatureRequest);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Patch('user/edit')
  @ApiBody({ type: EditFeatureRequest })
  @ApiResponse({ status: 200, description: 'Feature edited successfully' })
  async editUserFeature(@Body() editFeatureRequest: EditFeatureRequest) {
    return await this.featureFlagsService.editUserFeature(editFeatureRequest);
  }
}
