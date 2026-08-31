import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Session,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { DocumentService } from './document.service';
import {
  ApiBearerAuth,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiExtraModels,
} from '@nestjs/swagger';
import { AdminGuard, JwtAuthGuard } from 'src/auth/auth.guard';
import { MaterialManageGuard } from 'src/instructor-class/material-manage.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import {
  DocumentUploadDto,
  DocumentUploadResponse,
} from './dto/file-upload.dto';
import {
  ChunkDeleteRequest,
  ChunkEditRequest,
  ChunkEditResponse,
  ChunkQueueRequest,
  ChunkQueueResponse,
  ChunkRequest,
  ChunkResponse,
  ChunkStatusResponse,
} from './dto/chunk-request.dto';
import { QueryRequest, QueryResponse } from './dto/query-request.dto';
import { DescribeResponse } from './dto/describe-response.dto';
import {
  DocumentListResponse,
  GetDocumentResponse,
} from './dto/document-response.dto';
import { MigrateResponse } from './dto/migrate-response.dto';
import { DocumentDeleteRequestDto } from './dto/document-delete-request.dto';
import { SetDocumentFlagsDto } from './dto/set-document-flags.dto';
import {
  CreateDocumentCommentDto,
  DeleteDocumentCommentResponse,
  DocumentCommentListResponse,
  DocumentCommentResponse,
  UpdateDocumentCommentVisibilityDto,
} from './dto/document-comment.dto';
import {
  CreateDocumentSummaryDto,
  DeleteDocumentSummaryResponse,
  DocumentSummaryListResponse,
  DocumentSummaryResponse,
  UpdateDocumentSummaryDto,
} from './dto/document-summary.dto';

@Controller('document')
export class DocumentController {
  private readonly logger = new Logger(DocumentController.name);

