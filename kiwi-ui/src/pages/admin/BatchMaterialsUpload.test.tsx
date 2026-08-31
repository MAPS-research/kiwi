import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { BatchMaterialsUpload } from "./BatchMaterialsUpload.tsx";

// Mock useParams
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: vi.fn(() => ({ classID: "test-class-123" })),
  };
});

const theme = createTheme();

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe("BatchMaterialsUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders without crashing", () => {
    renderWithProviders(<BatchMaterialsUpload />);

    expect(screen.getByText("Batch Upload")).toBeInTheDocument();
  });

  it("displays empty state when no files are selected", () => {
    renderWithProviders(<BatchMaterialsUpload />);

    expect(screen.getByText("No files selected")).toBeInTheDocument();
    expect(screen.getByText("Click \"Select PDF Files\" to upload multiple class materials at once")).toBeInTheDocument();
  });

  it("displays file selection interface", () => {
    renderWithProviders(<BatchMaterialsUpload />);

    expect(screen.getByText("Select PDF Files")).toBeInTheDocument();
    expect(screen.getByText("Start Batch Process")).toBeInTheDocument();
  });

  it("has correct page title", () => {
    renderWithProviders(<BatchMaterialsUpload />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Batch Upload");
  });

  it("shows buttons in disabled state initially", () => {
    renderWithProviders(<BatchMaterialsUpload />);

    const startButton = screen.getByText("Start Batch Process");
    expect(startButton).toBeDisabled();
  });

  it("displays cloud upload icons", () => {
    renderWithProviders(<BatchMaterialsUpload />);

    const icons = screen.getAllByTestId("CloudUploadIcon");
    expect(icons).toHaveLength(3); // One in button, one in empty state
  });
});