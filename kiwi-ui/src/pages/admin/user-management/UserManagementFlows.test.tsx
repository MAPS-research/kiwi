import * as React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClassInfoResponse } from "../../../services/models/ClassInfoResponse.ts";
import type { InstructorClassAssignmentInfo } from "../../../services/models/InstructorClassAssignmentInfo.ts";
import { AddUsersDialog } from "./AddUsersDialog.tsx";
import { InstructorsTab } from "./InstructorsTab.tsx";
import type { UserDirectory } from "./useUserDirectory.ts";

beforeEach(() => {
  vi.stubEnv("VITE_SSO_EMAIL_DOMAIN", "example.edu");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

const classes: ClassInfoResponse[] = [
  {
    id: "class-a",
    className: "Class A",
    professorName: "Professor A",
    professorEmail: "professor-a@example.com",
    createdDate: new Date("2025-01-01T00:00:00Z"),
    professorId: "professor-a",
    description: "",
    imageSnippetUrl: "",
  },
  {
    id: "class-b",
    className: "Class B",
    professorName: "Professor B",
    professorEmail: "professor-b@example.com",
    createdDate: new Date("2025-01-02T00:00:00Z"),
    professorId: "professor-b",
    description: "",
    imageSnippetUrl: "",
  },
];

const createDirectory = (overrides: Partial<UserDirectory> = {}): UserDirectory =>
  ({
    users: [
      {
        id: "instructor-1",
        email: "instructor@example.com",
        systemRole: "instructor",
        oauth: false,
        consent: true,
        status: "enabled",
        isPending: false,
      },
    ],
    isLoadingUsers: false,
    usersError: "",
    classes,
    isLoadingClasses: false,
    classesError: "",
    refetchUsers: vi.fn(async () => undefined),
    refetchClasses: vi.fn(async () => undefined),
    isActionPending: vi.fn(() => false),
    setAccess: vi.fn(async () => true),
    changeRole: vi.fn(async () => undefined),
    resetPassword: vi.fn(async () => undefined),
    addToWhitelist: vi.fn(async (emails: string[]) =>
      emails.map((email) => ({ email, status: "success" as const }))
    ),
    registerUsers: vi.fn(async (emails: string[], classId: string) =>
      emails.map((email) => ({
        email,
        password: "TestPass1!",
        classId,
        status: "success" as const,
      }))
    ),
    ...overrides,
  }) as UserDirectory;

describe("user-management flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(HTMLAnchorElement.prototype, "click", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:test-credentials"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("keeps whitelist and registration drafts independent", async () => {
    render(
      <AddUsersDialog open onOpenChange={vi.fn()} directory={createDirectory()} />
    );

    const whitelistInput = document.getElementById("whitelist-emails");
    expect(whitelistInput).toBeInTheDocument();
    fireEvent.change(whitelistInput!, { target: { value: "student@example.edu" } });

    fireEvent.click(screen.getByRole("tab", { name: "Register with password" }));
    const registerInput = document.getElementById("register-emails");
    expect(registerInput).toHaveValue("");
    fireEvent.change(registerInput!, { target: { value: "guest@example.com" } });

    fireEvent.click(screen.getByRole("tab", { name: "Whitelist" }));
    expect(document.getElementById("whitelist-emails")).toHaveValue("student@example.edu");

    fireEvent.click(screen.getByRole("tab", { name: "Register with password" }));
    expect(document.getElementById("register-emails")).toHaveValue("guest@example.com");
  });

  it("registers non-SSO users in a mixed batch and protects generated credentials", async () => {
    const onOpenChange = vi.fn();
    const directory = createDirectory();
    render(<AddUsersDialog open onOpenChange={onOpenChange} directory={directory} />);

    fireEvent.click(screen.getByRole("tab", { name: "Register with password" }));
    await waitFor(() =>
      expect(document.getElementById("registration-class")).toHaveTextContent("Class A")
    );
    fireEvent.change(document.getElementById("register-emails")!, {
      target: { value: "student@example.edu\nguest@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Register accounts" }));

    await waitFor(() =>
      expect(directory.registerUsers).toHaveBeenCalledWith(["guest@example.com"], "class-a")
    );
    expect(await screen.findByText("TestPass1!")).toBeVisible();
    expect(
      screen.getByText("Skipped: SSO accounts use Google sign-in and must be whitelisted instead.")
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Copy password for guest@example.com" })
    ).toBeEnabled();

    const dialog = screen.getByRole("dialog");
    const footer = dialog.querySelector('[data-slot="dialog-footer"]');
    expect(footer).not.toBeNull();
    fireEvent.click(within(footer as HTMLElement).getByRole("button", { name: "Close" }));
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Export the generated credentials before closing"
    );

    fireEvent.click(screen.getByRole("button", { name: "Export credentials CSV" }));
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    fireEvent.click(within(footer as HTMLElement).getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("preserves assignments from healthy classes when another class fails", async () => {
    const assignment: InstructorClassAssignmentInfo = {
      userId: "instructor-1",
      email: "instructor@example.com",
      role: "instructor",
      permissions: { canManageMaterials: true, canViewAnalytics: false },
      assignedAt: new Date("2025-02-01T00:00:00Z"),
    };
    const loadInstructorAssignments = vi.fn(async (classId: string) => {
      if (classId === "class-b") throw new Error("Class B unavailable");
      return [assignment];
    });

    render(
      <InstructorsTab
        directory={createDirectory()}
        loadInstructorAssignments={loadInstructorAssignments}
      />
    );

    expect(
      await screen.findByText(
        "Assignments could not be loaded for 1 class. Other classes remain available."
      )
    ).toBeVisible();
    expect(screen.getAllByText("instructor@example.com")).not.toHaveLength(0);
    expect(screen.getAllByText("Class A")).not.toHaveLength(0);
    expect(screen.getByRole("button", { name: "Assign instructor" })).toBeEnabled();
    expect(loadInstructorAssignments).toHaveBeenCalledTimes(2);
  });
});
