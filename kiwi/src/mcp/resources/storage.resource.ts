import { Injectable, Logger, Scope } from '@nestjs/common';
import { Resource, Context, HttpRequest } from '@rekog/mcp-nest';
import { StorageService } from 'src/common/storage/storage.service';

/**
 * MCP Resources for Storage Operations
 * Provides access to documents with signed URLs
 */
@Injectable({ scope: Scope.REQUEST })
export class StorageResource {
  private readonly logger = new Logger(StorageResource.name);

  constructor(private readonly storageService: StorageService) {}

  /**
   * Get a document from storage with a signed URL
   * URI pattern: kiwi://storage/document/{key}
   */
  @Resource({
    name: 'storage-document',
    description:
      'Access a document from storage using its key. Returns a signed URL.',
    mimeType: 'application/json',
    uri: 'kiwi://storage/document/{key}',
  })
  async getStorageDocument(
    { uri }: { uri: string },
    context: Context,
    httpRequest: HttpRequest,
  ) {
    try {
      const userId = (httpRequest.raw as any)?.user?.sub;
      if (!userId) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'User not authenticated' }, null, 2),
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
