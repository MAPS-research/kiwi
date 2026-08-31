import { describe, expect, it } from 'vitest';
import {
  ALL_CLASSES_SCOPE_ID,
  canRoleSeeAdminUI,
  getAdminAppPath,
  getAdminClassScopeRoute,
  getActiveAdminAppSlug,
  getVisibleClassScopeOptions,
  isAppEnabledForClass,
  parseAppAdminNavigation,
} from './adminNavigation.ts';

describe('admin UI scope visibility', () => {
  const classes = [
    { id: 'class-a', label: 'Class A' },
    { id: 'class-b', label: 'Class B' },
  ];

  it('adds the all-classes scope only for admins', () => {
    expect(getVisibleClassScopeOptions('admin', classes)[0]).toEqual({
      id: ALL_CLASSES_SCOPE_ID,
      label: 'All Classes',
      kind: 'admin-all-classes',
    });
    expect(getVisibleClassScopeOptions('instructor', classes)).toEqual(classes);
  });

  it('filters app surfaces using their declared UI roles', () => {
    expect(canRoleSeeAdminUI('admin', ['admin', 'instructor'])).toBe(true);
    expect(canRoleSeeAdminUI('instructor', ['admin'])).toBe(false);
    expect(canRoleSeeAdminUI('instructor', [])).toBe(true);
    expect(canRoleSeeAdminUI(null, ['admin'])).toBe(false);
  });

  it('detects whether the selected class has the app enabled', () => {
    const apps = [
      { slug: 'codegen', isEnabled: true },
      { slug: 'notes', isEnabled: false },
    ];

    expect(isAppEnabledForClass(apps, 'codegen')).toBe(true);
    expect(isAppEnabledForClass(apps, 'notes')).toBe(false);
    expect(isAppEnabledForClass(apps, 'missing')).toBe(false);
  });
});

describe('getActiveAdminAppSlug', () => {
  it('recognizes global and class-scoped admin app routes', () => {
    expect(getActiveAdminAppSlug('/admin/app/codegen')).toBe('codegen');
    expect(getActiveAdminAppSlug('/admin/app/codegen/details')).toBe('codegen');
    expect(getActiveAdminAppSlug('/admin/class/class-1/app/codegen')).toBe('codegen');
    expect(getActiveAdminAppSlug('/admin/class/class-1/edit-metadata')).toBeUndefined();
    expect(getActiveAdminAppSlug('/student/app/codegen')).toBeUndefined();
  });
});

describe('admin class scope routes', () => {
  it('reads class scope without changing either existing URL shape', () => {
    expect(getAdminClassScopeRoute('/admin/class/class%201/edit-metadata')).toEqual({
      classId: 'class 1',
      legacyClassSuffix: '/edit-metadata',
    });
    expect(getAdminClassScopeRoute('/admin/app/codegen/class/class%202')).toEqual({
      classId: 'class 2',
      legacyClassSuffix: '',
    });
    expect(getAdminClassScopeRoute('/admin/app/codegen')).toEqual({
      classId: undefined,
      legacyClassSuffix: '',
    });
  });

  it('builds global and class-scoped app paths using the existing route', () => {
    expect(getAdminAppPath('codegen')).toBe('/admin/app/codegen');
    expect(getAdminAppPath('codegen', 'class 1')).toBe(
      '/admin/app/codegen/class/class%201',
    );
  });
});

describe('parseAppAdminNavigation', () => {
  it('accepts a flat internal menu and its active route', () => {
    expect(
      parseAppAdminNavigation({
        items: [
          { id: 'sets', label: 'Exercise Sets', path: '/' },
          { id: 'upload', label: 'Upload Exercises', path: '/upload' },
        ],
        activePath: '/upload',
      }),
    ).toEqual({
      items: [
        { id: 'sets', label: 'Exercise Sets', path: '/' },
        { id: 'upload', label: 'Upload Exercises', path: '/upload' },
      ],
      activePath: '/upload',
    });
  });

  it('drops unsafe, duplicate, and malformed entries', () => {
    expect(
      parseAppAdminNavigation({
        items: [
          { id: 'upload', label: ' Upload ', path: '/upload' },
          { id: 'duplicate-id', label: 'Duplicate path', path: '/upload' },
          { id: 'upload', label: 'Duplicate id', path: '/another' },
          { id: 'external', label: 'External', path: 'https://example.com' },
          { id: 'protocol-relative', label: 'External', path: '//example.com' },
          { id: 42, label: 'Wrong type', path: '/wrong' },
        ],
        activePath: '/another',
      }),
    ).toEqual({
      items: [{ id: 'upload', label: 'Upload', path: '/upload' }],
      activePath: undefined,
    });
  });

  it('rejects payloads without at least one valid item', () => {
    expect(parseAppAdminNavigation(null)).toBeNull();
    expect(parseAppAdminNavigation({ items: [] })).toBeNull();
    expect(
      parseAppAdminNavigation({
        items: [{ id: 'external', label: 'External', path: 'https://example.com' }],
      }),
    ).toBeNull();
  });
});
