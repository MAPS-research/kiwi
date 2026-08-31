import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Courses from './Courses.tsx';

// Mock the API client
vi.mock('../utils/api.ts', () => ({
  default: {
    studentControllerGetEnrolledClassesInfoByStudentId: vi.fn(() =>
      Promise.resolve({
        classInfoList: [
          {
            id: 'CS101',
            className: 'Introduction to Computer Science',
            professorName: 'Dr. Smith',
            imageSnippetUrl: '/path/to/image1.jpg'
          },
          {
            id: 'CS201',
            className: 'Data Structures and Algorithms',
            professorName: 'Dr. Johnson',
            imageSnippetUrl: '/path/to/image2.jpg'
          },
          {
            id: 'CS301',
            className: 'Database Systems',
            professorName: 'Dr. Brown',
            imageSnippetUrl: '/path/to/image3.jpg'
          }
        ]
      })
    ),
  },
}));

// Mock child components
vi.mock('../components/TopNav/TopNav.tsx', () => ({
  default: () => <div data-testid="top-nav">TopNav Component</div>
}));

vi.mock('../components/Sidebar/Sidebar.tsx', () => ({
  default: () => <div data-testid="sidebar">Sidebar Component</div>
}));

vi.mock('../components/ClassCard/ClassCard.tsx', () => ({
  default: ({ to, title, instructor, imageUrl }: any) => (
    <div data-testid="course-card">
      <h3>{title}</h3>
      <p>ID: {to?.slice(1)}</p>
      <p>Instructor: {instructor}</p>
      {imageUrl && <p>Image: {imageUrl}</p>}
    </div>
  )
}));

