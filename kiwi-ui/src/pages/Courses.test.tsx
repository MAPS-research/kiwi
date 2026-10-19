import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Courses from './Courses.tsx';

const threeClasses = {
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
};

const api = vi.hoisted(() => ({
  getEnrolledClasses: vi.fn(),
}));

// Mock the API client
vi.mock('../utils/api.ts', () => ({
  default: {
    studentControllerGetEnrolledClassesInfoByStudentId: api.getEnrolledClasses,
  },
}));

// Mock child components
vi.mock('../components/TopNav/TopNav.tsx', () => ({
  default: () => <div data-testid="top-nav">TopNav Component</div>
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
  beforeEach(() => {
    api.getEnrolledClasses.mockReset();
    api.getEnrolledClasses.mockResolvedValue(threeClasses);
  });

  it('renders the top bar and the page heading', async () => {
    await act(async () => {
      renderWithProviders(<Courses />);
    });

    expect(screen.getByTestId('top-nav')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Your classes' })).toHaveClass(
      'MuiTypography-h1',
    );
    expect(screen.queryByText(/Welcome to/)).not.toBeInTheDocument();
  });

  it('draws the page on the canvas in the main landmark, with no hero', async () => {
    await act(async () => {
      renderWithProviders(<Courses />);
    });

    const surface = screen.getByRole('main');
    expect(surface).toBe(screen.getByTestId('courses-surface'));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByTestId('hero-carousel-image')).not.toBeInTheDocument();
  });

  it('displays the enrolled classes in the grid', async () => {
    renderWithProviders(<Courses />);

    await waitFor(() => {
      expect(screen.getAllByTestId('course-card')).toHaveLength(3);
    });

    const grid = screen.getByTestId('responsive-grid');
    screen.getAllByTestId('course-card').forEach((card) => {
      expect(grid).toContainElement(card);
    });

    expect(screen.getByText('Introduction to Computer Science')).toBeInTheDocument();
    expect(screen.getByText('ID: CS101')).toBeInTheDocument();
    expect(screen.getByText('Instructor: Dr. Smith')).toBeInTheDocument();
    expect(screen.getByText('Image: /path/to/image1.jpg')).toBeInTheDocument();

    expect(screen.getByText('Data Structures and Algorithms')).toBeInTheDocument();
    expect(screen.getByText('ID: CS201')).toBeInTheDocument();
    expect(screen.getByText('Instructor: Dr. Johnson')).toBeInTheDocument();

    expect(screen.getByText('Database Systems')).toBeInTheDocument();
    expect(screen.getByText('ID: CS301')).toBeInTheDocument();
    expect(screen.getByText('Instructor: Dr. Brown')).toBeInTheDocument();
  });

  it('names a class with no name or instructor', async () => {
    api.getEnrolledClasses.mockResolvedValue({
      classInfoList: [{ id: 'NONAME', className: '', professorName: '' }],
    });
    renderWithProviders(<Courses />);

    expect(await screen.findByText('Untitled class')).toBeInTheDocument();
    expect(screen.getByText('Instructor: No instructor listed')).toBeInTheDocument();
    expect(screen.queryByText('Class')).not.toBeInTheDocument();
    expect(screen.queryByText('Instructor: TBD')).not.toBeInTheDocument();
  });

  it('shows no empty frame while the classes load', () => {
    api.getEnrolledClasses.mockImplementation(() => new Promise(() => {}));
    renderWithProviders(<Courses />);

    expect(screen.getByRole('heading', { level: 1, name: 'Your classes' })).toBeInTheDocument();
    expect(screen.queryByText('No classes yet')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says there are no classes yet, with no call to action', async () => {
    api.getEnrolledClasses.mockResolvedValue({ classInfoList: [] });
    renderWithProviders(<Courses />);

    expect(await screen.findByRole('heading', { level: 2, name: 'No classes yet' })).toBeInTheDocument();
    expect(screen.queryByTestId('responsive-grid')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('treats a missing class list as no classes', async () => {
    api.getEnrolledClasses.mockResolvedValue({});
    renderWithProviders(<Courses />);

    expect(await screen.findByRole('heading', { name: 'No classes yet' })).toBeInTheDocument();
  });

  it('states a failed load and retries it', async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.getEnrolledClasses.mockRejectedValueOnce(new Error('Network down'));
    renderWithProviders(<Courses />);

    expect(await screen.findByRole('heading', { name: "Couldn't load your classes" })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      "The server didn't respond as expected. Select Retry.",
    );
    expect(screen.queryByText('No classes yet')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(screen.getAllByTestId('course-card')).toHaveLength(3);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(api.getEnrolledClasses).toHaveBeenCalledTimes(2);
    consoleError.mockRestore();
  });
});
