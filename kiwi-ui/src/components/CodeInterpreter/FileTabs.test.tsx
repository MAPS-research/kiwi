import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { BasicTabs } from "./FileTabs.tsx";
import { IDEContext } from "../Chat/ChatComponent.tsx";

// IDEContext lives in ChatComponent, which transitively imports the Pyodide/WebR
// modules that instantiate a Web Worker at module load — not available in jsdom.
vi.mock("./Pyodide.tsx", () => ({
  runPythonCode: vi.fn(),
  runJavascriptCode: vi.fn(),
}));
vi.mock("./WebR.tsx", () => ({
  runRCode: vi.fn(),
  initWebR: vi.fn(),
}));

/**
 * FileTabs / BasicTabs is the multi-file tab bar in the Code editor. It was
 * hidden by display:none for a long time; these tests exercise it directly
 * against IDEContext to confirm it renders and that the pinned "Code Space"
 * tab (index 0) is protected from deletion.
 */
const theme = createTheme();

interface IDEContextValue {
  IDETabs: { label: string; content: string }[];
  setIDETabs: (tabs: { label: string; content: string }[]) => void;
  IDETabvalue: number;
  setIDETabValue: (v: number) => void;
}

const renderTabs = (
  overrides: Partial<IDEContextValue> = {},
  props: Partial<React.ComponentProps<typeof BasicTabs>> = {}
) => {
  const ctx: any = {
    IDETabs: [
      { label: "Code Space", content: "Code space" },
      { label: "data.txt", content: "The file data.txt" },
    ],
    setIDETabs: vi.fn(),
    IDETabvalue: 0,
    setIDETabValue: vi.fn(),
    ...overrides,
  };
  const utils = render(
    <ThemeProvider theme={theme}>
      <IDEContext.Provider value={ctx}>
        <BasicTabs
          fileNames={[]}
          value_change={vi.fn()}
          addCodeInterpreterActions={vi.fn()}
          modifiedFileBuffers={[]}
          handleManyFileChange={vi.fn()}
          {...props}
        />
      </IDEContext.Provider>
    </ThemeProvider>
  );
  return { ...utils, ctx };
};

describe("BasicTabs (multi-file tab bar)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders a tab per IDETabs entry", () => {
    renderTabs();
    expect(screen.getByText("Code Space")).toBeInTheDocument();
    expect(screen.getByText("data.txt")).toBeInTheDocument();
  });

  it("switching to a file tab calls value_change with its label", () => {
    const value_change = vi.fn();
    const { ctx } = renderTabs({ IDETabvalue: 0 }, { value_change });
    fireEvent.click(screen.getByText("data.txt"));
    expect(ctx.setIDETabValue).toHaveBeenCalledWith(1);
    expect(value_change).toHaveBeenCalledWith("data.txt");
  });

  it("does not delete the pinned Code Space tab (index 0)", () => {
    const { ctx } = renderTabs();
    // Double-click is the delete gesture; index 0 must be a no-op.
    fireEvent.dblClick(screen.getByText("Code Space"));
    expect(ctx.setIDETabs).not.toHaveBeenCalled();
  });

  it("deletes a non-pinned file tab", () => {
    const { ctx } = renderTabs();
    fireEvent.dblClick(screen.getByText("data.txt"));
    expect(ctx.setIDETabs).toHaveBeenCalledTimes(1);
    // The updated tab list drops data.txt, keeping only Code Space.
    const updated = ctx.setIDETabs.mock.calls[0][0];
    expect(updated).toEqual([{ label: "Code Space", content: "Code space" }]);
  });

  it("shows an Upload control and buttons for available file names", () => {
    renderTabs({}, { fileNames: ["upload-me.py"] });
    expect(screen.getByText("Upload")).toBeInTheDocument();
    expect(screen.getByText("upload-me.py")).toBeInTheDocument();
  });
});