  constructor(private readonly documentService: DocumentService) {}

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, MaterialManageGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: DocumentUploadDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: DocumentUploadResponse,
  })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() documentUploadDto: DocumentUploadDto,
  ) {
    const { classMaterialId } = documentUploadDto;
    return await this.documentService.uploadDocument(file, classMaterialId);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('uploadNoMaterialId')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: DocumentUploadDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: DocumentUploadResponse,
  })
  async uploadNoMaterialId(
    @UploadedFile() file: Express.Multer.File,
    // @Body() documentUploadDto: DocumentUploadDto,
  ) {
    return await this.documentService.uploadDocumentNoMaterialId(file);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('/material/id')
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: DocumentListResponse,
  })
  async getListByMaterialId(@Query('materialID') materialID: string) {
    throw new Error('Do not use this.');
    // return await this.documentService.getDocumentsByMaterialId(materialID);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, MaterialManageGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('chunk')
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: ChunkQueueResponse,
  })
  async chunk(@Body() chunkRequest: ChunkRequest) {
    const { id } = chunkRequest;

    return await this.documentService.chunkDocumentQueue(id);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, MaterialManageGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('chunk/status')
  @ApiExtraModels(ChunkResponse)
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: ChunkStatusResponse,
  })
  async chunkStatus(@Body() chunkQueueRequest: ChunkQueueRequest) {
    const { jobId } = chunkQueueRequest;

    return await this.documentService.chunkDocumentStatus(jobId);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, MaterialManageGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('chunk/add')
  @ApiResponse({
    status: 200,
    description: 'Chunk field successfully added',
    type: ChunkEditResponse,
  })
  async addChunkField(@Body() editChunkDto: ChunkEditRequest) {
    const { documentId, chunkId, fieldName, newValue } = editChunkDto;
    return this.documentService.addChunk(
      documentId,
      chunkId,
      fieldName,
      newValue,
    );
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, MaterialManageGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('chunk/edit')
  @ApiResponse({
    status: 200,
    description: 'Chunk field successfully edited',
    type: ChunkEditResponse,
  })
  async editChunkField(@Body() editChunkDto: ChunkEditRequest) {
    const { documentId, chunkId, fieldName, newValue } = editChunkDto;
    return this.documentService.editChunk(
      documentId,
      chunkId,
      fieldName,
      newValue,
    );
  }

  @Post('/chunk/delete')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, MaterialManageGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiResponse({
    status: 200,
    description: 'Chunk successfully deleted',
    type: ChunkEditResponse,
  })
  async deleteChunkViaPost(@Body() deleteChunkDto: ChunkDeleteRequest) {
    const { documentId, chunkId } = deleteChunkDto;
    return this.documentService.deleteChunk(documentId, chunkId);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, MaterialManageGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('describe')
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: DescribeResponse,
  })
  describe(@Body() chunkRequest: ChunkRequest) {
    const { id } = chunkRequest;

    return this.documentService.describeImageChunks(id);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, MaterialManageGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('embed')
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: DescribeResponse,
  })
  embed(@Body() chunkRequest: ChunkRequest) {
    const { id } = chunkRequest;

    return this.documentService.embedDocument(id);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('embed/remove')
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: DescribeResponse,
  })
  removeEmbed(@Body() chunkRequest: ChunkRequest) {
    const { id } = chunkRequest;

    return this.documentService.removeEmbeddings(id);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('query')
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: QueryResponse,
  })
  query(@Body() queryRequest: QueryRequest) {
    const { query, ids, pageNumber, n, materialId } = queryRequest;

    return this.documentService.queryDocument(
      query,
      ids,
      pageNumber,
      n,
      /* oMode */ undefined,
      materialId,
    );
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Post()
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: GetDocumentResponse,
  })
  retrieveDocument(@Body() chunkRequest: ChunkRequest) {
    const { id } = chunkRequest;

    return this.documentService.retrieveDocument(id);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('migrate')
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: MigrateResponse,
  })
  async migrateDocumentsToObjectStorage() {
    await this.documentService.migrateDocumentsToObjectStorage();
    return { message: 'Migration completed' };
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Delete('delete')
  @ApiBody({
    type: DocumentDeleteRequestDto,
  })
  @ApiResponse({
    status: 204,
    description: 'Document deleted successfully',
    type: DocumentDeleteRequestDto,
  })
  async delete(@Body() body: DocumentDeleteRequestDto) {
    const { documentId } = body;

    // optional debug logging (if using a logger)
    // this.logger.debug('Deleting document with documentId', documentId);

    await this.documentService.deleteDocument(documentId);

    return;
  }
  // for STUDENT or LLM flags
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, MaterialManageGuard)
  @ApiBearerAuth('bearerAuth')
  // @ApiOperation({ summary: 'Toggle isStudent / isLlm flags for a document' })
  // @ApiOkResponse({ description: 'Updated flags', type: GetDocumentResponse /* or a minimal inline shape */ })
  @Patch(':id/flags')
  async setFlags(@Param('id') id: string, @Body() dto: SetDocumentFlagsDto) {
    return this.documentService.setFlags(id, dto);
  }

  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, MaterialManageGuard)
  @ApiBearerAuth('bearerAuth')
  @Post(':id/comments')
  @ApiResponse({
    status: 201,
    description: 'Create a comment for a document',
    type: DocumentCommentResponse,
  })
  async createComment(
    @Param('id') documentId: string,
    @Body() dto: CreateDocumentCommentDto,
    @Session() session: { userId: string },
  ) {
    return this.documentService.createDocumentComment(
      documentId,
      session.userId,
      dto,
    );
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, MaterialManageGuard)
  @ApiBearerAuth('bearerAuth')
  @Get(':id/comments')
  @ApiResponse({
    status: 200,
    description: 'List comments for a document',
    type: DocumentCommentListResponse,
  })
  async listComments(
    @Param('id') documentId: string,
    @Session() session: { userId: string },
  ) {
    return this.documentService.listDocumentComments(documentId, session.userId);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, MaterialManageGuard)
  @ApiBearerAuth('bearerAuth')
  @Patch(':documentId/comments/:commentId')
  @ApiResponse({
    status: 200,
    description: 'Update comment visibility',
    type: DocumentCommentResponse,
  })
  async updateCommentVisibility(
    @Param('documentId') documentId: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateDocumentCommentVisibilityDto,
    @Session() session: { userId: string },
  ) {
    return this.documentService.updateDocumentCommentVisibility(
      documentId,
      commentId,
      session.userId,
      dto,
    );
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, MaterialManageGuard)
  @ApiBearerAuth('bearerAuth')
  @Delete(':documentId/comments/:commentId')
  @ApiResponse({
    status: 200,
    description: 'Delete a comment from a document',
    type: DeleteDocumentCommentResponse,
  })
  async deleteComment(
    @Param('documentId') documentId: string,
    @Param('commentId') commentId: string,
    @Session() session: { userId: string },
  ) {
    return this.documentService.deleteDocumentComment(
      documentId,
      commentId,
      session.userId,
    );
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Get(':id/comments/student')
  @ApiResponse({
    status: 200,
    description: 'List visible comments for students',
    type: DocumentCommentListResponse,
  })
  async listCommentsForStudent(
    @Param('id') documentId: string,
    @Session() session: { userId: string },
  ) {
    return this.documentService.listVisibleDocumentCommentsForStudent(
      documentId,
      session.userId,
    );
  }

  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, MaterialManageGuard)
  @ApiBearerAuth('bearerAuth')
  @Post(':id/summaries')
  @ApiResponse({
    status: 201,
    description: 'Create a summary for a document',
    type: DocumentSummaryResponse,
  })
  async createSummary(
    @Param('id') documentId: string,
    @Body() dto: CreateDocumentSummaryDto,
    @Session() session: { userId: string },
  ) {
    return this.documentService.createDocumentSummary(
      documentId,
      session.userId,
      dto,
    );
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, MaterialManageGuard)
  @ApiBearerAuth('bearerAuth')
  @Get(':id/summaries')
  @ApiResponse({
    status: 200,
    description: 'List summaries for a document',
    type: DocumentSummaryListResponse,
  })
  async listSummaries(
    @Param('id') documentId: string,
    @Session() session: { userId: string },
  ) {
    return this.documentService.listDocumentSummaries(documentId, session.userId);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, MaterialManageGuard)
  @ApiBearerAuth('bearerAuth')
  @Patch(':documentId/summaries/:summaryId')
  @ApiResponse({
    status: 200,
    description: 'Update document summary',
    type: DocumentSummaryResponse,
  })
  async updateSummary(
    @Param('documentId') documentId: string,
    @Param('summaryId') summaryId: string,
    @Body() dto: UpdateDocumentSummaryDto,
    @Session() session: { userId: string },
  ) {
    return this.documentService.updateDocumentSummary(
      documentId,
      summaryId,
      session.userId,
      dto,
    );
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, MaterialManageGuard)
  @ApiBearerAuth('bearerAuth')
  @Delete(':documentId/summaries/:summaryId')
  @ApiResponse({
    status: 200,
    description: 'Delete a summary from a document',
    type: DeleteDocumentSummaryResponse,
  })
  async deleteSummary(
    @Param('documentId') documentId: string,
    @Param('summaryId') summaryId: string,
    @Session() session: { userId: string },
  ) {
    return this.documentService.deleteDocumentSummary(
      documentId,
      summaryId,
      session.userId,
    );
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Get(':id/summaries/student')
  @ApiResponse({
    status: 200,
    description: 'List visible summaries for students',
    type: DocumentSummaryListResponse,
  })
  async listSummariesForStudent(
    @Param('id') documentId: string,
    @Session() session: { userId: string },
  ) {
    return this.documentService.listVisibleDocumentSummariesForStudent(
      documentId,
      session.userId,
    );
  }
}
