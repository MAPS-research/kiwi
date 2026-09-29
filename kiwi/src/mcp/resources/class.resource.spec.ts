import { Test, TestingModule } from '@nestjs/testing';
import { ClassResource } from './class.resource';
import { ClassService } from 'src/class/class.service';

describe('ClassResource', () => {
  let resource: ClassResource;
  let classService: jest.Mocked<ClassService>;

  const mockContext = {};

  const createMockHttpRequest = (userId?: string) => ({
    user: userId ? { sub: userId } : undefined,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassResource,
        {
          provide: ClassService,
          useValue: {
            getEnrollmentsPerUser: jest.fn(),
            getClassById: jest.fn(),
            getDocumentByClassId: jest.fn(),
          },
        },
      ],
    }).compile();

    resource = await module.resolve<ClassResource>(ClassResource);
    classService = module.get(ClassService);
  });

  describe('getClassesList', () => {
    const uri = 'kiwi://classes';

    it('should deny access when user is not authenticated', async () => {
      const result = await resource.getClassesList(
        { uri },
        mockContext as any,
        createMockHttpRequest() as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toBe('User not authenticated');
    });

    it('should return enrolled classes for authenticated user', async () => {
      const userId = 'user-123';

      classService.getEnrollmentsPerUser.mockResolvedValue([
        { classId: 'class-1', role: 'student' },
        { classId: 'class-2', role: 'professor' },
      ] as any);

      classService.getClassById
        .mockResolvedValueOnce({
          id: 'class-1',
          classMetadata: {
            name: 'Class One',
            description: 'First class',
            professorName: 'Dr. Smith',
          },
          professorId: 'prof-1',
          createdDate: '2024-01-01',
        } as any)
        .mockResolvedValueOnce({
          id: 'class-2',
          classMetadata: {
            name: 'Class Two',
            description: 'Second class',
            professorName: 'Dr. Jones',
          },
          professorId: 'prof-2',
          createdDate: '2024-02-01',
        } as any);

      const result = await resource.getClassesList(
        { uri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.totalClasses).toBe(2);
      expect(content.classes).toHaveLength(2);
      expect(content.classes[0].name).toBe('Class One');
      expect(content.classes[0].userRole).toBe('student');
      expect(content.classes[1].name).toBe('Class Two');
      expect(content.classes[1].userRole).toBe('professor');
    });

    it('should handle user with no enrollments', async () => {
      const userId = 'user-123';

      classService.getEnrollmentsPerUser.mockResolvedValue([]);

      const result = await resource.getClassesList(
        { uri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.totalClasses).toBe(0);
      expect(content.classes).toEqual([]);
    });

    it('should handle service errors gracefully', async () => {
      const userId = 'user-123';

      classService.getEnrollmentsPerUser.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await resource.getClassesList(
        { uri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toBe('Database error');
    });
  });

  describe('getClassDocuments', () => {
    const classId = 'class-123';
    const uri = `kiwi://class/${classId}/documents`;

    it('should deny access when user is not authenticated', async () => {
      const result = await resource.getClassDocuments(
        { uri },
        mockContext as any,
        createMockHttpRequest() as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toBe('User not authenticated');
    });

    it('should return error for invalid URI format', async () => {
      const invalidUri = 'kiwi://class/invalid';

      const result = await resource.getClassDocuments(
        { uri: invalidUri },
        mockContext as any,
        createMockHttpRequest('user-123') as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toBe('Invalid URI format');
    });

    it('should deny access to non-enrolled class', async () => {
      const userId = 'user-123';

      classService.getEnrollmentsPerUser.mockResolvedValue([
        { classId: 'different-class', role: 'student' },
      ] as any);

      const result = await resource.getClassDocuments(
        { uri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toBe('Access denied to class documents');
    });

    it('should return documents for enrolled class', async () => {
      const userId = 'user-123';

      classService.getEnrollmentsPerUser.mockResolvedValue([
        { classId, role: 'student' },
      ] as any);

      classService.getDocumentByClassId.mockResolvedValue({
        documents: [
          {
            id: 'doc-1',
            fileName: 'lecture1.pdf',
            file: 'https://example.com/lecture1.pdf',
            isStudent: false,
            isLlm: true,
            materialType: 'lecture',
          },
          {
            id: 'doc-2',
            fileName: 'assignment1.pdf',
            file: 'https://example.com/assignment1.pdf',
            isStudent: true,
            isLlm: false,
            materialType: 'assignment',
          },
        ],
      } as any);

      const result = await resource.getClassDocuments(
        { uri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.classId).toBe(classId);
      expect(content.totalDocuments).toBe(2);
      expect(content.documents).toHaveLength(2);
      expect(content.documents[0].fileName).toBe('lecture1.pdf');
      expect(content.documents[1].materialType).toBe('assignment');
    });

    it('should handle service errors gracefully', async () => {
      const userId = 'user-123';

      classService.getEnrollmentsPerUser.mockResolvedValue([
        { classId, role: 'student' },
      ] as any);

      classService.getDocumentByClassId.mockRejectedValue(
        new Error('Storage error'),
      );

      const result = await resource.getClassDocuments(
        { uri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toBe('Storage error');
    });
  });

  describe('getClassMaterials', () => {
    const classId = 'class-123';
    const uri = `kiwi://class/${classId}/materials`;

    it('should deny access when user is not authenticated', async () => {
      const result = await resource.getClassMaterials(
        { uri },
        mockContext as any,
        createMockHttpRequest() as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toBe('User not authenticated');
    });

    it('should return error for invalid URI format', async () => {
      const invalidUri = 'kiwi://class/invalid/path/extra';

      const result = await resource.getClassMaterials(
        { uri: invalidUri },
        mockContext as any,
        createMockHttpRequest('user-123') as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toBe('Invalid URI format');
    });

    it('should deny access to non-enrolled class', async () => {
      const userId = 'user-123';

      classService.getEnrollmentsPerUser.mockResolvedValue([
        { classId: 'different-class', role: 'student' },
      ] as any);

      const result = await resource.getClassMaterials(
        { uri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toBe('Access denied to class materials');
    });

    it('should return materials for enrolled class', async () => {
      const userId = 'user-123';

      classService.getEnrollmentsPerUser.mockResolvedValue([
        { classId, role: 'student' },
      ] as any);

      classService.getClassById.mockResolvedValue({
        id: classId,
        classMetadata: {
          name: 'Advanced Programming',
          description: 'Learn advanced techniques',
          professorName: 'Dr. Johnson',
        },
      } as any);

      classService.getDocumentByClassId.mockResolvedValue({
        documents: [
          {
            id: 'doc-1',
            fileName: 'syllabus.pdf',
            file: 'https://example.com/syllabus.pdf',
            isStudent: false,
            isLlm: true,
            materialType: 'syllabus',
          },
        ],
      } as any);

      const result = await resource.getClassMaterials(
        { uri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.classId).toBe(classId);
      expect(content.className).toBe('Advanced Programming');
      expect(content.description).toBe('Learn advanced techniques');
      expect(content.professorName).toBe('Dr. Johnson');
      expect(content.materials.totalCount).toBe(1);
      expect(content.materials.documents[0].fileName).toBe('syllabus.pdf');
    });

    it('should handle service errors gracefully', async () => {
      const userId = 'user-123';

      classService.getEnrollmentsPerUser.mockResolvedValue([
        { classId, role: 'student' },
      ] as any);

      classService.getClassById.mockRejectedValue(new Error('Class not found'));

      const result = await resource.getClassMaterials(
        { uri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toBe('Class not found');
    });
  });
});
