import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmailSelectedUsersDialog } from "./EmailSelectedUsersDialog.tsx";
import { emailApiClient } from "../../utils/api.ts";

vi.mock("../../utils/api.ts", () => ({
  default: {},
  emailApiClient: { emailControllerSendTemplatedEmail: vi.fn() },
}));

const sendTemplatedEmail = vi.mocked(emailApiClient.emailControllerSendTemplatedEmail);

const pending = [
  { id: "p1", email: "pending1@example.com", role: "student" as const, status: "pending" as const },
];
const active = [
  { id: "a1", email: "active1@example.com", role: "professor" as const, status: "active" as const },
  { id: "a2", email: "active2@example.com", role: "admin" as const, status: "active" as const },
];

const renderDialog = (selectedUsers = [...pending, ...active], handlers = {}) =>
  render(
    <EmailSelectedUsersDialog
      open
      onClose={vi.fn()}
      onSuccess={vi.fn()}
      selectedUsers={selectedUsers}
      classId="class-1"
      className="Statistics"
      {...handlers}
    />,
  );

describe("EmailSelectedUsersDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("names the dialog and counts the recipients with a real plural", () => {
    renderDialog();

    const dialog = screen.getByRole("dialog", { name: "Email selected users" });
    // Portalled out of the admin area, the dialog restates its compact density;
    // the announcement message inside it is a comfortable reading surface.
    expect(dialog.closest('[data-density="compact"]')).not.toBeNull();
    expect(
      screen.getByLabelText(/Announcement message/).closest('[data-density="comfortable"]'),
    ).not.toBeNull();
    expect(within(dialog).getByText("3 selected users")).toBeInTheDocument();
    expect(within(dialog).getByText("1 pending")).toBeInTheDocument();
    expect(within(dialog).getByText("2 active")).toBeInTheDocument();
  });

  it("writes each recipient's status and role as words, professors as instructors", () => {
    renderDialog();

    expect(screen.getAllByText("Pending").length).toBe(1);
    expect(screen.getAllByText("Active").length).toBe(2);
    expect(screen.getByText("Instructor")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Student")).toBeInTheDocument();
    expect(screen.queryByText("professor")).not.toBeInTheDocument();
  });

  it("explains a mixed selection and labels both previews", () => {
    renderDialog();

    expect(screen.getByText("Mixed selection")).toBeInTheDocument();
    expect(
      screen.getByText("Pending users get the welcome email. Active users get the announcement below."),
    ).toBeInTheDocument();
    expect(screen.getByText("Welcome email (for 1 pending user):")).toBeInTheDocument();
    expect(screen.getByText("Class announcement (for 2 active users):")).toBeInTheDocument();
    expect(screen.getByLabelText(/Announcement message/)).toHaveValue("You've been added to Statistics on Kiwi.");
    expect(screen.getByLabelText("Class name (for the subject line)")).toHaveAttribute("readonly");
    expect(
      screen.getByText('The subject will be "Class announcement: Statistics".'),
    ).toBeInTheDocument();
    expect(screen.getByTitle("Welcome email preview")).toBeInTheDocument();
    expect(screen.getByTitle("Announcement email preview")).toBeInTheDocument();
  });

  it("tells pending-only recipients that no message is needed", () => {
    renderDialog(pending);

    expect(screen.getByText("Welcome email")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Pending users get the standard welcome email with sign-in instructions. You don't need to write a message.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "HTML preview" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Plain text" })).toBeInTheDocument();
  });

  it("starts an announcement with the enrollment email's words", () => {
    renderDialog(active);

    expect(screen.getByLabelText(/Announcement message/)).toHaveValue(
      `You've been added to Statistics on Kiwi. It's already in your classes at ${window.location.origin}.`,
    );
  });

  it("shows Sending… while busy and states a failed send without the library's text", async () => {
    let rejectSend: (reason: unknown) => void = () => undefined;
    sendTemplatedEmail.mockImplementation(
      () => new Promise((_, reject) => {
        rejectSend = reject;
      }),
    );

    renderDialog(active);

    fireEvent.click(screen.getByRole("button", { name: "Send email" }));

    const busy = await screen.findByRole("button", { name: "Sending…" });
    expect(busy).toHaveAttribute("aria-busy", "true");

    rejectSend(new Error("Response returned an error code"));

    expect(
      await screen.findByText(
        "Couldn't send emails to active users. The server didn't respond as expected. Your changes are still in the form. Check the email audit before you send again.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Response returned an error code")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Send email" })).not.toHaveAttribute("aria-busy");
    });
  });
});
