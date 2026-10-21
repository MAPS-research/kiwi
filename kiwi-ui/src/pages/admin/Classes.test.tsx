import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Classes } from './Classes.tsx';

// API client is globally mocked in setupTests.ts

// Mock child components
vi.mock('../../components/ClassCard/ClassCard.tsx', () => ({
  CLASS_CARD_HEIGHT: 280,
  default: ({ title, instructor, to }: any) => (
    <div data-testid="class-card">
      <h3>{title || 'Unnamed Class'}</h3>
      <p>Professor: {instructor || 'Unknown'}</p>
      <p>ID: {to?.split('/').at(-1)}</p>
    </div>
  )
}));

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

describe('Classes Component', () => {
  let mockApiClient: any;

  beforeEach(async () => {
    // Import the mocked API client
    const api = await import('../../utils/api.ts');
    mockApiClient = vi.mocked(api.default);

    vi.clearAllMocks();

    // Mock class list response
    mockApiClient.classControllerList.mockResolvedValue({
      classIds: ['CS101', 'MATH201', 'PHYS301']
    });

    // Mock individual class responses
    mockApiClient.classControllerGetById.mockImplementation(({ classID }: { classID: string }) => {
      const mockClasses: Record<string, any> = {
        'CS101': {
          id: 'CS101',
          className: 'Introduction to Computer Science',
          professorName: 'Dr. John Smith',
          professorEmail: 'john.smith@university.edu'
        },
        'MATH201': {
          id: 'MATH201',
          className: 'Calculus II',
          professorName: 'Dr. Jane Doe',
          professorEmail: 'jane.doe@university.edu'
        },
        'PHYS301': {
          id: 'PHYS301',
          className: 'Quantum Physics',
          professorName: 'Dr. Albert Einstein',
          professorEmail: 'albert.einstein@university.edu'
        }
      };
      return Promise.resolve(mockClasses[classID] || { classID: '' });
    });
  });

  it('renders without crashing', () => {
    renderWithProviders(<Classes />);
    expect(screen.getByText('All Classes')).toBeInTheDocument();
  });

  it('fetches class list on component mount', async () => {
    renderWithProviders(<Classes />);

    await waitFor(() => {
      expect(mockApiClient.classControllerList).toHaveBeenCalledTimes(1);
    });
  });

  it('opens the add new class form as a dialog without leaving the list', async () => {
    renderWithProviders(<Classes />);

    fireEvent.click(screen.getByRole('button', { name: 'Create class' }));

    expect(screen.getByRole('dialog', { name: 'Create class' })).toBeInTheDocument();
    expect(screen.getByText('All Classes')).toBeInTheDocument();
  });

  it('draws the search as the standard field with a neutral icon', () => {
    renderWithProviders(<Classes />);

    const searchInput = screen.getByPlaceholderText('Search classes or professors...');
    const inputRoot = searchInput.closest('.MuiOutlinedInput-root');

    // The page leaves the field to the theme (its radius and density-aware height).
    expect(inputRoot).not.toHaveStyle({ height: '44px' });
    expect(inputRoot).not.toHaveStyle({ borderRadius: '12px' });
    expect(screen.getByTestId('SearchOutlinedIcon')).not.toHaveClass('MuiSvgIcon-colorAction');
    expect(screen.getByTestId('SearchOutlinedIcon')).toHaveStyle({ color: 'var(--icon-default)' });
  });

  it('fetches individual class details for each class ID', async () => {
    renderWithProviders(<Classes />);

    await waitFor(() => {
      expect(mockApiClient.classControllerGetById).toHaveBeenCalledWith({ classID: 'CS101' });
      expect(mockApiClient.classControllerGetById).toHaveBeenCalledWith({ classID: 'MATH201' });
      expect(mockApiClient.classControllerGetById).toHaveBeenCalledWith({ classID: 'PHYS301' });
    });
  });

  it('displays class cards after loading', async () => {
    renderWithProviders(<Classes />);

    await waitFor(() => {
      const classCards = screen.getAllByTestId('class-card');
      expect(classCards).toHaveLength(3);
    });

    expect(screen.getByText('Introduction to Computer Science')).toBeInTheDocument();
    expect(screen.getByText('Calculus II')).toBeInTheDocument();
    expect(screen.getByText('Quantum Physics')).toBeInTheDocument();
  });

  it('displays professor information', async () => {
    renderWithProviders(<Classes />);

    await waitFor(() => {
      expect(screen.getByText('Professor: Dr. John Smith')).toBeInTheDocument();
      expect(screen.getByText('Professor: Dr. Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('Professor: Dr. Albert Einstein')).toBeInTheDocument();
    });
  });

  it('displays class IDs', async () => {
    renderWithProviders(<Classes />);

    await waitFor(() => {
      expect(screen.getByText('ID: CS101')).toBeInTheDocument();
      expect(screen.getByText('ID: MATH201')).toBeInTheDocument();
      expect(screen.getByText('ID: PHYS301')).toBeInTheDocument();
    });
  });

  it('handles empty class list', async () => {
    mockApiClient.classControllerList.mockResolvedValue({ classIds: [] });

    renderWithProviders(<Classes />);

    await waitFor(() => {
      expect(screen.getByText('No classes found')).toBeInTheDocument();
    });

    expect(screen.queryAllByTestId('class-card')).toHaveLength(0);
  });

  it('handles API errors for class list', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    mockApiClient.classControllerList.mockRejectedValue(new Error('Failed to fetch classes'));

    renderWithProviders(<Classes />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching class list', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('handles API errors for individual class details', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    mockApiClient.classControllerGetById.mockRejectedValue(new Error('Class not found'));

    renderWithProviders(<Classes />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching class data:', expect.any(Error));
    });

    // When all class detail fetches fail, no class cards should be rendered
    await waitFor(() => {
      const classCards = screen.queryAllByTestId('class-card');
      expect(classCards).toHaveLength(0);

      // Should show "No classes found" message
      expect(screen.getByText('No classes found')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('uses Material-UI Grid layout', () => {
    const { container } = renderWithProviders(<Classes />);

    const gridComponent = container.querySelector('.MuiGrid-root');
    expect(gridComponent).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    const { container } = renderWithProviders(<Classes />);

    // Should show skeleton loaders during loading
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('converts class IDs to ClassInfo objects correctly', async () => {
    renderWithProviders(<Classes />);

    await waitFor(() => {
      // Should have converted all class IDs to full ClassInfo objects
      expect(screen.getByText('Introduction to Computer Science')).toBeInTheDocument();
      expect(screen.getByText('Calculus II')).toBeInTheDocument();
      expect(screen.getByText('Quantum Physics')).toBeInTheDocument();
    });
  });

  it('handles partial class data gracefully', async () => {
    mockApiClient.classControllerGetById.mockImplementation(({ classID }: { classID: string }) => {
      if (classID === 'CS101') {
        return Promise.resolve({
          id: 'CS101',
          className: 'Introduction to Computer Science',
          // Missing professor info
        });
      }
      return Promise.resolve({
        id: classID,
        className: 'Complete Class',
        professorName: 'Prof. Smith',
        professorEmail: 'smith@example.com'
      });
    });

    renderWithProviders(<Classes />);

    await waitFor(() => {
      expect(screen.getByText('Introduction to Computer Science')).toBeInTheDocument();
      // Check that unknown professor info appears somewhere
      expect(screen.getAllByText('Professor: Unknown').length).toBeGreaterThan(0);
    });
  });

  it('maintains state during async operations', async () => {
    const { rerender, container } = renderWithProviders(<Classes />);

    // Should show loading initially (skeletons)
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);

    // After API calls complete
    await waitFor(() => {
      expect(screen.getAllByTestId('class-card')).toHaveLength(3);
    });

    // Rerender should maintain the loaded state
    rerender(
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <Classes />
        </ThemeProvider>
      </BrowserRouter>
    );

    expect(screen.getAllByTestId('class-card')).toHaveLength(3);
  });

  it('processes classes concurrently', async () => {
    renderWithProviders(<Classes />);

    await waitFor(() => {
      // All class detail API calls should have been made
      expect(mockApiClient.classControllerGetById).toHaveBeenCalledTimes(3);
    });

    // Should have processed all classes despite async nature
    expect(screen.getAllByTestId('class-card')).toHaveLength(3);
  });

  it('has proper component structure', () => {
    const { container } = renderWithProviders(<Classes />);

    // Should have main content with classes header
    expect(screen.getByText('All Classes')).toBeInTheDocument();

    // Should use Grid layout
    const gridContainer = container.querySelector('.MuiGrid-container');
    expect(gridContainer).toBeInTheDocument();
  });

  it('handles mixed success and failure class fetches', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    mockApiClient.classControllerGetById.mockImplementation(({ classID }: { classID: string }) => {
      if (classID === 'CS101') {
        return Promise.resolve({
          id: 'CS101',
          className: 'Introduction to Computer Science',
          professorName: 'Dr. John Smith',
          professorEmail: 'john.smith@university.edu'
        });
      }
      return Promise.reject(new Error('Class not found'));
    });

    renderWithProviders(<Classes />);

    await waitFor(() => {
      // Should have only the successful class card (failed ones are filtered out)
      const classCards = screen.getAllByTestId('class-card');
      expect(classCards).toHaveLength(1);

      // One successful load
      expect(screen.getByText('Introduction to Computer Science')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });
});
