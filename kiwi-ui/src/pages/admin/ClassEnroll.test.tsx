import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter, MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClassEnroll } from "./ClassEnroll.tsx";
import apiClient from "../../utils/api.ts";

// Mock the API client
vi.mock("../../utils/api.ts", () => ({
  default: {
    classControllerRoster: vi.fn(),
    classControllerGetPendingEnrollment: vi.fn(),
    classControllerEnroll: vi.fn(),
    classControllerDelete: vi.fn(),
    classControllerDeletePendingUsers: vi.fn(),
    classControllerGetById: vi.fn(),
  },
}));

// Fixtures are partial API responses, so the mocked client is loosely typed.
const mockApiClient = apiClient as any;

describe("ClassEnroll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockRosterResponse = {
    users: [
      { userId: "admin1", email: "admin1@example.com", role: "admin" },
      { userId: "prof1", email: "prof1@example.com", role: "professor" },
      { userId: "student1", email: "student1@example.com", role: "student" },
      { userId: "student2", email: "student2@example.com", role: "student" },
    ],
  };

  const mockPendingUsersResponse = {
    pendingUsers: [
      { id: "pending1", userEmail: "pending1@example.com", role: "student" },
      { id: "pending2", userEmail: "pending2@example.com", role: "professor" },
    ],
  };

  const renderWithRouter = (initialPath = "/admin/test-class-id/enroll", state = {}) => {
    return render(
      <MemoryRouter initialEntries={[{ pathname: initialPath, state }]}>
        <Routes>
          <Route path="/admin/:classID/enroll" element={<ClassEnroll />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it("renders without classID and shows error", () => {
    render(
      <MemoryRouter initialEntries={["/admin//enroll"]}>
        <Routes>
          <Route path="/admin//enroll" element={<ClassEnroll />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Error: Class ID not found")).toBeInTheDocument();
  });

  it("renders with classID from params", async () => {
    mockApiClient.classControllerRoster.mockResolvedValue(mockRosterResponse);
    mockApiClient.classControllerGetPendingEnrollment.mockResolvedValue(mockPendingUsersResponse);
    mockApiClient.classControllerGetById.mockResolvedValue({ className: "Test Class" });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Enroll Students")).toBeInTheDocument();
      expect(screen.getByText(/Managing enrollment for class:/)).toBeInTheDocument();
    });
  });

  it("renders with className from navigation state", async () => {
    mockApiClient.classControllerRoster.mockResolvedValue(mockRosterResponse);
    mockApiClient.classControllerGetPendingEnrollment.mockResolvedValue(mockPendingUsersResponse);
    mockApiClient.classControllerGetById.mockResolvedValue({ className: "Test Class Name" });

    renderWithRouter("/admin/test-class-id/enroll", { className: "Test Class Name" });

    await waitFor(() => {
      expect(screen.getByText("Test Class Name")).toBeInTheDocument();
    });
  });

  it("fetches and displays all users on mount", async () => {
    mockApiClient.classControllerRoster.mockResolvedValue(mockRosterResponse);
    mockApiClient.classControllerGetPendingEnrollment.mockResolvedValue(mockPendingUsersResponse);
    mockApiClient.classControllerGetById.mockResolvedValue({ className: "Test Class" });

    renderWithRouter();

    await waitFor(() => {
      expect(mockApiClient.classControllerRoster).toHaveBeenCalledWith({
        classRosterRequest: { classId: "test-class-id" },
      });
      expect(mockApiClient.classControllerGetPendingEnrollment).toHaveBeenCalledWith({
        classPendingEnrollmentRequest: { classId: "test-class-id" },
      });
    });

    // Check if all types of users are displayed in the unified table
    expect(screen.getByText("admin1@example.com")).toBeInTheDocument();
    expect(screen.getByText("prof1@example.com")).toBeInTheDocument();
    expect(screen.getByText("student1@example.com")).toBeInTheDocument();
    expect(screen.getByText("pending1@example.com")).toBeInTheDocument();
    expect(screen.getByText("pending2@example.com")).toBeInTheDocument();
  });

  it("displays role chips correctly", async () => {
    mockApiClient.classControllerRoster.mockResolvedValue(mockRosterResponse);
    mockApiClient.classControllerGetPendingEnrollment.mockResolvedValue(mockPendingUsersResponse);
    mockApiClient.classControllerGetById.mockResolvedValue({ className: "Test Class" });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("pending1@example.com")).toBeInTheDocument();
      expect(screen.getByText("pending2@example.com")).toBeInTheDocument();

      // Check for different role chips
      expect(screen.getByText("Admin")).toBeInTheDocument(); // admin1
      expect(screen.getAllByText("Professor").length).toBe(2); // prof1 and pending2
      expect(screen.getAllByText("Student").length).toBe(3); // student1, student2, pending1
    });
  });

  it("enrolls users when enroll button is clicked", async () => {
    mockApiClient.classControllerRoster.mockResolvedValue(mockRosterResponse);
    mockApiClient.classControllerGetPendingEnrollment.mockResolvedValue(mockPendingUsersResponse);
    mockApiClient.classControllerEnroll.mockResolvedValue({ success: true });
    mockApiClient.classControllerGetById.mockResolvedValue({ className: "Test Class" });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Enroll Students")).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText("Email Addresses (one per line) *");
    fireEvent.change(emailInput, { target: { value: "newuser1@example.com\nnewuser2@example.com" } });

    const enrollButton = screen.getByText("ENROLL USERS");
    fireEvent.click(enrollButton);

    await waitFor(() => {
      expect(mockApiClient.classControllerEnroll).toHaveBeenCalledWith({
        classEnrollRequest: {
          classId: "test-class-id",
          studentEmails: ["newuser1@example.com", "newuser2@example.com"],
        },
      });
    });
  });

  it("shows error message on enrollment failure", async () => {
    mockApiClient.classControllerRoster.mockResolvedValue(mockRosterResponse);
    mockApiClient.classControllerGetPendingEnrollment.mockResolvedValue(mockPendingUsersResponse);
    mockApiClient.classControllerEnroll.mockRejectedValue({
      message: "ConflictException: User already enrolled",
    });
    mockApiClient.classControllerGetById.mockResolvedValue({ className: "Test Class" });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Enroll Students")).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText("Email Addresses (one per line) *");
    fireEvent.change(emailInput, { target: { value: "existing@example.com" } });

    const enrollButton = screen.getByText("ENROLL USERS");
    fireEvent.click(enrollButton);

    await waitFor(() => {
      expect(screen.getByText("ConflictException: User already enrolled")).toBeInTheDocument();
    });
  });

  it("removes selected users", async () => {
    mockApiClient.classControllerRoster.mockResolvedValue(mockRosterResponse);
    mockApiClient.classControllerGetPendingEnrollment.mockResolvedValue(mockPendingUsersResponse);
    mockApiClient.classControllerDelete.mockResolvedValue({ success: true });
    mockApiClient.classControllerDeletePendingUsers.mockResolvedValue({ success: true });
    mockApiClient.classControllerGetById.mockResolvedValue({ className: "Test Class" });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("student1@example.com")).toBeInTheDocument();
    });

    // Find and click the checkbox for student1 (active user)
    const allCheckboxes = screen.getAllByRole("checkbox");
    const student1Checkbox = allCheckboxes.find(
      (checkbox) => checkbox.closest("tr")?.textContent?.includes("student1@example.com")
    );

    if (student1Checkbox) {
      fireEvent.click(student1Checkbox);
    }

    // Click the unified remove button
    const removeButton = screen.getByText(/Remove Selected/);
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(mockApiClient.classControllerDelete).toHaveBeenCalledWith({
        classEnrollDeleteRequest: {
          classId: "test-class-id",
          studentIds: ["student1"],
        },
      });
    });
  });

  it("removes pending users through unified interface", async () => {
    mockApiClient.classControllerRoster.mockResolvedValue(mockRosterResponse);
    mockApiClient.classControllerGetPendingEnrollment.mockResolvedValue(mockPendingUsersResponse);
    mockApiClient.classControllerDeletePendingUsers.mockResolvedValue({ success: true });
    mockApiClient.classControllerGetById.mockResolvedValue({ className: "Test Class" });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("pending1@example.com")).toBeInTheDocument();
    });

    // Find and click the checkbox for pending1
    const allCheckboxes = screen.getAllByRole("checkbox");
    const pending1Checkbox = allCheckboxes.find(
      (checkbox) => checkbox.closest("tr")?.textContent?.includes("pending1@example.com")
    );

    if (pending1Checkbox) {
      fireEvent.click(pending1Checkbox);
    }

    // Click the unified remove button
    const removeButton = screen.getByText(/Remove Selected/);
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(mockApiClient.classControllerDeletePendingUsers).toHaveBeenCalledWith({
        classDeletePendingEnrollmentRequest: {
          classId: "test-class-id",
          pendingUserIds: ["pending1"],
        },
      });
    });
  });

  it("handles select all functionality", async () => {
    mockApiClient.classControllerRoster.mockResolvedValue(mockRosterResponse);
    mockApiClient.classControllerGetPendingEnrollment.mockResolvedValue(mockPendingUsersResponse);
    mockApiClient.classControllerGetById.mockResolvedValue({ className: "Test Class" });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("student1@example.com")).toBeInTheDocument();
    });

    // Find the select all checkbox in the table header
    const allCheckboxes = screen.getAllByRole("checkbox");
    const selectAllCheckbox = allCheckboxes[0]; // First checkbox should be the select all

    fireEvent.click(selectAllCheckbox);

    // Verify that the remove button shows the correct count
    await waitFor(() => {
      const removeButton = screen.getByText(/Remove Selected \(6\)/);
      expect(removeButton).toBeInTheDocument();
    });
  });

  it("filters users based on search input", async () => {
    mockApiClient.classControllerRoster.mockResolvedValue(mockRosterResponse);
    mockApiClient.classControllerGetPendingEnrollment.mockResolvedValue(mockPendingUsersResponse);
    mockApiClient.classControllerGetById.mockResolvedValue({ className: "Test Class" });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("student1@example.com")).toBeInTheDocument();
      expect(screen.getByText("student2@example.com")).toBeInTheDocument();
    });

    // Find the unified search input (it has placeholder "Search users...")
    const searchInput = screen.getByPlaceholderText("Search users...");

    fireEvent.change(searchInput, { target: { value: "student1" } });

    // student1 should be visible, others should not
    await waitFor(() => {
      expect(screen.getByText("student1@example.com")).toBeInTheDocument();
      expect(screen.queryByText("student2@example.com")).not.toBeInTheDocument();
      expect(screen.queryByText("admin1@example.com")).not.toBeInTheDocument();
    });
  });

  it("handles pagination", async () => {
    // Create a large roster to test pagination
    const largeRoster = {
      users: Array.from({ length: 20 }, (_, i) => ({
        userId: `student${i}`,
        email: `student${i}@example.com`,
        role: "student",
      })),
    };

    mockApiClient.classControllerRoster.mockResolvedValue(largeRoster);
    mockApiClient.classControllerGetPendingEnrollment.mockResolvedValue({ pendingUsers: [] });
    mockApiClient.classControllerGetById.mockResolvedValue({ className: "Test Class" });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("student0@example.com")).toBeInTheDocument();
    });

    // First 15 should be visible (pageSize = 15)
    expect(screen.getByText("student14@example.com")).toBeInTheDocument();
    expect(screen.queryByText("student15@example.com")).not.toBeInTheDocument();

    // Click page 2 if pagination exists
    const paginationButtons = screen.queryAllByRole("button", { name: /Go to page 2/ });
    if (paginationButtons.length > 0) {
      fireEvent.click(paginationButtons[0]);

      // Now student15 should be visible
      await waitFor(() => {
        expect(screen.getByText("student15@example.com")).toBeInTheDocument();
      });
    }
  });
});