vi.mock('../components/ResponsiveGrid/ResponsiveGrid.tsx', () => ({
  default: ({ children }: any) => (
    <div data-testid="responsive-grid">{children}</div>
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

describe('Courses Page', () => {
  it('renders without crashing', async () => {
    await act(async () => {
      renderWithProviders(<Courses />);
    });
    expect(screen.getByTestId('top-nav')).toBeInTheDocument();
  });

  it('renders all main layout components', async () => {
    await act(async () => {
      renderWithProviders(<Courses />);
    });

    expect(screen.getByTestId('top-nav')).toBeInTheDocument();
    // expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-grid')).toBeInTheDocument();
  });

  it('uses the grey 100 student page background', async () => {
    await act(async () => {
      renderWithProviders(<Courses />);
    });

    expect(screen.getByTestId('courses-surface')).toHaveStyle({
      backgroundColor: 'rgb(245, 245, 245)',
    });
  });

  it('displays mock course data', async () => {
    renderWithProviders(<Courses />);

    // Wait for the async data to load
    await waitFor(() => {
      const courseCards = screen.getAllByTestId('course-card');
      expect(courseCards.length).toBe(3);
    });

    // Check for specific mock courses
    expect(screen.getByText('Introduction to Computer Science')).toBeInTheDocument();
    expect(screen.getByText('ID: CS101')).toBeInTheDocument();
    expect(screen.getByText('Instructor: Dr. Smith')).toBeInTheDocument();

    expect(screen.getByText('Data Structures and Algorithms')).toBeInTheDocument();
    expect(screen.getByText('ID: CS201')).toBeInTheDocument();
    expect(screen.getByText('Instructor: Dr. Johnson')).toBeInTheDocument();

    expect(screen.getByText('Database Systems')).toBeInTheDocument();
    expect(screen.getByText('ID: CS301')).toBeInTheDocument();
    expect(screen.getByText('Instructor: Dr. Brown')).toBeInTheDocument();
  });

  // it('shows add course card', async () => {
  //   await act(async () => {
  //     renderWithProviders(<Courses />);
  //   });
  //   expect(screen.getByTestId('add-course-card')).toBeInTheDocument();
  // });

  it('uses Material-UI layout components', async () => {
    let container: any;
    await act(async () => {
      const result = renderWithProviders(<Courses />);
      container = result.container;
    });

    const boxComponent = container.querySelector('.MuiBox-root');
    const containerComponent = container.querySelector('.MuiContainer-root');

    expect(boxComponent).toBeInTheDocument();
    expect(containerComponent).toBeInTheDocument();
  });

  it('has proper page structure hierarchy', async () => {
    renderWithProviders(<Courses />);

    // Main navigation should be present
    expect(screen.getByTestId('top-nav')).toBeInTheDocument();
    // expect(screen.getByTestId('sidebar')).toBeInTheDocument();

    // Content area with responsive grid
    expect(screen.getByTestId('responsive-grid')).toBeInTheDocument();

    // Wait for course cards to load
    await waitFor(() => {
      const courseCards = screen.getAllByTestId('course-card');
      expect(courseCards.length).toBe(3);
    });
  });

  it('displays correct number of mock courses', async () => {
    renderWithProviders(<Courses />);

    await waitFor(() => {
      const courseCards = screen.getAllByTestId('course-card');
      expect(courseCards).toHaveLength(3); // Based on mock data
    });
  });

  it('shows instructor information', async () => {
    renderWithProviders(<Courses />);

    await waitFor(() => {
      expect(screen.getByText('Instructor: Dr. Smith')).toBeInTheDocument();
    });

    expect(screen.getByText('Instructor: Dr. Johnson')).toBeInTheDocument();
    expect(screen.getByText('Instructor: Dr. Brown')).toBeInTheDocument();
  });

  it('renders course images', async () => {
    await act(async () => {
      renderWithProviders(<Courses />);
    });

    await waitFor(() => {
      expect(screen.getByText('Image: /path/to/image1.jpg')).toBeInTheDocument();
    });

    expect(screen.getByText('Image: /path/to/image2.jpg')).toBeInTheDocument();
    expect(screen.getByText('Image: /path/to/image3.jpg')).toBeInTheDocument();
  });

  it('has accessible course information', async () => {
    await act(async () => {
      renderWithProviders(<Courses />);
    });

    await waitFor(() => {
      expect(screen.getByText('Introduction to Computer Science')).toBeInTheDocument();
    });

    // Check specific course names are rendered
    expect(screen.getByText('Data Structures and Algorithms')).toBeInTheDocument();
    expect(screen.getByText('Database Systems')).toBeInTheDocument();
  });

  it('handles responsive layout for different screen sizes', async () => {
    await act(async () => {
      renderWithProviders(<Courses />);
    });

    // ResponsiveGrid should handle the layout
    const grid = screen.getByTestId('responsive-grid');
    expect(grid).toBeInTheDocument();

    // Wait for course cards to load then check containment
    await waitFor(() => {
      const courseCards = screen.getAllByTestId('course-card');
      expect(courseCards.length).toBeGreaterThan(0);
      courseCards.forEach(card => {
        expect(grid).toContainElement(card);
      });
    });
  });

  it('displays course metadata correctly', async () => {
    await act(async () => {
      renderWithProviders(<Courses />);
    });

    // Wait for courses to load and check basic course data
    await waitFor(() => {
      expect(screen.getByText('ID: CS101')).toBeInTheDocument();
    });
    expect(screen.getByText('ID: CS201')).toBeInTheDocument();
    expect(screen.getByText('ID: CS301')).toBeInTheDocument();
    // Remove CS401 since our mock only has 3 courses
  });

  it('maintains consistent card structure', async () => {
    await act(async () => {
      renderWithProviders(<Courses />);
    });

    // Wait for course cards to be rendered
    await waitFor(() => {
      const courseCards = screen.getAllByTestId('course-card');
      expect(courseCards.length).toBeGreaterThan(0);
    });

    const courseCards = screen.getAllByTestId('course-card');

    // Each course card should contain expected elements
    courseCards.forEach(card => {
      expect(card.querySelector('h3')).toBeInTheDocument(); // Course name
      expect(card.textContent).toMatch(/ID:/); // Course ID
      expect(card.textContent).toMatch(/Instructor:/); // Instructor name
    });
  });

  it('provides navigation context', async () => {
    await act(async () => {
      renderWithProviders(<Courses />);
    });

    // Navigation components provide context for the courses page
    expect(screen.getByTestId('top-nav')).toBeInTheDocument();
    // expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });
});
