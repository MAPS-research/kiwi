import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  HttpException,
  Get,
  Param,
  Res,
  Session,
  Headers,
} from '@nestjs/common';
import { Readable } from 'stream';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiResponse,
} from '@nestjs/swagger';
import {
  UploadFileDto,
  streamStatusResponse,
  uploadResponseDto,
} from './dto/upload-file.dto';
import { AdminGuard } from 'src/auth/auth.guard';
import { Response } from 'express';

@Controller('storage')
export class StorageController {
  private competitionURL: string;

  constructor(
    private readonly storageService: StorageService,
    private readonly configService: ConfigService, // Inject ConfigService to access configuration
  ) {
    // Initialize competitionURL from configuration and remove trailing slash if present
    this.competitionURL = this.configService.get<string>(
      'COMPETITION_API_URL',
    )!;
    if (this.competitionURL.endsWith('/')) {
      this.competitionURL = this.competitionURL.slice(0, -1);
    }
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File upload',
    type: UploadFileDto,
  })
  @ApiResponse({
    status: 200,
    description: 'File uploaded successfully',
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('key') key: string,
  ) {
    return await this.storageService.uploadFile(file, key);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('read/:key')
  @ApiResponse({
    status: 200,
    description: 'File read successfully',
  })
  async readFile(@Param('key') key: string, @Res() res: Response) {
    const { buffer: fileBuffer } = await this.storageService.readFile(key);
    res.send(fileBuffer);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('signed-url/:key')
  @ApiResponse({
    status: 200,
    description: 'Signed URL generated successfully',
  })
  async getSignedUrl(@Param('key') key: string) {
    return await this.storageService.generateSignedUrl(key);
  }

  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearerAuth')
  @Post('stream-to-competition-server')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File upload',
    type: UploadFileDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Stream to competition server successfully',
  })
  async streamToCompetitionServer(
    @Session() session: Record<string, any>,
    @Headers() headers: Record<string, string>, // Access all headers
    @Body() uploadDto: UploadFileDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<uploadResponseDto> {
    const { key } = uploadDto;
    console.log('streamToCompetitionServer called', 'headers', headers);
    console.log('streamToCompetitionServer called', 'key', key);
    const estimated_content_length =
      headers['content-length'] || headers['Content-Length'] || '1024';
    if (!file) {
      console.log('No file uploaded');
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }
    if (!session.userId) {
      throw new HttpException(
        'User not authenticated',
        HttpStatus.UNAUTHORIZED,
      );
    }
    const userId = session.userId;
    const targetUrl = `${this.competitionURL}/upload_model/`;

    try {
      const fileStream = Readable.from(file.buffer); // Convert buffer to stream
      const result = await this.storageService.uploadStreamToServer(
        fileStream,
        targetUrl,
        userId,
        // {},
        // {
        // 'Content-Type': 'multipart/form-data',
        // 'connection': 'keep-alive',
        // 'content-length': '815412',
        // 'content-length': '815000',
        // },
        headers, // not used
        estimated_content_length,
        key,
      );

      return result;
    } catch (error) {
      throw new HttpException(
        `Failed to upload file: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearerAuth')
  @Post('stream-to-competition-server-status')
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'Stream to competition server successfully',
    type: streamStatusResponse,
  })
  async getStreamToCompetitionServerStatus(
    @Session() session: Record<string, any>,
    @Headers() headers: Record<string, string>,
  ): Promise<streamStatusResponse> {
    if (!session.userId) {
      throw new HttpException(
        'User not authenticated',
        HttpStatus.UNAUTHORIZED,
      );
    }
    const userId = session.userId;
    const targetUrl = `${this.competitionURL}/upload_status/`;
    const estimated_content_length =
      headers['content-length'] || headers['Content-Length'] || '1024';

    try {
      const result = await this.storageService.queryStreamUploadStatus(
        userId,
        targetUrl,
        // {},
        // {
        // 'Content-Type': 'multipart/form-data',
        // 'connection': 'keep-alive',
        // 'content-length': '815412',
        // 'content-length': '815000',
        // },
        headers, // not used
      );

      return {
        status: 'ok',
        message: 'ok',
        progress: parseInt(result.progress, 10),
        totalSize: parseInt(estimated_content_length),
        uploadedSize: 0,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to query stream status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
