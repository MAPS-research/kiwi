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
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Param,
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
import { MaterialStaffListResponse } from './dto/material-staff-list.dto';
import { MaterialSummaryResponse } from './dto/material-summary.dto';
import {
  MaterialEditRequest,
  MaterialEditResponse,
} from './dto/material-edit-request.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import { ApiConsumes } from '@nestjs/swagger';
import { DocumentService } from 'src/document/document.service';
import {
  MaterialDocumentUploadDto,
  QueuedDocumentResponse,
} from 'src/document/dto/document-processing.dto';

@Controller('class/material')
export class MaterialController {
  private readonly logger = new Logger(MaterialController.name);

  constructor(
    private readonly materialService: MaterialService,
    private readonly documentService: DocumentService,
  ) {}

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
    const { classId, materialType, availableDate, title } = materialAddRequest;

    this.logger.debug(
      'Adding class material with classId',
      classId,
      'and materialType',
      materialType,
      'and availableDate',
      availableDate,
    );

    return await this.materialService.add(
      classId,
      materialType,
      availableDate,
      title,
    );
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
    const { materialId, materialType, availableDate, title } =
      materialEditRequest;

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
      title,
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

  /**
   * Upload a file into a material and start processing it.
   *
   * Replaces the six-round-trip sequence the admin pages drive by hand
   * (material/add, document/upload, document/chunk, poll chunk/status,
   * describe, embed). Returns as soon as the file is stored and the job is
   * queued; progress is on the document row, so closing the tab is harmless.
   */
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(JwtAuthGuard, MaterialManageGuard)
  @ApiBearerAuth('bearerAuth')
  @Post(':materialId/documents')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: MaterialDocumentUploadDto })
  @ApiResponse({
    status: 202,
    description: 'File stored and queued for processing',
    type: QueuedDocumentResponse,
  })
  async uploadDocument(
    @Param('materialId') materialId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: MaterialDocumentUploadDto,
  ) {
    this.logger.debug(
      'Uploading document to material',
      materialId,
      'with role',
      dto.role ?? '(positional default)',
    );

    return this.documentService.uploadDocumentToMaterial(
      file,
      materialId,
      dto.role,
    );
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, MaterialManageGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('summary')
  @ApiResponse({
    status: 200,
    description: 'Name of a material and its class',
    type: MaterialSummaryResponse,
  })
  async summary(@Query('materialID') materialID: string) {
    return await this.materialService.summary(materialID);
  }

  /**
   * Staff view of a class's materials — no availableDate gate, documents with
   * their roles and processing state. The student-facing list is a different
   * question and stays on `list`.
   */
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, MaterialManageGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('list/staff')
  @ApiBody({ type: MaterialListRequest })
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: MaterialStaffListResponse,
  })
  async listForStaff(@Body() materialListRequest: MaterialListRequest) {
    return await this.materialService.listForStaff(materialListRequest.classId);
  }

  /**
   * Staff-only: this returns every document of a material with signed URLs,
   * answer keys included. It was behind JwtAuthGuard alone, so any logged-in
   * user holding a material id could download the answers.
   */
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
