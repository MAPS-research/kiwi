import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { ClassEdit } from "./ClassEdit.tsx";
import apiClient from "../../utils/api.ts";

// Mock API client
vi.mock("../../utils/api.ts", () => ({
  default: {
    classControllerGetByIdComplete: vi.fn(),
    classControllerUpdateMetadata: vi.fn(),
    documentControllerUploadNoMaterialId: vi.fn(),
  },
}));

const mockApiClient = vi.mocked(apiClient);

const mockCompleteClassData = {
  classInfo: {
    id: "test-class-123",
    createdDate: new Date(),
    professorId: "prof-123",
    classMetadata: {
      className: "Test Class",
      professorName: "Dr. Test",
      professorEmail: "test.professor@example.edu",
      description: "A test class description",
      imageSnippetUrl: "test-image-key.jpg",
      systemPrompts: {
        defaultSystemMessage: "Test default message",
        classMaterialsPrompt: "Test materials prompt",
        recitationPrompt: "Test recitation prompt",
      },
    },
  },
  imageSnippetServerUrl: "https://signed-url.com/test-image.jpg",
};

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockUseParams = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => mockUseParams(),
    useNavigate: () => mockNavigate,
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


describe("ClassEdit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ classID: "test-class-123" });
    mockApiClient.classControllerGetByIdComplete.mockResolvedValue(mockCompleteClassData);
    mockApiClient.classControllerUpdateMetadata.mockResolvedValue({ classId: "test-class-123" });
  });

  it("renders without crashing", async () => {
    renderWithProviders(<ClassEdit />);
    
    await waitFor(() => {
      expect(screen.getByText("Edit Class")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Back to Class" })).not.toBeInTheDocument();
  });

  it("loads and displays class data", async () => {
    renderWithProviders(<ClassEdit />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Class")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Dr. Test")).toBeInTheDocument();
      expect(screen.getByDisplayValue("test.professor@example.edu")).toBeInTheDocument();
      expect(screen.getByDisplayValue("A test class description")).toBeInTheDocument();
    });
  });

  it("shows a live ClassCard preview without section cards", async () => {
    const { container } = renderWithProviders(<ClassEdit />);

    await waitFor(() => {
      expect(screen.getByText("Class preview")).toBeInTheDocument();
      expect(screen.getByText("Test Class")).toBeInTheDocument();
      expect(screen.getByText("Dr. Test")).toBeInTheDocument();
      const previewCard = screen.getByText("Test Class").closest(".MuiCard-root");
      expect(
        within(previewCard!).queryByText("test.professor@example.edu"),
      ).not.toBeInTheDocument();
      expect(
        within(previewCard!).queryByText("A test class description"),
      ).not.toBeInTheDocument();
    });

    expect(container.querySelectorAll(".MuiCard-root")).toHaveLength(1);
    expect(container.querySelector(".MuiCard-root")).toHaveAttribute("tabindex", "0");
    const formColumn = screen.getByTestId("class-form-column");
    const previewColumn = screen.getByTestId("class-preview-column");
    expect(within(formColumn).getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(within(formColumn).getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    expect(within(previewColumn).getByText("Class preview")).toBeInTheDocument();
    expect(within(previewColumn).queryByRole("button")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/class name/i), {
      target: { value: "Updated Class" },
    });

    expect(screen.getByText("Updated Class")).toBeInTheDocument();
  });

  it("displays system prompts when enabled", async () => {
    renderWithProviders(<ClassEdit />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test default message")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Test materials prompt")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Test recitation prompt")).toBeInTheDocument();
    });
  });

  it("handles form submission", async () => {
    renderWithProviders(<ClassEdit />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Class")).toBeInTheDocument();
    });

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockApiClient.classControllerUpdateMetadata).toHaveBeenCalledWith({
        classUpdateMetadataRequest: {
          classId: "test-class-123",
          classDetails: expect.objectContaining({
            className: "Test Class",
            professorName: "Dr. Test",
            professorEmail: "test.professor@example.edu",
            description: "A test class description",
            imageSnippetUrl: "test-image-key.jpg", // Preserves existing image
            systemPrompts: {
              defaultSystemMessage: "Test default message",
              classMaterialsPrompt: "Test materials prompt",
              recitationPrompt: "Test recitation prompt",
            },
          }),
        },
      });
    });
  });

  it("navigates back when cancel is clicked", async () => {
    renderWithProviders(<ClassEdit />);
    
    await waitFor(() => {
      expect(screen.getByText("Edit Class")).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockNavigate).toHaveBeenCalledWith("/admin/class/test-class-123");
  });


  it("allows toggling system prompts on and off", async () => {
    renderWithProviders(<ClassEdit />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test default message")).toBeInTheDocument();
    });

    const checkbox = screen.getByRole("checkbox", { name: /enable custom prompts/i });
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(screen.queryByDisplayValue("Test default message")).not.toBeInTheDocument();
    });
  });

  it("handles API errors gracefully", async () => {
    mockApiClient.classControllerGetByIdComplete.mockRejectedValue(new Error("API Error"));
    
    renderWithProviders(<ClassEdit />);
    
    await waitFor(() => {
      expect(screen.getByText("Failed to load class data. Please try again.")).toBeInTheDocument();
    });
  });

  it("shows loading state initially", () => {
    mockApiClient.classControllerGetByIdComplete.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    renderWithProviders(<ClassEdit />);
    
    expect(screen.getByText("Loading class data...")).toBeInTheDocument();
  });

  it("handles class data without system prompts", async () => {
    const classDataWithoutPrompts = {
      ...mockCompleteClassData,
      classInfo: {
        ...mockCompleteClassData.classInfo,
        classMetadata: {
          ...mockCompleteClassData.classInfo.classMetadata,
          systemPrompts: undefined,
        },
      },
    };
    mockApiClient.classControllerGetByIdComplete.mockResolvedValue(classDataWithoutPrompts);
    
    renderWithProviders(<ClassEdit />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Class")).toBeInTheDocument();
    });

    expect(screen.getByText("Custom system prompts are disabled. The system will use default prompts.")).toBeInTheDocument();
  });
});
