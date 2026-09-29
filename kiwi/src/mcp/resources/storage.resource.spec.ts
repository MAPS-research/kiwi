import { Test, TestingModule } from '@nestjs/testing';
import { StorageResource } from './storage.resource';
import { StorageService } from 'src/common/storage/storage.service';

describe('StorageResource', () => {
  let resource: StorageResource;
  let storageService: jest.Mocked<StorageService>;

  const mockContext = {};

  const createMockHttpRequest = (userId?: string) => ({
    user: userId ? { sub: userId } : undefined,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageResource,
        {
          provide: StorageService,
          useValue: {
            generateSignedUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    resource = await module.resolve<StorageResource>(StorageResource);
    storageService = module.get(StorageService);
  });

  describe('getStorageDocument', () => {
    const documentKey = 'documents/lecture.pdf';
    const uri = `kiwi://storage/document/${documentKey}`;

    it('should deny access when user is not authenticated', async () => {
      const result = await resource.getStorageDocument(
        { uri },
        mockContext as any,
        createMockHttpRequest() as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toBe('User not authenticated');
    });

    it('should return error for invalid URI format', async () => {
      const invalidUri = 'kiwi://storage/invalid';

      const result = await resource.getStorageDocument(
        { uri: invalidUri },
        mockContext as any,
        createMockHttpRequest('user-123') as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toBe('Invalid URI format');
    });

    it('should return signed URL for valid document key', async () => {
      const userId = 'user-123';
      const signedUrl = 'https://storage.example.com/signed-url?token=abc123';

      storageService.generateSignedUrl.mockResolvedValue(signedUrl);

      const result = await resource.getStorageDocument(
        { uri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.key).toBe(documentKey);
      expect(content.signedUrl).toBe(signedUrl);
      expect(content.expiresIn).toBe('4 hours');
      expect(storageService.generateSignedUrl).toHaveBeenCalledWith(
        documentKey,
      );
    });

    it('should decode URI-encoded keys', async () => {
      const userId = 'user-123';
      const encodedKey = 'documents%2Fpath%20with%20spaces%2Ffile.pdf';
      const decodedKey = 'documents/path with spaces/file.pdf';
      const encodedUri = `kiwi://storage/document/${encodedKey}`;

      storageService.generateSignedUrl.mockResolvedValue(
        'https://storage.example.com/url',
      );

      const result = await resource.getStorageDocument(
        { uri: encodedUri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.key).toBe(decodedKey);
      expect(storageService.generateSignedUrl).toHaveBeenCalledWith(decodedKey);
    });

    it('should handle nested document paths', async () => {
      const userId = 'user-123';
      const nestedKey = 'classes/class-123/materials/lecture1.pdf';
      const nestedUri = `kiwi://storage/document/${nestedKey}`;

      storageService.generateSignedUrl.mockResolvedValue(
        'https://storage.example.com/nested-url',
      );

      const result = await resource.getStorageDocument(
        { uri: nestedUri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.key).toBe(nestedKey);
    });

    it('should handle storage service errors', async () => {
      const userId = 'user-123';

      storageService.generateSignedUrl.mockRejectedValue(
        new Error('Document not found in storage'),
      );

      const result = await resource.getStorageDocument(
        { uri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toBe('Document not found in storage');
    });

    it('should work for any authenticated user role', async () => {
      const studentId = 'student-123';

      storageService.generateSignedUrl.mockResolvedValue(
        'https://storage.example.com/student-url',
      );

      const result = await resource.getStorageDocument(
        { uri },
        mockContext as any,
        createMockHttpRequest(studentId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.signedUrl).toBe('https://storage.example.com/student-url');
      expect(content.error).toBeUndefined();
    });

    it('should handle special characters in document key', async () => {
      const userId = 'user-123';
      const specialKey = 'docs/file+name%40test.pdf';
      const decodedSpecialKey = 'docs/file+name@test.pdf';
      const specialUri = `kiwi://storage/document/${specialKey}`;

      storageService.generateSignedUrl.mockResolvedValue(
        'https://storage.example.com/special-url',
      );

      const result = await resource.getStorageDocument(
        { uri: specialUri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.key).toBe(decodedSpecialKey);
    });
  });
});
