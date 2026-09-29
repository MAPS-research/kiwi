import { Request } from 'express';
import { Payload, Ctx } from '@nestjs/microservices';
import { Logger, Scope } from '@nestjs/common';
import {
  ResourceTemplate,
  McpContext as Context,
  McpController,
  McpRawRequest,
} from '@rekog/mcp-nest';
import { StorageService } from 'src/common/storage/storage.service';

/**
 * MCP Resources for Storage Operations
 * Provides access to documents with signed URLs
 */
@McpController({ scope: Scope.REQUEST })
export class StorageResource {
  private readonly logger = new Logger(StorageResource.name);

  constructor(private readonly storageService: StorageService) {}

  /**
   * Get a document from storage with a signed URL
   * URI pattern: kiwi://storage/document/{key}
   */
  @ResourceTemplate({
    name: 'storage-document',
    description:
      'Access a document from storage using its key. Returns a signed URL.',
    mimeType: 'application/json',
    uriTemplate: 'kiwi://storage/document/{key*}',
  })
  async getStorageDocument(
    @Payload() { uri }: { uri: string },
    @Ctx() context: Context,
    @McpRawRequest() httpRequest: Request,
  ) {
    try {
      const userId = (httpRequest as any)?.user?.sub;
      if (!userId) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                { error: 'User not authenticated' },
                null,
                2,
              ),
            },
          ],
        };
      }

      // Extract key from URI
      const match = uri.match(/^kiwi:\/\/storage\/document\/(.+)$/);
      if (!match) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Invalid URI format' }, null, 2),
            },
          ],
        };
      }

      const key = decodeURIComponent(match[1]);

      // Generate signed URL (cached for 4 hours)
      const signedUrl = await this.storageService.generateSignedUrl(key);

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                key,
                signedUrl,
                expiresIn: '4 hours',
                note: 'This URL will expire after 4 hours. It is cached for performance.',
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error getting storage document:', error);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ error: error.message }, null, 2),
          },
        ],
      };
    }
  }
}
