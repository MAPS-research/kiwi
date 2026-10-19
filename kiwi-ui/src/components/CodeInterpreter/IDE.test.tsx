import { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { Provider } from "react-redux";
import store from "../../redux/store.ts";
import { IDE } from "./IDE.tsx";
import { IDEContext } from "../Chat/ChatComponent.tsx";
import { runPythonCode } from "./Pyodide.tsx";

// The runtimes start Web Workers at module load, which jsdom does not have.
vi.mock("./Pyodide.tsx", () => ({
  runPythonCode: vi.fn(),
  runJavascriptCode: vi.fn(),
}));
vi.mock("./WebR.tsx", () => ({
  runRCode: vi.fn(),
  initWebR: vi.fn(),
}));

// react-ace drives a real Ace editor; the stand-in records the props the IDE gives it.
const ace = vi.hoisted(() => ({ props: {} as Record<string, unknown> }));
vi.mock("react-ace", () => ({
  default: (props: Record<string, unknown>) => {
    ace.props = props;
    return <div data-testid="ace-editor" />;
  },
}));

const saveInteraction = vi.hoisted(() => vi.fn());
vi.mock("../../utils/useSaveInteraction.ts", () => ({
  useSaveInteraction: () => ({ saveInteraction }),
}));

type Tab = { label: string; content: string };

/** IDEContext with real state, the way ClassIDE provides it. */
const Harness = ({
  exportCode,
  allowR,
  initialTabs,
}: {
  exportCode: (prompt: string) => void;
  allowR: boolean;
  initialTabs: Tab[];
}) => {
  const [IDECode, setIDECode] = useState("print('hi')");
  const [IDEOutputCode, setIDEOutputCode] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [buffers, setBuffers] = useState<ArrayBuffer[]>([]);
  const [modified, setModified] = useState<ArrayBuffer[]>([]);
  const [tabs, setTabs] = useState<Tab[]>(initialTabs);
  const [tabValue, setTabValue] = useState(0);
  return (
    <IDEContext.Provider
      value={{
        IDECode,
        setIDECode,
        IDEOutputCode,
        setIDEOutputCode,
        IDEfileNameState: names,
        setIDEFileNameState: setNames,
        IDEFileBufferState: buffers,
        setIDEFileBufferState: setBuffers,
        IDEModifiedFileBufferState: modified,
        setModifiedFileBufferState: setModified,
        IDETabs: tabs,
        setIDETabs: setTabs,
        IDETabvalue: tabValue,
        setIDETabValue: setTabValue,
      }}
    >
      <IDE pdfInfo="" Messages={[]} handleSendMessage={vi.fn()} exportCode={exportCode} allowR={allowR} />
    </IDEContext.Provider>
  );
};

const renderIDE = ({
  mode = "light",
  exportCode = vi.fn(),
  allowR = false,
  initialTabs = [{ label: "Code", content: "Code" }],
}: {
  mode?: "light" | "dark";
  exportCode?: (prompt: string) => void;
  allowR?: boolean;
  initialTabs?: Tab[];
} = {}) =>
  render(
    <Provider store={store}>
      <ThemeProvider theme={createTheme({ palette: { mode } })}>
        <Harness exportCode={exportCode} allowR={allowR} initialTabs={initialTabs} />
      </ThemeProvider>
    </Provider>
  );

describe("IDE: the editor's code theme", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["light", "kiwi-light"],
    ["dark", "kiwi-dark"],
  ] as const)("gives the editor the Kiwi Ace theme in %s mode", (mode, aceTheme) => {
    renderIDE({ mode });
    expect(screen.getByTestId("ace-editor")).toBeInTheDocument();
    expect(ace.props.theme).toBe(aceTheme);
    // The code role, 14/24 mono, follows the tokens rather than a fixed number.
    expect(ace.props.fontSize).toBe("var(--type-code-size)");
    expect(ace.props.lineHeight).toBe("var(--type-code-leading)");
  });

  it("registers both Kiwi themes with Ace, so neither is fetched from the network", () => {
    const aceGlobal = (window as unknown as { ace: { require: (id: string) => { cssClass: string; isDark: boolean } } }).ace;
    expect(aceGlobal.require("ace/theme/kiwi-light")).toMatchObject({ cssClass: "ace-kiwi-light", isDark: false });
    expect(aceGlobal.require("ace/theme/kiwi-dark")).toMatchObject({ cssClass: "ace-kiwi-dark", isDark: true });
  });
});

