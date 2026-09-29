import { Test } from '@nestjs/testing';
import { DatabaseService } from 'src/common/database/database.service';
import { MaterialPermissionService } from './material-permission.service';

function mkDb(): any {
  return {
    user: { findUnique: jest.fn() },
    enrollment: { findFirst: jest.fn() },
    instructorClass: { findFirst: jest.fn() },
    classMaterial: { findUnique: jest.fn() },
    document: { findUnique: jest.fn() },
  };
}

const RELEASED = {
  classId: 'class-1',
  availableDate: new Date('2020-01-01'),
  lifecycle: 'PUBLISHED',
};

describe('MaterialPermissionService', () => {
  let service: MaterialPermissionService;
  let db: any;

  beforeEach(async () => {
    db = mkDb();
    const moduleRef = await Test.createTestingModule({
      providers: [
        MaterialPermissionService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();
    service = moduleRef.get(MaterialPermissionService);
  });

  describe('canManageClass', () => {
    it('lets an admin manage any class', async () => {
      db.user.findUnique.mockResolvedValueOnce({ systemRole: 'admin' });

      await expect(service.canManageClass('u1', 'class-1')).resolves.toBe(true);
    });

    it('lets a professor manage the class they teach', async () => {
      db.user.findUnique.mockResolvedValueOnce({ systemRole: 'professor' });
      db.enrollment.findFirst.mockResolvedValueOnce({ userId: 'u1' });

      await expect(service.canManageClass('u1', 'class-1')).resolves.toBe(true);
      expect(db.enrollment.findFirst).toHaveBeenCalledWith({
        where: { classId: 'class-1', userId: 'u1', role: 'professor' },
        select: { userId: true },
      });
    });

    it('does not let a professor of another class manage this one', async () => {
      // The regression this service exists for: the old guard asked whether the
      // user was a professor *anywhere*.
      db.user.findUnique.mockResolvedValueOnce({ systemRole: 'professor' });
      db.enrollment.findFirst.mockResolvedValueOnce(null);
      db.instructorClass.findFirst.mockResolvedValueOnce(null);

      await expect(service.canManageClass('u1', 'class-2')).resolves.toBe(
        false,
      );
    });

    it('honours canManageMaterials on the instructor row for this class', async () => {
      db.user.findUnique.mockResolvedValueOnce({ systemRole: 'instructor' });
      db.enrollment.findFirst.mockResolvedValueOnce(null);
      db.instructorClass.findFirst.mockResolvedValueOnce({
        permissions: { canManageMaterials: true },
      });

      await expect(service.canManageClass('u1', 'class-1')).resolves.toBe(true);
    });

    it('refuses an instructor whose row lacks the permission', async () => {
      db.user.findUnique.mockResolvedValueOnce({ systemRole: 'instructor' });
      db.enrollment.findFirst.mockResolvedValueOnce(null);
      db.instructorClass.findFirst.mockResolvedValueOnce({
        permissions: { canViewAnalytics: true },
      });

      await expect(service.canManageClass('u1', 'class-1')).resolves.toBe(
        false,
      );
    });

    it('refuses an unknown user', async () => {
      db.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.canManageClass('ghost', 'class-1')).resolves.toBe(
        false,
      );
    });
  });

  describe('canReadDocument', () => {
    const asStaff = () => {
      db.user.findUnique.mockResolvedValue({ systemRole: 'admin' });
    };
    const asStudent = () => {
      db.user.findUnique.mockResolvedValue({ systemRole: 'student' });
      db.enrollment.findFirst.mockResolvedValue(null);
      db.instructorClass.findFirst.mockResolvedValue(null);
    };

    it('lets staff read an answer key', async () => {
      db.document.findUnique.mockResolvedValueOnce({
        role: 'ANSWER',
        classMaterial: RELEASED,
      });
      asStaff();

      await expect(service.canReadDocument('u1', 'doc')).resolves.toBe(true);
    });

    it('lets an enrolled student read the student copy', async () => {
      db.document.findUnique.mockResolvedValueOnce({
        role: 'STUDENT',
        classMaterial: RELEASED,
      });
      asStudent();
      db.enrollment.findFirst
        .mockResolvedValueOnce(null) // professor check
        .mockResolvedValueOnce({ userId: 'u1' }); // enrolment check

      await expect(service.canReadDocument('u1', 'doc')).resolves.toBe(true);
    });

    it('refuses a student the answer key', async () => {
      db.document.findUnique.mockResolvedValueOnce({
        role: 'ANSWER',
        classMaterial: RELEASED,
      });
      asStudent();

      await expect(service.canReadDocument('u1', 'doc')).resolves.toBe(false);
    });

    it('refuses a student reference material', async () => {
      db.document.findUnique.mockResolvedValueOnce({
        role: 'REFERENCE',
        classMaterial: RELEASED,
      });
      asStudent();

      await expect(service.canReadDocument('u1', 'doc')).resolves.toBe(false);
    });

    it('refuses a student a material that is still scheduled', async () => {
      db.document.findUnique.mockResolvedValueOnce({
        role: 'STUDENT',
        classMaterial: {
          ...RELEASED,
          availableDate: new Date(Date.now() + 86_400_000),
        },
      });
      asStudent();

      await expect(service.canReadDocument('u1', 'doc')).resolves.toBe(false);
    });

    it('refuses a student an archived material', async () => {
      db.document.findUnique.mockResolvedValueOnce({
        role: 'STUDENT',
        classMaterial: { ...RELEASED, lifecycle: 'ARCHIVED' },
      });
      asStudent();

      await expect(service.canReadDocument('u1', 'doc')).resolves.toBe(false);
    });

    it('refuses someone who is not in the class', async () => {
      db.document.findUnique.mockResolvedValueOnce({
        role: 'STUDENT',
        classMaterial: RELEASED,
      });
      asStudent();
      db.enrollment.findFirst.mockResolvedValue(null);

      await expect(service.canReadDocument('outsider', 'doc')).resolves.toBe(
        false,
      );
    });

    it('restricts an unattached document to admins', async () => {
      db.document.findUnique.mockResolvedValueOnce({
        role: 'REFERENCE',
        classMaterial: null,
      });
      db.user.findUnique.mockResolvedValueOnce({ systemRole: 'student' });

      await expect(service.canReadDocument('u1', 'doc')).resolves.toBe(false);
    });

    it('refuses an unknown document', async () => {
      db.document.findUnique.mockResolvedValueOnce(null);

      await expect(service.canReadDocument('u1', 'ghost')).resolves.toBe(false);
    });
  });
});
