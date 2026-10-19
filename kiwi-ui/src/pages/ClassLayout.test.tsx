import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { StudentClassLayout } from "./ClassLayout.tsx";

const api = vi.hoisted(() => ({
  getEnrolledClasses: vi.fn(),
  getClassById: vi.fn(),
  setSelectedClass: vi.fn(),
  getClassApps: vi.fn(),
}));

vi.mock("../utils/api.ts", () => ({
  default: {
    studentControllerGetEnrolledClassesInfoByStudentId: api.getEnrolledClasses,
    classControllerGetById: api.getClassById,
    classControllerSetSelectedClass: api.setSelectedClass,
  },
  classAppsApiClient: {
    classKiwiAppControllerGetClassApps: api.getClassApps,
  },
}));

// The top bar is another region (SR-1): record the props the layout passes.
const topNavProps = vi.hoisted(() => ({ current: {} as Record<string, any> }));
vi.mock("../components/TopNav/TopNav.tsx", () => ({
  default: (props: Record<string, any>) => {
    topNavProps.current = props;
    return (
      <header data-testid="top-nav">
        <span data-testid="context-label">{props.contextLabel}</span>
        <ul>
          {(props.classOptions ?? []).map((option: { id: string; label: string }) => (
            <li key={option.id}>{option.label}</li>
          ))}
        </ul>
      </header>
    );
  },
}));

vi.mock("../hooks/useContentResize.ts", () => ({
  useContentResize: () => ({}),
}));

const renderLayout = () =>
  render(
    <MemoryRouter initialEntries={["/class-1"]}>
      <Routes>
        <Route path="/:classID" element={<StudentClassLayout />}>
          <Route index element={<p>Materials page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  topNavProps.current = {};
  api.getEnrolledClasses.mockResolvedValue({
    classInfoList: [{ id: "class-1", className: "" }],
  });
  api.getClassById.mockResolvedValue({ id: "class-1", className: "" });
  api.setSelectedClass.mockResolvedValue({});
  api.getClassApps.mockResolvedValue([]);
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("StudentClassLayout", () => {
  it("names a class without a name \"Untitled class\" in the bar and the switcher", async () => {
    renderLayout();

    expect(await screen.findByText("Materials page")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("context-label")).toHaveTextContent("Untitled class")
    );
    expect(screen.getByRole("listitem")).toHaveTextContent("Untitled class");
  });

  it("draws the class bar's two tabs with Materials selected", async () => {
    renderLayout();
    await screen.findByText("Materials page");

    expect(screen.getByRole("tab", { name: "Materials" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("tab", { name: "Scratchpad" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it("puts the class switch right after the logo: no brand column on a class page", async () => {
    renderLayout();
    await screen.findByText("Materials page");

    expect(topNavProps.current.brandAreaWidth).toBeUndefined();
    expect(topNavProps.current.selectedClassId).toBe("class-1");
    expect(typeof topNavProps.current.onClassChange).toBe("function");
  });
});
