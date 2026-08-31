import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import theme from "../../Theme.ts";
import ClassSwitcher from "./ClassSwitcher.tsx";

const options = [
  { id: "cs-101", label: "Introduction to Computer Science" },
  { id: "math-201", label: "Discrete Mathematics" },
];

const renderSwitcher = (
  props: Partial<React.ComponentProps<typeof ClassSwitcher>> = {},
) =>
  render(
    <ThemeProvider theme={theme}>
      <ClassSwitcher
        options={options}
        selectedClassId="cs-101"
        onClassChange={vi.fn()}
        {...props}
      />
    </ThemeProvider>,
  );

describe("ClassSwitcher", () => {
  it("uses the Storybook typography variants without option badges", async () => {
    const user = userEvent.setup();
    renderSwitcher({ onCreateClass: vi.fn() });

    const currentLabel = screen.getByText("Introduction to Computer Science");
    expect(currentLabel).toHaveClass("MuiTypography-subtitle2");
    expect(currentLabel).toHaveStyle({
      fontSize: "0.875rem",
      lineHeight: "1.25rem",
    });
    expect(screen.getByTestId("SchoolOutlinedIcon")).toBeInTheDocument();

    await user.click(screen.getByText("Introduction to Computer Science"));
    expect(
      screen.queryByRole("textbox", { name: "Search classes" }),
    ).not.toBeInTheDocument();

    const toggle = screen.getByRole("button", {
      name: "Switch class scope. Current selection: Introduction to Computer Science",
    });
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const popup = document.querySelector<HTMLElement>(".MuiPopover-paper");
    expect(popup?.style.transition).toMatch(/^opacity 50ms /);
    expect(popup?.style.transition).not.toContain("transform");
    expect(popup).toHaveStyle({ maxWidth: "360px" });
    expect(screen.queryByText("Esc")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create New Class" }),
    ).toBeInTheDocument();

    const selectedOption = screen.getByRole("option", {
      name: "Introduction to Computer Science",
    });
    expect(screen.getByRole("listbox", { name: "Classes" })).toHaveStyle({
      maxHeight: "360px",
      overflowY: "auto",
    });
    const selectedLabel = within(selectedOption).getByText("Introduction to Computer Science");
    expect(selectedLabel).toHaveClass("MuiTypography-body2");
    expect(selectedLabel).toHaveStyle({
      fontSize: "0.875rem",
      lineHeight: "1.25rem",
    });
    expect(within(selectedOption).queryByText("I")).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("textbox", { name: "Search classes" }),
    ).not.toBeInTheDocument();
  });

  it("filters and selects an option as a standalone component", async () => {
    const user = userEvent.setup();
    const onClassChange = vi.fn();
    renderSwitcher({ onClassChange });

    await user.click(
      screen.getByRole("button", {
        name: "Switch class scope. Current selection: Introduction to Computer Science",
      }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Search classes" }),
      "Discrete",
    );
    await user.click(
      screen.getByRole("option", { name: "Discrete Mathematics" }),
    );

    expect(onClassChange).toHaveBeenCalledWith("math-201");
  });

  it("shows an assigned-class empty state without inventing a selection", async () => {
    const user = userEvent.setup();
    renderSwitcher({
      options: [],
      selectedClassId: undefined,
      selectedClassLabel: "Select a class",
      emptyLabel: "No assigned classes",
    });

    await user.click(
      screen.getByRole("button", {
        name: "Switch class scope. Current selection: Select a class",
      }),
    );

    expect(screen.getByText("No assigned classes")).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("marks the all-classes admin scope with a dedicated icon", async () => {
    const user = userEvent.setup();
    renderSwitcher({
      options: [
        {
          id: "__all_classes__",
          label: "All Classes",
          kind: "admin-all-classes",
        },
        ...options,
      ],
      selectedClassId: "__all_classes__",
      selectedClassLabel: "All Classes",
      selectedClassKind: "admin-all-classes",
    });

    expect(
      screen.getByTestId("AdminPanelSettingsOutlinedIcon"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Switch class scope. Current selection: All Classes",
      }),
    );

    const adminScopeOption = screen.getByRole("option", {
      name: "All Classes, admin scope",
    });
    expect(
      within(adminScopeOption).getByTestId("AdminPanelSettingsOutlinedIcon"),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("option", {
          name: "Introduction to Computer Science",
        }),
      ).queryByTestId("SchoolOutlinedIcon"),
    ).not.toBeInTheDocument();
  });
});
