import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { UserManagementView } from "../../src/pages/admin/UserManagement.tsx";
import type { UserDirectory } from "../../src/pages/admin/user-management/useUserDirectory.ts";
import type { UserEntry } from "../../src/pages/admin/user-management/lib.ts";

const INITIAL_USERS: UserEntry[] = [
  {
    id: "maya",
    email: "maya.chen@example.edu",
    systemRole: "instructor",
    oauth: true,
    consent: true,
    status: "enabled",
    isPending: false,
  },
  {
    id: "samir",
    email: "samir.patel@example.com",
    systemRole: "user",
    oauth: false,
    consent: true,
    status: "enabled",
    isPending: false,
  },
  {
    id: "admin",
    email: "admin@example.edu",
    systemRole: "admin",
    oauth: true,
    consent: true,
    status: "enabled",
    isPending: false,
  },
  {
    id: "disabled",
    email: "former.student@example.com",
    systemRole: "user",
    oauth: false,
    consent: false,
    status: "disabled",
    isPending: false,
  },
  {
    id: "pending-alex",
    email: "alex.invited@example.edu",
    systemRole: "user",
    oauth: true,
    consent: false,
    status: "enabled",
    isPending: true,
  },
  {
    id: "pending-jordan",
    email: "jordan.lee@example.com",
    systemRole: "user",
    oauth: false,
    consent: false,
    status: "disabled",
    isPending: true,
  },
];

const UserManagementFixture = () => {
  const [users, setUsers] = React.useState(INITIAL_USERS);
  const loadInstructorAssignments = React.useCallback(async (classId: string) =>
    classId === "cs101"
      ? [
          {
            userId: "maya",
            email: "maya.chen@example.edu",
            role: "instructor",
            permissions: { canManageMaterials: true, canViewAnalytics: true },
            assignedAt: new Date("2026-01-18"),
          },
        ]
      : [], []);

  const directory: UserDirectory = {
    users,
    isLoadingUsers: false,
    usersError: "",
    classes: [
      {
        id: "cs101",
        className: "Introduction to Computer Science",
        professorName: "Maya Chen",
        professorEmail: "maya.chen@example.edu",
        createdDate: new Date("2026-01-12"),
        professorId: "maya",
        description: "",
        imageSnippetUrl: "",
      },
      {
        id: "math201",
        className: "Discrete Mathematics",
        professorName: "Taylor Kim",
        professorEmail: "taylor.kim@example.edu",
        createdDate: new Date("2026-01-13"),
        professorId: "taylor",
        description: "",
        imageSnippetUrl: "",
      },
    ],
    isLoadingClasses: false,
    classesError: "",
    refetchUsers: async () => undefined,
    refetchClasses: async () => undefined,
    isActionPending: () => false,
    setAccess: async (entry, status) => {
      setUsers((current) => current.map((user) => user.id === entry.id ? { ...user, status } : user));
      return true;
    },
    changeRole: async (entry, role) => {
      setUsers((current) => current.map((user) => user.id === entry.id ? { ...user, systemRole: role } : user));
    },
    resetPassword: async () => undefined,
    addToWhitelist: async (emails) => {
      setUsers((current) => [
        ...current,
        ...emails.map((email) => ({
          id: `pending-${email}`,
          email,
          systemRole: "user",
          oauth: email.toLowerCase().endsWith("@example.edu"),
          consent: false,
          status: "enabled" as const,
          isPending: true,
        })),
      ]);
      return emails.map((email) => ({ email, status: "success" as const }));
    },
    registerUsers: async (emails, classId) =>
      emails.map((email) => ({
        email,
        classId,
        password: "Preview8!",
        status: "success" as const,
      })),
  };

  return (
    <UserManagementView
      directory={directory}
      loadInstructorAssignments={loadInstructorAssignments}
    />
  );
};

const meta = {
  title: "Guidelines/User Management",
  component: UserManagementFixture,
  parameters: {
    layout: "fullscreen",
    a11y: { test: "error" },
  },
} satisfies Meta<typeof UserManagementFixture>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Directory: Story = {};