describe("IDE: controls and copy", () => {
  beforeEach(() => vi.clearAllMocks());

  it("names the editor's icon buttons and draws them as compact tool chrome", () => {
    renderIDE();
    const run = screen.getByRole("button", { name: "Run code" });
    const upload = screen.getByRole("button", { name: "Upload files" });
    expect(run.closest('[data-density="compact"]')).not.toBeNull();
    expect(upload.closest('[data-density="compact"]')).not.toBeNull();
  });

  it("has one filled primary, Ask Kiwi to check, beside a secondary and a tertiary", () => {
    const { container } = renderIDE();
    expect(screen.getByRole("button", { name: "Ask Kiwi to check" })).toHaveClass("MuiButton-contained");
    expect(screen.getByRole("button", { name: "Open in chat" })).toHaveClass("MuiButton-outlined");
    expect(screen.getByRole("button", { name: "Save code" })).toHaveClass("MuiButton-text");
    expect(container.querySelectorAll(".MuiButton-contained")).toHaveLength(1);
  });

  it("Open in chat and Ask Kiwi to check hand the code to the chat as before", () => {
    const exportCode = vi.fn();
    renderIDE({ exportCode });
    fireEvent.click(screen.getByRole("button", { name: "Open in chat" }));
    expect(exportCode).toHaveBeenLastCalledWith(
      expect.stringMatching(/^I have the following solution for question #\.\n\n```python\nprint\('hi'\)\n```/)
    );
    fireEvent.click(screen.getByRole("button", { name: "Ask Kiwi to check" }));
    expect(exportCode).toHaveBeenLastCalledWith(
      expect.stringMatching(/^Check my answer for question #\.\n\n```python\nprint\('hi'\)\n```/)
    );
  });

  it("shows the output in the console, with its placeholder until a run", async () => {
    vi.mocked(runPythonCode).mockResolvedValue({ stdoutLines: ["Answered: 4 of 6"] } as never);
    renderIDE();
    const output = document.getElementById("code-output")!;
    expect(output.closest(".kiwi-console")).not.toBeNull();
    expect(output).toHaveTextContent("Output will appear here.");

    fireEvent.click(screen.getByRole("button", { name: "Run code" }));
    await waitFor(() => expect(output).toHaveTextContent("Answered: 4 of 6"));
    expect(output).toHaveClass("kiwi-console-stdout");
  });

  it("shows a run's error in the console's stderr colour", async () => {
    vi.mocked(runPythonCode).mockResolvedValue({ error: "NameError: name 'x' is not defined", stdoutLines: [] } as never);
    renderIDE();
    fireEvent.click(screen.getByRole("button", { name: "Run code" }));
    const output = document.getElementById("code-output")!;
    await waitFor(() => expect(output).toHaveTextContent("NameError: name 'x' is not defined"));
    expect(output).toHaveClass("kiwi-console-stderr");
  });

  it("Run raises an info toast right after it in the tab order, which Dismiss closes", async () => {
    vi.mocked(runPythonCode).mockResolvedValue({ stdoutLines: [] } as never);
    renderIDE();
    const run = screen.getByRole("button", { name: "Run code" });
    fireEvent.click(run);

    const toast = await screen.findByRole("status");
    expect(toast).toHaveTextContent("Running your code…");
    const dismiss = screen.getByRole("button", { name: "Dismiss" });
    const upload = screen.getByRole("button", { name: "Upload files" });
    expect(run.compareDocumentPosition(dismiss) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(dismiss.compareDocumentPosition(upload) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(dismiss);
    await waitFor(() => expect(screen.queryByText("Running your code…")).not.toBeInTheDocument());
  });

  it("switches back to the code with the Code tab and explains files it cannot open", () => {
    renderIDE({
      initialTabs: [
        { label: "Code", content: "Code" },
        { label: "notes.txt", content: "notes.txt" },
        { label: "survey.csv", content: "survey.csv" },
      ],
    });
    fireEvent.click(screen.getByRole("tab", { name: "notes.txt" }));
    expect(ace.props.value).toBe(
      "This file is no longer available. Uploaded files are cleared when you leave the scratchpad. Upload it again."
    );
    fireEvent.click(screen.getByRole("tab", { name: "survey.csv" }));
    expect(ace.props.value).toBe(
      "This file can't be opened here. The editor opens text files only. Open a text file instead."
    );
    fireEvent.click(screen.getByRole("tab", { name: "Code" }));
    expect(ace.props.value).toBe("print('hi')");
  });

  it("with R, names the language and adds the Plots and Variables tabs", () => {
    renderIDE({ allowR: true });
    const select = screen.getByRole("combobox");
    expect(select.closest('[data-density="compact"]')).not.toBeNull();
    fireEvent.mouseDown(select);
    fireEvent.click(screen.getByRole("option", { name: "R" }));

    expect(screen.queryByText("R Language")).not.toBeInTheDocument();
    const outputTabs = screen.getByRole("tab", { name: "Output" }).closest('[data-density="compact"]');
    expect(outputTabs).not.toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Variables (0)" }));
    expect(screen.getByText("No variables")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Plots (0)" }));
    expect(screen.getByText("No plots generated")).toBeInTheDocument();
  });
});
