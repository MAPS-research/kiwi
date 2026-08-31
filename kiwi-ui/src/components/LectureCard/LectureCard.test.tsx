import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import LectureCard from './LectureCard.tsx';

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

const defaultProps = {
  id: 'lecture-123',
  lectureNumber: 'Lecture 1',
  lectureTitle: 'Introduction to Programming',
  instructor: 'Dr. Smith',
  description: 'Basic concepts of programming and computer science fundamentals.'
};

describe('LectureCard', () => {
  it('renders without crashing', () => {
    renderWithProviders(<LectureCard {...defaultProps} />);
    expect(screen.getByText('Introduction to Programming')).toBeInTheDocument();
  });

  it('displays lecture number correctly', () => {
    renderWithProviders(<LectureCard {...defaultProps} />);
    expect(screen.getByText('Lecture 1')).toBeInTheDocument();
  });

  it('displays lecture title correctly', () => {
    renderWithProviders(<LectureCard {...defaultProps} />);
    expect(screen.getByText('Introduction to Programming')).toBeInTheDocument();
  });

  it('displays instructor name correctly', () => {
    renderWithProviders(<LectureCard {...defaultProps} />);
    expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
  });

  it('displays description correctly', () => {
    renderWithProviders(<LectureCard {...defaultProps} />);
    expect(screen.getByText('Basic concepts of programming and computer science fundamentals.')).toBeInTheDocument();
  });

  it('links to correct lecture page', () => {
    renderWithProviders(<LectureCard {...defaultProps} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/lecture/lecture-123');
  });

  it('has proper card structure', () => {
    const { container } = renderWithProviders(<LectureCard {...defaultProps} />);
    expect(container.querySelector('.MuiCard-root')).toBeInTheDocument();
    expect(container.querySelector('.MuiCardContent-root')).toBeInTheDocument();
  });

  it('displays different lecture data correctly', () => {
    const customProps = {
      id: 'lecture-456',
      lectureNumber: 'Lecture 5',
      lectureTitle: 'Advanced Data Structures',
      instructor: 'Prof. Johnson',
      description: 'Trees, graphs, and hash tables implementation.'
    };

    renderWithProviders(<LectureCard {...customProps} />);

    expect(screen.getByText('Lecture 5')).toBeInTheDocument();
    expect(screen.getByText('Advanced Data Structures')).toBeInTheDocument();
    expect(screen.getByText('Prof. Johnson')).toBeInTheDocument();
    expect(screen.getByText('Trees, graphs, and hash tables implementation.')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/lecture/lecture-456');
  });

  it('has minimum height set for consistent layout', () => {
    const { container } = renderWithProviders(<LectureCard {...defaultProps} />);
    const cardContent = container.querySelector('.MuiCardContent-root');
    expect(cardContent).toHaveStyle({ minHeight: '220px' });
  });

  it('has top border styling', () => {
    const { container } = renderWithProviders(<LectureCard {...defaultProps} />);
    const card = container.querySelector('.MuiCard-root');
    expect(card).toHaveStyle({ borderTop: '24px solid #4F355E' });
  });

  it('applies hover effects via CSS', () => {
    const { container } = renderWithProviders(<LectureCard {...defaultProps} />);
    const card = container.querySelector('.MuiCard-root');
    expect(card).toHaveStyle({ transition: 'transform 0.2s ease-in-out' });
  });
});