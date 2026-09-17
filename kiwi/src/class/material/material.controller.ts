import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MaterialService } from './material.service';
import { ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/auth.guard';
import { MaterialManageGuard } from 'src/instructor-class/material-manage.guard';
import {
  MaterialAddRequest,
  MaterialAddResponse,
} from './dto/material-add-request.dto';
import {
  DocumentListResponse,
  MaterialListRequest,
  MaterialListResponse,
} from './dto/material-list-request.dto';
import { MaterialDeleteRequest } from './dto/material-delete-request.dto';
import {
  MaterialEditRequest,
  MaterialEditResponse,
} from './dto/material-edit-request.dto';

@Controller('class/material')
export class MaterialController {
  private readonly logger = new Logger(MaterialController.name);

  constructor(private readonly materialService: MaterialService) {}

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, MaterialManageGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('add')
  @ApiBody({
    type: MaterialAddRequest,
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: MaterialAddResponse,
  })
  async add(@Body() materialAddRequest: MaterialAddRequest) {
    const { classId, materialType, availableDate } = materialAddRequest;

    this.logger.debug(
      'Adding class material with classId',
      classId,
      'and materialType',
      materialType,
      'and availableDate',
      availableDate,
    );

    return await this.materialService.add(classId, materialType, availableDate);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, MaterialManageGuard)
  @ApiBearerAuth('bearerAuth')
  @Patch('edit')
  @ApiBody({
    type: MaterialEditRequest,
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: MaterialEditResponse,
  })
  async edit(@Body() materialEditRequest: MaterialEditRequest) {
    const { materialId, materialType, availableDate } = materialEditRequest;

    this.logger.debug(
      'Editing class material with materialId',
      materialId,
      'and materialType',
      materialType,
      'and availableDate',
      availableDate,
    );

    return await this.materialService.edit(
      materialId,
      materialType,
      availableDate,
    );
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, MaterialManageGuard)
  @ApiBearerAuth('bearerAuth')
  @Delete('delete')
  @ApiBody({
    type: MaterialDeleteRequest,
  })
  @ApiResponse({
    status: 204,
    description: 'Material deleted successfully',
  })
  async delete(@Body() materialDeleteRequest: MaterialDeleteRequest) {
    const { materialId } = materialDeleteRequest;

    this.logger.debug('Deleting class material with materialId', materialId);

    await this.materialService.delete(materialId);

    return;
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, MaterialManageGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('list')
  @ApiBody({
    type: MaterialListRequest,
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: MaterialListResponse,
  })
  async list(@Body() materialListRequest: MaterialListRequest) {
    const { classId } = materialListRequest;

    this.logger.debug('Listing class material with classId', classId);

    return await this.materialService.list(classId);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, MaterialManageGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('/list/id')
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: DocumentListResponse,
  })
  async getListByMaterialId(@Query('materialID') materialID: string) {
    return await this.materialService.listDocumentsByMaterialId(materialID);
  }
}
