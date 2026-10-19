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

const openSwitcher = async (
  user: ReturnType<typeof userEvent.setup>,
  current = "Introduction to Computer Science",
) => {
  const toggle = screen.getByRole("button", { name: `Switch class. Current: ${current}` });
  await user.click(toggle);
  return toggle;
};

describe("ClassSwitcher", () => {
  it("is one button: the class icon, the current class and the unfold icon", () => {
    renderSwitcher();

    const toggle = screen.getByRole("button", {
      name: "Switch class. Current: Introduction to Computer Science",
    });
    const currentLabel = within(toggle).getByText("Introduction to Computer Science");
    expect(currentLabel).toHaveClass("MuiTypography-subtitle2");
    expect(currentLabel).toHaveAttribute("title", "Introduction to Computer Science");
    expect(within(toggle).getByTestId("SchoolOutlinedIcon")).toBeInTheDocument();
    expect(within(toggle).getByTestId("UnfoldMoreRoundedIcon")).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-haspopup", "listbox");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("opens from anywhere on the button, including its label", async () => {
    const user = userEvent.setup();
    renderSwitcher();

    await user.click(screen.getByText("Introduction to Computer Science"));
    expect(screen.getByRole("textbox", { name: "Search classes" })).toBeInTheDocument();
  });

  it("opens a popover sheet with the search field, the list and the create action", async () => {
    const user = userEvent.setup();
    renderSwitcher({ onCreateClass: vi.fn() });

    const toggle = await openSwitcher(user);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const popup = document.querySelector<HTMLElement>(".MuiPopover-paper");
    expect(popup?.style.transition).toMatch(/^opacity 50ms /);
    expect(popup?.style.transition).not.toContain("transform");
    expect(popup).toHaveStyle({ maxWidth: "360px" });
    expect(screen.getByRole("textbox", { name: "Search classes" })).toHaveAttribute(
      "placeholder",
      "Search classes",
    );
    expect(screen.getByRole("button", { name: "Create class" })).toBeInTheDocument();

    const selectedOption = screen.getByRole("option", {
      name: "Introduction to Computer Science",
    });
    expect(selectedOption).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("listbox", { name: "Classes" })).toHaveStyle({
      maxHeight: "360px",
      overflowY: "auto",
    });
    const selectedLabel = within(selectedOption).getByText("Introduction to Computer Science");
    expect(selectedLabel).toHaveClass("MuiTypography-body2");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("textbox", { name: "Search classes" }),
    ).not.toBeInTheDocument();
  });

  it("calls the create action and closes", async () => {
    const user = userEvent.setup();
    const onCreateClass = vi.fn();
    renderSwitcher({ onCreateClass });

    await openSwitcher(user);
    await user.click(screen.getByRole("button", { name: "Create class" }));

    expect(onCreateClass).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("listbox", { name: "Classes" })).not.toBeInTheDocument();
  });

  it("has no create action without the permission", async () => {
    const user = userEvent.setup();
    renderSwitcher();

    await openSwitcher(user);
    expect(screen.queryByRole("button", { name: "Create class" })).not.toBeInTheDocument();
  });

  it("filters and selects an option as a standalone component", async () => {
    const user = userEvent.setup();
    const onClassChange = vi.fn();
    renderSwitcher({ onClassChange });

    await openSwitcher(user);
    await user.type(
      screen.getByRole("textbox", { name: "Search classes" }),
      "Discrete",
    );
    await user.click(
      screen.getByRole("option", { name: "Discrete Mathematics" }),
    );

    expect(onClassChange).toHaveBeenCalledWith("math-201");
  });

  it("says when a search matches no class", async () => {
    const user = userEvent.setup();
    renderSwitcher();

    await openSwitcher(user);
    await user.type(screen.getByRole("textbox", { name: "Search classes" }), "  Zoology ");

    expect(screen.getByText('No classes match "Zoology"')).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("says there are no classes yet when the list is empty", async () => {
    const user = userEvent.setup();
    renderSwitcher({ options: [], selectedClassId: undefined });

    await openSwitcher(user, "Select a class");

    expect(screen.getByText("No classes yet")).toBeInTheDocument();
    expect(screen.queryByText("No classes found")).not.toBeInTheDocument();
  });

  it("shows a caller's empty label without inventing a selection", async () => {
    const user = userEvent.setup();
    renderSwitcher({
      options: [],
      selectedClassId: undefined,
      selectedClassLabel: "Select a class",
      emptyLabel: "No assigned classes",
    });

    await openSwitcher(user, "Select a class");

    expect(screen.getByText("No assigned classes")).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("states that the list is loading", async () => {
    const user = userEvent.setup();
    renderSwitcher({ optionsLoading: true });

    await openSwitcher(user);
    expect(screen.getByRole("status")).toHaveTextContent("Loading classes…");
  });

  it("marks the all-classes admin scope with a dedicated icon", async () => {
    const user = userEvent.setup();
    renderSwitcher({
      options: [
        {
          id: "__all_classes__",
          label: "All classes",
          kind: "admin-all-classes",
        },
        ...options,
      ],
      selectedClassId: "__all_classes__",
      selectedClassLabel: "All classes",
      selectedClassKind: "admin-all-classes",
    });

    const toggle = screen.getByRole("button", {
      name: "Switch class. Current: All classes",
    });
    expect(within(toggle).getByTestId("AdminPanelSettingsOutlinedIcon")).toBeInTheDocument();

    await user.click(toggle);

    const adminScopeOption = screen.getByRole("option", {
      name: "All classes, admin scope",
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
