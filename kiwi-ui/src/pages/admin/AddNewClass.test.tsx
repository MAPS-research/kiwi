import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { BrowserRouter } from "react-router-dom";
import { AddNewClassDialog } from "./AddNewClass.tsx";

const theme = createTheme();

const renderDialog = (props?: Partial<React.ComponentProps<typeof AddNewClassDialog>>) => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onCreated: vi.fn(),
  };

  const result = render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <AddNewClassDialog {...defaultProps} {...props} />
      </ThemeProvider>
    </BrowserRouter>,
  );

  return { ...result, props: { ...defaultProps, ...props } };
};

describe("AddNewClassDialog", () => {
  let mockApiClient: any;

  beforeEach(async () => {
    const api = await import("../../utils/api.ts");
    mockApiClient = vi.mocked(api.default);
    mockApiClient.classControllerAdd.mockResolvedValue({});
    vi.clearAllMocks();
  });

  it("renders the new class form inside an accessible dialog", () => {
    renderDialog();

    expect(screen.getByRole("dialog", { name: "Create New Class" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Basic information" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Course image" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Class preview" })).toBeInTheDocument();
    expect(screen.getByLabelText(/professor email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();

    const previewColumn = screen.getByTestId("class-preview-column");
    expect(within(previewColumn).getByText("Class preview")).toBeInTheDocument();
    expect(previewColumn.querySelectorAll(".MuiCard-root")).toHaveLength(1);
    expect(previewColumn.querySelector(".MuiCard-root")).toHaveAttribute("tabindex", "0");
  });

  it("updates the class preview as details are entered", () => {
    renderDialog();

    fireEvent.change(screen.getByLabelText(/class name/i), {
      target: { value: "Biology 101" },
    });
    fireEvent.change(screen.getByLabelText(/professor name/i), {
      target: { value: "Dr. Green" },
    });

    const previewColumn = screen.getByTestId("class-preview-column");
    expect(within(previewColumn).getByText("Biology 101")).toBeInTheDocument();
    expect(within(previewColumn).getByText("Dr. Green")).toBeInTheDocument();
  });

  it("closes from both explicit close controls", () => {
    const onClose = vi.fn();
    renderDialog({ onClose });

    fireEvent.click(screen.getByRole("button", { name: "Close create new class dialog" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("creates the class, refreshes the list, and closes", async () => {
    const onClose = vi.fn();
    const onCreated = vi.fn().mockResolvedValue(undefined);
    renderDialog({ onClose, onCreated });

    fireEvent.change(screen.getByLabelText(/class name/i), {
      target: { value: " Biology 101 " },
    });
    fireEvent.change(screen.getByLabelText(/professor name/i), {
      target: { value: " Dr. Green " },
    });
    fireEvent.change(screen.getByLabelText(/professor email/i), {
      target: { value: " green@example.edu " },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: " Introductory biology. " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create New Class" }));

    await waitFor(() => {
      expect(mockApiClient.classControllerAdd).toHaveBeenCalledWith({
        classAddRequest: {
          classDetails: {
            className: "Biology 101",
            professorName: "Dr. Green",
            professorEmail: "green@example.edu",
            description: "Introductory biology.",
            imageSnippetUrl: undefined,
          },
        },
      });
      expect(onCreated).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("keeps the dialog open and shows an inline error when creation fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockApiClient.classControllerAdd.mockRejectedValueOnce(new Error("Request failed"));
    const onClose = vi.fn();
    renderDialog({ onClose });

    fireEvent.change(screen.getByLabelText(/class name/i), {
      target: { value: "Biology 101" },
    });
    fireEvent.change(screen.getByLabelText(/professor name/i), {
      target: { value: "Dr. Green" },
    });
    fireEvent.change(screen.getByLabelText(/professor email/i), {
      target: { value: "green@example.edu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create New Class" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The class could not be created. Request failed",
    );
    expect(onClose).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
