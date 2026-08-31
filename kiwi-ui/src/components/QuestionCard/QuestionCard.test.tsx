import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import QuestionCard, { QuestionCardProps } from './QuestionCard.tsx';

// Mock the API client
vi.mock('../../utils/api.ts', () => ({
  default: {
    interactionControllerToggleUpvote: vi.fn(),
  },
}));

// Mock ReactMarkdown
vi.mock('react-markdown', () => {
  return {
    default: ({ children }: { children: string }) => <div data-testid="markdown-content">{children}</div>,
  };
});

// Mock remark and rehype plugins
vi.mock('remark-math', () => ({
  default: () => {},
}));
vi.mock('rehype-mathjax', () => ({
  default: () => {},
}));

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

const defaultProps: QuestionCardProps = {
  id: 'question-123',
  prompt: 'How do I implement a binary search tree?',
  answer: 'A binary search tree is a hierarchical data structure...',
  numUpvotes: 5,
  upvoted: false,
  time: new Date(Date.now() - 3600000), // 1 hour ago
  instructorApproved: false,
};

describe('QuestionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithTheme(<QuestionCard {...defaultProps} />);
    expect(screen.getByText('How do I implement a binary search tree?')).toBeInTheDocument();
  });

  it('displays the question prompt', () => {
    renderWithTheme(<QuestionCard {...defaultProps} />);
    expect(screen.getByText('How do I implement a binary search tree?')).toBeInTheDocument();
  });

  it('shows upvote count and time', () => {
    renderWithTheme(<QuestionCard {...defaultProps} />);
    expect(screen.getByText(/5 Upvoted/)).toBeInTheDocument();
    expect(screen.getByText(/1 hour ago/)).toBeInTheDocument();
  });

  it('does not show answer initially (collapsed state)', () => {
    renderWithTheme(<QuestionCard {...defaultProps} />);
    expect(screen.queryByTestId('markdown-content')).not.toBeInTheDocument();
  });

  it('expands to show answer when clicked', () => {
    renderWithTheme(<QuestionCard {...defaultProps} />);

    // Click on the card (not a button role, but clickable)
    const card = screen.getByText('How do I implement a binary search tree?').closest('.MuiCard-root');
    fireEvent.click(card!);
    expect(screen.getByTestId('markdown-content')).toBeInTheDocument();
  });

  it('shows upvote and collapse buttons when expanded', () => {
    renderWithTheme(<QuestionCard {...defaultProps} />);

    const card = screen.getByText('How do I implement a binary search tree?').closest('.MuiCard-root');
    fireEvent.click(card!);

    expect(screen.getByLabelText('upvote')).toBeInTheDocument();
    expect(screen.getByLabelText('expandless')).toBeInTheDocument();
  });

  it('handles upvote click correctly', async () => {
    const apiClient = await import('../../utils/api.ts');
    renderWithTheme(<QuestionCard {...defaultProps} />);

    // Expand the card first
    const card = screen.getByText('How do I implement a binary search tree?').closest('.MuiCard-root');
    fireEvent.click(card!);

    // Click upvote button
    fireEvent.click(screen.getByLabelText('upvote'));

    await waitFor(() => {
      expect(screen.getByText(/6 Upvoted/)).toBeInTheDocument();
    });

    expect(apiClient.default.interactionControllerToggleUpvote).toHaveBeenCalledWith({
      toggleUpvoteRequest: { id: 'question-123' }
    });
  });

  it('handles collapse button click', () => {
    renderWithTheme(<QuestionCard {...defaultProps} />);

    // Expand the card
    const card = screen.getByText('How do I implement a binary search tree?').closest('.MuiCard-root');
    fireEvent.click(card!);
    expect(screen.getByTestId('markdown-content')).toBeInTheDocument();

    // Collapse the card
    fireEvent.click(screen.getByLabelText('expandless'));
    expect(screen.queryByTestId('markdown-content')).not.toBeInTheDocument();
  });

  it('shows instructor approved status when applicable', () => {
    renderWithTheme(<QuestionCard {...defaultProps} instructorApproved={true} />);
    expect(screen.getByText(/Instructor Approved/)).toBeInTheDocument();
  });

  it('handles already upvoted state', () => {
    renderWithTheme(<QuestionCard {...defaultProps} upvoted={true} />);

    // Expand the card
    const card = screen.getByText('How do I implement a binary search tree?').closest('.MuiCard-root');
    fireEvent.click(card!);

    const upvoteButton = screen.getByLabelText('upvote');
    expect(upvoteButton).toBeInTheDocument();
  });

  it('formats time correctly for different durations', () => {
    const justNow = new Date();
    renderWithTheme(<QuestionCard {...defaultProps} time={justNow} />);
    expect(screen.getByText(/Just now/)).toBeInTheDocument();
  });

  it('prevents event propagation on button clicks', () => {
    const handleClick = vi.fn();
    renderWithTheme(
      <div onClick={handleClick}>
        <QuestionCard {...defaultProps} />
      </div>
    );

    // Expand the card
    const card = screen.getByText('How do I implement a binary search tree?').closest('.MuiCard-root');
    fireEvent.click(card!);

    // Click upvote button - should not trigger parent click
    fireEvent.click(screen.getByLabelText('upvote'));

    // The parent click handler should not be called for the upvote button
    expect(handleClick).toHaveBeenCalledTimes(1); // Only from expanding the card
  });

  it('has proper card styling', () => {
    const { container } = renderWithTheme(<QuestionCard {...defaultProps} />);
    const card = container.querySelector('.MuiCard-root');

    expect(card).toHaveStyle({
      backgroundColor: '#fff',
      borderRadius: '8px'
    });
  });
});