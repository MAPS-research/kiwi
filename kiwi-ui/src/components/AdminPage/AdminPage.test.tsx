import { fireEvent, render, screen } from "@testing-library/react";

import { Button } from "@/components/ui/button";
import AdminPage from "./AdminPage.tsx";
import AdminPageHeader from "./AdminPageHeader.tsx";

describe("AdminPage", () => {
  it("keeps the default admin content width and spacing contract", () => {
    const { container } = render(<AdminPage>Page content</AdminPage>);

    const page = container.firstElementChild;
    expect(page).toHaveAttribute("data-slot", "admin-page");
    expect(page).toHaveClass(
      "max-w-[1200px]",
      "px-4",
      "pt-4",
      "pb-8",
      "md:px-6",
      "md:pt-6",
    );
    expect(page).toHaveTextContent("Page content");
  });

  it("supports every existing maxWidth mode", () => {
    const { container, rerender } = render(
      <AdminPage maxWidth="md">Content</AdminPage>,
    );

    expect(container.firstElementChild).toHaveClass("max-w-[900px]");

    rerender(<AdminPage maxWidth={false}>Content</AdminPage>);
    expect(container.firstElementChild).toHaveClass("max-w-none");
  });

  it("forwards native div props and merges custom classes", () => {
    render(
      <AdminPage id="admin-content" className="bg-card">
        Content
      </AdminPage>,
    );

    expect(screen.getByText("Content")).toHaveAttribute("id", "admin-content");
    expect(screen.getByText("Content")).toHaveClass("bg-card");
  });
});

describe("AdminPageHeader", () => {
  it("renders its content with semantic shadcn slots", () => {
    render(
      <AdminPageHeader
        title="Class settings"
        description="Manage class access and integrations."
        status={<span>Active</span>}
        actions={<Button>Save changes</Button>}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Class settings" }),
    ).toHaveAttribute("data-slot", "admin-page-header-title");
    expect(
      screen.getByText("Manage class access and integrations."),
    ).toHaveAttribute("data-slot", "admin-page-header-description");
    expect(screen.getByText("Active").parentElement).toHaveAttribute(
      "data-slot",
      "admin-page-header-status",
    );
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });

  it("preserves the labeled back action", () => {
    const onClick = vi.fn();
    render(
      <AdminPageHeader
        title="Class settings"
        back={{ label: "Classes", onClick }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Back to Classes" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
