import { fireEvent, render, screen } from "@testing-library/react";
import { Button } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import theme from "../../Theme.ts";
import AdminFormActions from "./AdminFormActions.tsx";
import AdminFormSection from "./AdminFormSection.tsx";
import AdminFormSurface from "./AdminFormSurface.tsx";
import AdminPage from "./AdminPage.tsx";
import AdminPageHeader from "./AdminPageHeader.tsx";

const renderWithTheme = (element: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{element}</ThemeProvider>);

describe("Admin form patterns", () => {
  it("renders form surfaces as outlined Paper without elevation", () => {
    const { container } = renderWithTheme(
      <AdminFormSurface>Form content</AdminFormSurface>,
    );

    const surface = container.firstElementChild;
    expect(surface).toHaveClass("MuiPaper-root", "MuiPaper-outlined");
    expect(surface).toHaveTextContent("Form content");
    // A docked panel: the sheet radius and no shadow.
    expect(surface).toHaveStyle({ borderRadius: "var(--panel-radius)", boxShadow: "none" });
  });

  it("gives each form section a semantic heading and description, and names the section by it", () => {
    renderWithTheme(
      <AdminFormSection
        title="Basic information"
        description="Details visible to students."
      >
        Fields
      </AdminFormSection>,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Basic information" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Basic information" })).toBeInTheDocument();
    expect(screen.getByText("Details visible to students.")).toBeInTheDocument();
    expect(screen.getByText("Fields")).toBeInTheDocument();
  });

  it("divides sections with a hairline rule and token spacing", () => {
    renderWithTheme(
      <AdminFormSection title="Basic information">Fields</AdminFormSection>,
    );

    const section = screen.getByRole("region", { name: "Basic information" });
    const style = window.getComputedStyle(section);
    expect(style.borderBottom).toContain("var(--border-subtle)");
    expect(style.paddingTop).toBe("var(--space-5)");
    expect(style.rowGap).toBe("var(--space-3)");
    expect(style.columnGap).toBe("var(--space-6)");
  });

  it("renders primary and secondary actions in one action region", () => {
    renderWithTheme(
      <AdminFormActions>
        <Button variant="outlined">Cancel</Button>
        <Button variant="contained">Save changes</Button>
      </AdminFormActions>,
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });

  it("keeps a sticky action row docked: a rule, never a shadow", () => {
    const { container } = renderWithTheme(
      <AdminFormActions sticky>
        <Button variant="contained">Save changes</Button>
      </AdminFormActions>,
    );

    const row = container.firstElementChild!;
    expect(row).toHaveStyle({ position: "sticky", boxShadow: "none" });
    expect(window.getComputedStyle(row).borderTop).toContain("var(--border-subtle)");
  });
});

describe("Admin page frame", () => {
  it("renders the page title as the document's h1 in the page-title role", () => {
    renderWithTheme(
      <AdminPage>
        <AdminPageHeader title="Edit class" description="Update the class details." />
      </AdminPage>,
    );

    const title = screen.getByRole("heading", { level: 1, name: "Edit class" });
    expect(title).toHaveClass("MuiTypography-h2");
    expect(screen.getByText("Update the class details.")).toHaveStyle({ maxWidth: "720px" });
  });

  it("offers a back action named after its destination", () => {
    const onClick = vi.fn();
    renderWithTheme(
      <AdminPageHeader title="Experiment" back={{ label: "Experiments", onClick }} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Back to Experiments" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
