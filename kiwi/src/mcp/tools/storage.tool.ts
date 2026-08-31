import { Injectable, Logger } from '@nestjs/common';
import { Tool, Context } from '@rekog/mcp-nest';
import { z } from 'zod';
import { Request } from 'express';
import { StorageService } from 'src/common/storage/storage.service';
import { UserService } from 'src/common/database/user.service';

/**
 * MCP Tools for Storage Operations
 * Allows AI assistants to upload documents and generate signed URLs
 */
@Injectable()
export class StorageTool {
  private readonly logger = new Logger(StorageTool.name);

  constructor(
    private readonly storageService: StorageService,
    private readonly userService: UserService,
  ) {}

  /**
   * Upload a document to storage
   * Requires admin role
   * File should be provided as base64-encoded data
   */
  @Tool({
    name: 'upload_document',
    description:
      'Upload a document to the storage system. File must be base64-encoded.',
    parameters: z.object({
      fileName: z
        .string()
        .describe('The name of the file including extension')
        .nonempty('File name is required'),
      fileData: z
        .string()
        .describe('Base64-encoded file data')
        .nonempty('File data is required'),
      mimeType: z
        .string()
        .describe('MIME type of the file (e.g., application/pdf, image/png)')
        .default('application/octet-stream'),
      storageKey: z
        .string()
        .optional()
        .describe(
          'Optional custom storage key. If not provided, fileName will be used.',
        ),
    }),
    annotations: {
      title: 'Upload Document',
      destructiveHint: false,
      readOnlyHint: false,
      idempotentHint: false,
    },
  })
  async uploadDocument(
    {
      fileName,
      fileData,
      mimeType,
      storageKey,
    }: {
      fileName: string;
      fileData: string;
      mimeType: string;
      storageKey?: string;
    },
    context: Context,
    request: Request,
  ) {
    try {
      // Get user ID and check permissions
      const userId = (request as any).user?.sub;
      if (!userId) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: User not authenticated',
            },
          ],
          isError: true,
        };
      }

      // Check if user is admin
      const user = await this.userService.user({ id: userId });
      if (user?.systemRole !== 'admin') {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: Insufficient permissions. Only admins can upload documents.',
            },
          ],
          isError: true,
        };
      }

      await context.reportProgress({ progress: 20, total: 100 });

      // Decode base64 file data
      let buffer: Buffer;
      try {
        buffer = Buffer.from(fileData, 'base64');
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: Invalid base64 file data',
            },
          ],
          isError: true,
        };
      }

      await context.reportProgress({ progress: 40, total: 100 });

      // Create a file object that matches Express.Multer.File interface
      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: fileName,
        encoding: '7bit',
        mimetype: mimeType,
        size: buffer.length,
        buffer: buffer,
        stream: null as any,
        destination: '',
        filename: fileName,
        path: '',
      };

      // Use provided key or default to fileName
      const key = storageKey || fileName;

      await context.reportProgress({ progress: 60, total: 100 });

      // Upload file
      const result = await this.storageService.uploadFile(file, key);

      await context.reportProgress({ progress: 80, total: 100 });

      // Generate signed URL for the uploaded file
      const signedUrl = await this.storageService.generateSignedUrl(key);

      await context.reportProgress({ progress: 100, total: 100 });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                message: result.message,
                key: result.key,
                fileName: fileName,
                size: buffer.length,
                mimeType: mimeType,
                signedUrl: signedUrl,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error uploading document:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error uploading document: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Get a signed URL for a document
   * Requires authentication
   */
  @Tool({
    name: 'get_document_signed_url',
    description:
      'Generate a temporary signed URL to access a document from storage',
    parameters: z.object({
      key: z
        .string()
        .describe('The storage key of the document')
        .nonempty('Storage key is required'),
    }),
    annotations: {
      title: 'Get Document Signed URL',
      destructiveHint: false,
      readOnlyHint: true,
      idempotentHint: true,
    },
  })
  async getDocumentSignedUrl(
    { key }: { key: string },
    context: Context,
    request: Request,
  ) {
    try {
      const userId = (request as any).user?.sub;
      if (!userId) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: User not authenticated',
            },
          ],
          isError: true,
        };
      }

      await context.reportProgress({ progress: 50, total: 100 });

      const signedUrl = await this.storageService.generateSignedUrl(key);

      await context.reportProgress({ progress: 100, total: 100 });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                key: key,
                signedUrl: signedUrl,
                expiresIn: '4 hours',
                note: 'This URL will expire after 4 hours',
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error generating signed URL:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error generating signed URL: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
}
