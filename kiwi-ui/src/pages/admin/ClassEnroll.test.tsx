import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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

  const mockLoadedRoster = (className = "Test Class") => {
    mockApiClient.classControllerRoster.mockResolvedValue(mockRosterResponse);
    mockApiClient.classControllerGetPendingEnrollment.mockResolvedValue(mockPendingUsersResponse);
    mockApiClient.classControllerGetById.mockResolvedValue({ className });
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

  const pageHeading = () => screen.getByRole("heading", { level: 1, name: "Enroll students" });

  it("renders without classID and shows error", () => {
    render(
      <MemoryRouter initialEntries={["/admin//enroll"]}>
        <Routes>
          <Route path="/admin//enroll" element={<ClassEnroll />} />
        </Routes>
      </MemoryRouter>
    );

    expect(
      screen.getByText("Couldn't open enrollment. The link has no class. Choose a class from the class switcher.")
    ).toBeInTheDocument();
  });

  it("renders with classID from params", async () => {
    mockLoadedRoster();

    renderWithRouter();

    await waitFor(() => {
      expect(pageHeading()).toBeInTheDocument();
      expect(screen.getByText(/Managing enrollment for class:/)).toBeInTheDocument();
      expect(screen.getByText("Test Class")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Add students, review pending enrollments, and manage the class roster.")
    ).toBeInTheDocument();
  });

  it("renders with className from navigation state", async () => {
    mockLoadedRoster("Test Class Name");

    renderWithRouter("/admin/test-class-id/enroll", { className: "Test Class Name" });

    await waitFor(() => {
      expect(screen.getByText("Test Class Name")).toBeInTheDocument();
    });
  });

  it("waits for the class name instead of showing the class id, and names an unnamed class", async () => {
    mockApiClient.classControllerRoster.mockResolvedValue(mockRosterResponse);
    mockApiClient.classControllerGetPendingEnrollment.mockResolvedValue(mockPendingUsersResponse);
    mockApiClient.classControllerGetById.mockResolvedValue({ className: "" });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Untitled class")).toBeInTheDocument();
    });
    expect(screen.queryByText("test-class-id")).not.toBeInTheDocument();
  });

  it("fetches and displays all users on mount", async () => {
    mockLoadedRoster();

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
    expect(await screen.findByText("admin1@example.com")).toBeInTheDocument();
    expect(screen.getByText("prof1@example.com")).toBeInTheDocument();
    expect(screen.getByText("student1@example.com")).toBeInTheDocument();
    expect(screen.getByText("pending1@example.com")).toBeInTheDocument();
    expect(screen.getByText("pending2@example.com")).toBeInTheDocument();
    expect(screen.getByText("Roster: 6 users (4 active, 2 pending)")).toBeInTheDocument();
  });

  it("reads an enrollment with the instructor role as Instructor, not Student", async () => {
    mockApiClient.classControllerRoster.mockResolvedValue({
      users: [{ userId: "inst1", email: "inst1@example.com", role: "instructor" }],
    });
    mockApiClient.classControllerGetPendingEnrollment.mockResolvedValue({ pendingUsers: [] });
    mockApiClient.classControllerGetById.mockResolvedValue({ className: "Test Class" });

    renderWithRouter();

    await waitFor(() => expect(screen.getByText("inst1@example.com")).toBeInTheDocument());
    expect(screen.getByText("Instructor")).toBeInTheDocument();
    expect(screen.queryByText("Student")).not.toBeInTheDocument();
  });

  it("shows neutral role chips and status chips with their words", async () => {
    mockLoadedRoster();

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("pending1@example.com")).toBeInTheDocument();
      expect(screen.getByText("pending2@example.com")).toBeInTheDocument();
    });

    // Role chips: one neutral chip per row, no colour per role; professors read "Instructor".
    expect(screen.getByText("Admin")).toBeInTheDocument(); // admin1
    expect(screen.getAllByText("Instructor").length).toBe(2); // prof1 and pending2
    expect(screen.getAllByText("Student").length).toBe(3); // student1, student2, pending1
    for (const label of ["Admin", "Instructor", "Student"]) {
      for (const chip of screen.getAllByText(label)) {
        expect(chip.closest(".MuiChip-root")).toHaveClass("MuiChip-colorDefault");
      }
    }

    // Status chips: "Active" success and "Pending" info, each with its shape icon.
    const active = screen.getAllByText("Active");
    const pending = screen.getAllByText("Pending");
    expect(active.length).toBe(4);
    expect(pending.length).toBe(2);
    expect(active[0].closest(".MuiChip-root")).toHaveClass("MuiChip-colorSuccess");
    expect(pending[0].closest(".MuiChip-root")).toHaveClass("MuiChip-colorInfo");
    expect(active[0].closest(".MuiChip-root")!.querySelector(".MuiChip-icon")).toBeInTheDocument();
  });

  it("names every row checkbox after its email, and the header checkbox", async () => {
    mockLoadedRoster();

    renderWithRouter();

    expect(await screen.findByRole("checkbox", { name: "Select student1@example.com" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select pending2@example.com" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select all rows" })).toBeInTheDocument();
  });

  it("enrolls users when enroll button is clicked", async () => {
    mockLoadedRoster();
    mockApiClient.classControllerEnroll.mockResolvedValue({ success: true });

    renderWithRouter();

    await waitFor(() => {
      expect(pageHeading()).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText("Email addresses");
    expect(
      screen.getByText("One address per line. Anyone without an account is added as pending.")
    ).toBeInTheDocument();
    fireEvent.change(emailInput, { target: { value: "newuser1@example.com\nnewuser2@example.com" } });

    fireEvent.click(screen.getByRole("button", { name: "Enroll students" }));

    await waitFor(() => {
      expect(mockApiClient.classControllerEnroll).toHaveBeenCalledWith({
        classEnrollRequest: {
          classId: "test-class-id",
          studentEmails: ["newuser1@example.com", "newuser2@example.com"],
        },
      });
    });
    expect(await screen.findByText("Added to the roster")).toBeInTheDocument();
  });

  it("asks for an address when the list is empty", async () => {
    mockLoadedRoster();

    renderWithRouter();

    await waitFor(() => {
      expect(pageHeading()).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Enroll students" }));

    expect(
      await screen.findByText("No email addresses entered. Enter at least one, one per line.")
    ).toBeInTheDocument();
    expect(mockApiClient.classControllerEnroll).not.toHaveBeenCalled();
  });

  it("shows error message on enrollment failure", async () => {
    mockLoadedRoster();
    mockApiClient.classControllerEnroll.mockRejectedValue({
      message: "ConflictException: User already enrolled",
    });

    renderWithRouter();

    await waitFor(() => {
      expect(pageHeading()).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText("Email addresses");
    fireEvent.change(emailInput, { target: { value: "existing@example.com" } });

    fireEvent.click(screen.getByRole("button", { name: "Enroll students" }));

    // The library's text with its developer prefix is never shown.
    expect(
      await screen.findByText(
        "Couldn't enroll some addresses. Some are already on the roster. Your changes are still in the form. Remove them from the list and try again."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("ConflictException: User already enrolled")).not.toBeInTheDocument();
    // The addresses stay in the form.
    expect(emailInput).toHaveValue("existing@example.com");
  });

  it("explains an unexpected enrollment failure", async () => {
    mockLoadedRoster();
    mockApiClient.classControllerEnroll.mockRejectedValue(new Error("Response returned an error code"));

    renderWithRouter();

    await waitFor(() => {
      expect(pageHeading()).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Email addresses"), { target: { value: "someone@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Enroll students" }));

    expect(
      await screen.findByText(
        "Couldn't enroll the addresses. The server didn't respond as expected. Your changes are still in the form. Check the addresses and try again."
      )
    ).toBeInTheDocument();
  });

  it("removes selected users", async () => {
    mockLoadedRoster();
    mockApiClient.classControllerDelete.mockResolvedValue({ success: true });
    mockApiClient.classControllerDeletePendingUsers.mockResolvedValue({ success: true });

    renderWithRouter();

    fireEvent.click(await screen.findByRole("checkbox", { name: "Select student1@example.com" }));

    // Click the unified remove button
    fireEvent.click(screen.getByRole("button", { name: /Remove selected \(1\)/ }));

    await waitFor(() => {
      expect(mockApiClient.classControllerDelete).toHaveBeenCalledWith({
        classEnrollDeleteRequest: {
          classId: "test-class-id",
          studentIds: ["student1"],
        },
      });
    });
    expect(await screen.findByText("1 user removed from the roster")).toBeInTheDocument();
    expect(screen.queryByText("student1@example.com")).not.toBeInTheDocument();
  });

  it("removes pending users through unified interface", async () => {
    mockLoadedRoster();
    mockApiClient.classControllerDeletePendingUsers.mockResolvedValue({ success: true });

    renderWithRouter();

    fireEvent.click(await screen.findByRole("checkbox", { name: "Select pending1@example.com" }));

    // Click the unified remove button
    fireEvent.click(screen.getByRole("button", { name: /Remove selected/ }));

    await waitFor(() => {
      expect(mockApiClient.classControllerDeletePendingUsers).toHaveBeenCalledWith({
        classDeletePendingEnrollmentRequest: {
          classId: "test-class-id",
          pendingUserIds: ["pending1"],
        },
      });
    });
  });

  it("keeps Remove selected focusable and says why it is unavailable while nothing is selected", async () => {
    mockLoadedRoster();

    renderWithRouter();

    await screen.findByText("student1@example.com");

    const removeButton = screen.getByRole("button", { name: /Remove selected \(0\)/ });
    const emailButton = screen.getByRole("button", { name: /Email selected \(0\)/ });
    expect(removeButton).toHaveAttribute("aria-disabled", "true");
    expect(removeButton).not.toBeDisabled();
    expect(emailButton).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(removeButton);
    expect(mockApiClient.classControllerDelete).not.toHaveBeenCalled();
    expect(mockApiClient.classControllerDeletePendingUsers).not.toHaveBeenCalled();

    fireEvent.mouseOver(removeButton);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Select users to remove.");
    expect(removeButton).toHaveAccessibleDescription("Select users to remove.");

    // Once something is selected the buttons are available again.
    fireEvent.click(screen.getByRole("checkbox", { name: "Select student1@example.com" }));
    expect(screen.getByRole("button", { name: /Remove selected \(1\)/ })).not.toHaveAttribute("aria-disabled");
    expect(screen.getByRole("button", { name: /Email selected \(1\)/ })).not.toHaveAttribute("aria-disabled");
  });

  it("handles select all functionality", async () => {
    mockLoadedRoster();

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("student1@example.com")).toBeInTheDocument();
    });

    const selectAll = screen.getByRole("checkbox", { name: "Select all rows" });
    fireEvent.click(selectAll);

    // Verify that the remove button shows the correct count
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Remove selected \(6\)/ })).toBeInTheDocument();
    });
    expect(selectAll).toBeChecked();

    // A second press clears the selection.
    fireEvent.click(selectAll);
    expect(screen.getByRole("button", { name: /Remove selected \(0\)/ })).toBeInTheDocument();
    expect(selectAll).not.toBeChecked();
  });

  it("shows the header checkbox as mixed while some rows are selected", async () => {
    mockLoadedRoster();

    renderWithRouter();

    fireEvent.click(await screen.findByRole("checkbox", { name: "Select student1@example.com" }));

    const selectAll = screen.getByRole("checkbox", { name: "Select all rows" });
    expect(selectAll).toHaveAttribute("aria-checked", "mixed");
    expect(screen.getByText("student1@example.com").closest("tr")).toHaveAttribute("aria-selected", "true");
  });

  it("filters users based on search input", async () => {
    mockLoadedRoster();

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("student1@example.com")).toBeInTheDocument();
      expect(screen.getByText("student2@example.com")).toBeInTheDocument();
    });

    const searchInput = screen.getByRole("textbox", { name: "Search by email" });
    expect(searchInput).toHaveAttribute("placeholder", "Search by email");

    fireEvent.change(searchInput, { target: { value: "student1" } });

    // student1 should be visible, others should not
    await waitFor(() => {
      expect(screen.getByText("student1@example.com")).toBeInTheDocument();
      expect(screen.queryByText("student2@example.com")).not.toBeInTheDocument();
      expect(screen.queryByText("admin1@example.com")).not.toBeInTheDocument();
    });
  });

  it("says what was searched when no one matches", async () => {
    mockLoadedRoster();

    renderWithRouter();

    await screen.findByText("student1@example.com");

    fireEvent.change(screen.getByRole("textbox", { name: "Search by email" }), {
      target: { value: "nobody" },
    });

    expect(
      await screen.findByRole("heading", { name: 'No one on the roster matches "nobody"' })
    ).toBeInTheDocument();
  });

  it("shows the empty roster frame once the roster has loaded with no one on it", async () => {
    mockApiClient.classControllerRoster.mockResolvedValue({ users: [] });
    mockApiClient.classControllerGetPendingEnrollment.mockResolvedValue({ pendingUsers: [] });
    mockApiClient.classControllerGetById.mockResolvedValue({ className: "Test Class" });

    renderWithRouter();

    expect(await screen.findByRole("heading", { name: "The roster is empty." })).toBeInTheDocument();
    expect(screen.getByText("Enter email addresses above to enroll students.")).toBeInTheDocument();
    expect(screen.getByText("Roster: 0 users (0 active, 0 pending)")).toBeInTheDocument();
  });

  it("holds the roster with skeleton rows while it loads, never the empty frame", async () => {
    mockApiClient.classControllerRoster.mockImplementation(() => new Promise(() => {}));
    mockApiClient.classControllerGetPendingEnrollment.mockResolvedValue({ pendingUsers: [] });
    mockApiClient.classControllerGetById.mockResolvedValue({ className: "Test Class" });

    renderWithRouter();

    await waitFor(() => {
      expect(pageHeading()).toBeInTheDocument();
    });
    expect(screen.getByRole("table", { name: "Class roster" })).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("The roster is empty.")).not.toBeInTheDocument();
  });

  it("states a roster that could not load in the table", async () => {
    mockApiClient.classControllerRoster.mockRejectedValue(new Error("Network"));
    mockApiClient.classControllerGetPendingEnrollment.mockResolvedValue({ pendingUsers: [] });
    mockApiClient.classControllerGetById.mockResolvedValue({ className: "Test Class" });

    renderWithRouter();

    expect(await screen.findByRole("heading", { name: "Couldn't load the roster" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The server didn't respond as expected. Reload the page to try again."
    );
    expect(screen.queryByText("The roster is empty.")).not.toBeInTheDocument();
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
    expect(screen.getByText("1–15 of 20")).toBeInTheDocument();

    // On the first page, the backward buttons stay focusable and say why they do nothing.
    const previous = screen.getByRole("button", { name: "Previous page" });
    expect(previous).toHaveAttribute("aria-disabled", "true");
    fireEvent.mouseOver(previous);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("This is the first page.");

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    // Now student15 should be visible
    await waitFor(() => {
      expect(screen.getByText("student15@example.com")).toBeInTheDocument();
    });
    expect(screen.getByText("16–20 of 20")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next page" })).toHaveAttribute("aria-disabled", "true");
    expect(within(screen.getByRole("table")).queryByText("student0@example.com")).not.toBeInTheDocument();
  });
});
