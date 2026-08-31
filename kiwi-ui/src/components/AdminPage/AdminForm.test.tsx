import { render, screen } from "@testing-library/react";
import { Button } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import theme from "../../Theme.ts";
import AdminFormActions from "./AdminFormActions.tsx";
import AdminFormSection from "./AdminFormSection.tsx";
import AdminFormSurface from "./AdminFormSurface.tsx";

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
  });

  it("gives each form section a semantic heading and description", () => {
    renderWithTheme(
      <AdminFormSection
        title="Basic information"
        description="Details visible to students."
      >
        Fields
      </AdminFormSection>,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Basic information" })).toBeInTheDocument();
    expect(screen.getByText("Details visible to students.")).toBeInTheDocument();
    expect(screen.getByText("Fields")).toBeInTheDocument();
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
});
