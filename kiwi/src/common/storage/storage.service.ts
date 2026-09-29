import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  GetObjectCommandOutput,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import axios from 'axios';
import FormData from 'form-data';
import { RedisService } from 'src/common/redis/redis.service';

@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private readonly BUCKET_NAME;

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    // Self-hosted S3-compatible stores need the explicit endpoint and
    // path-style URLs. RustFS is the local default; `minio` stays accepted
    // because existing deployments' .env files still say so.
    const useLocalStorage = ['rustfs', 'minio'].includes(
      this.configService.get<string>('OSS_VENDOR') ?? '',
    );
    this.s3Client = new S3Client({
      region: this.configService.get<string>('OSS_REGION')!,
      endpoint: useLocalStorage
        ? this.configService.get<string>('OSS_ENDPOINT')!
        : undefined,
      credentials: {
        accessKeyId: this.configService.get<string>('OSS_ACCESS_KEY_ID')!,
        secretAccessKey: this.configService.get<string>(
          'OSS_ACCESS_KEY_SECRET',
        )!,
      },
      forcePathStyle: useLocalStorage,
    });

    this.BUCKET_NAME = this.configService.get<string>('OSS_BUCKET')!;
  }

  /**
   * Uploads a file to another server using streams.
   * @param fileStream - The incoming file stream.
   * @param targetUrl - The URL of the target server.
   * @param headers - Optional headers for the request.
   */
  async uploadStreamToServer(
    fileStream: Readable,
    targetUrl: string,
    userId: string,
    _headers: Record<string, string> = {},
    estimated_content_length: string,
    key: string,
  ): Promise<{ message: string; status: number }> {
    try {
      const form = new FormData();
      form.append('userId', userId);
      form.append('file0', fileStream);
      console.log('Uploading file to target server...');
      console.log('Target URL:', targetUrl);
      // console.log('Headers:', { ...headers, ...form.getHeaders() });
      console.log('Headers:', { ...form.getHeaders() });
      // console.log('Form Data Fields:', form.getBuffer().toString()); // Logs the raw form data

      const response = await axios.post(targetUrl, form, {
        headers: {
          // ...headers,
          ...form.getHeaders(),
          'estimated-content-length': estimated_content_length,
          key: key,
        },
        maxBodyLength: Infinity, // Allow large files
        maxContentLength: Infinity,
      });

      return {
        message: 'File uploaded successfully to the target server',
        status: response.status,
      };
    } catch (error) {
      throw new Error(
        `Failed to upload file to the target server: ${error.message}`,
      );
    }
  }

  async queryStreamUploadStatus(
    userId: string,
    targetUrl: string,
    _headers: Record<string, string> = {},
  ): Promise<{ progress: string; message: string }> {
    try {
      console.log('Querying upload status...', targetUrl, userId);

      // Send a GET request to the server with the upload ID
      const response = await axios.get(`${targetUrl}${userId}`, {
        // headers, // Include any additional headers
      });

      console.log('Upload status response:', response.data);

      return {
        progress: response.data.progress, // int for percentage
        message: 'not used', // Additional message from the server
      };
    } catch (error) {
      console.error('Error querying upload status:', error.message);
      throw new Error(
        `Failed to query upload status: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  async uploadFile(file: Express.Multer.File, key: string) {
    const params = {
      Bucket: this.BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    try {
      await this.s3Client.send(new PutObjectCommand(params));
      return { message: 'File uploaded successfully', key };
    } catch (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Remove an object. Deleting a Document row used to leave its file behind
   * forever — there was no delete path here at all — so every removed upload
   * stayed in the bucket.
   *
   * S3 delete is idempotent: removing a key that is already gone succeeds, so
   * a half-finished delete can simply be retried.
   */
  async deleteFile(key: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({ Bucket: this.BUCKET_NAME, Key: key }),
    );
  }

  async readFile(
    key: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const params = {
      Bucket: this.BUCKET_NAME,
      Key: key,
    };

    try {
      const command = new GetObjectCommand(params);
      const response: GetObjectCommandOutput =
        await this.s3Client.send(command);
      const stream = response.Body as Readable;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      const contentType = response.ContentType || 'application/octet-stream';
      return { buffer, contentType };
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  async generateSignedUrl(key: string): Promise<string> {
    const cacheKey = `signedUrl:${key}`;
    try {
      // Check if the signed URL is already in the cache
      const cachedUrl = await this.redisService.get(cacheKey);
      if (cachedUrl) {
        // this.redisService.set(cacheKey, cachedUrl, 3600 * 4); // don't refresh expiration, as the s3 singedUrl will expire
        return cachedUrl;
      }

      // Generate a new signed URL if not in cache
      const params = {
        Bucket: this.BUCKET_NAME,
        Key: key,
      };
      const command = new GetObjectCommand(params);
      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600 * 4 + 100, // 4 hours
      });

      // Store the signed URL in the cache with an expiration time
      await this.redisService.set(cacheKey, signedUrl, 3600 * 4); // 4 hours

      return signedUrl;
    } catch (error) {
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }
}
