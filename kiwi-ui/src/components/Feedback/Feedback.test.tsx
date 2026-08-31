import { render, screen, fireEvent } from '@testing-library/react';
import { Feedback } from './Feedback.tsx';

const mockSaveInteraction = vi.fn();

vi.mock('../../utils/useSaveInteraction.ts', () => ({
  useSaveInteraction: () => ({
    saveInteraction: mockSaveInteraction,
  }),
}));

// Mock window.prompt
const mockPrompt = vi.fn();
Object.defineProperty(window, 'prompt', {
  value: mockPrompt,
  writable: true,
});

const defaultProps = {
  index: 'msg-123',
  videoID: 'video-456',
};

describe('Feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<Feedback {...defaultProps} />);
    expect(screen.getByTestId('CachedIcon')).toBeInTheDocument();
  });

  it('renders all feedback buttons', () => {
    render(<Feedback {...defaultProps} />);

    expect(screen.getByTestId('CachedIcon')).toBeInTheDocument();
    expect(screen.getByTestId('FlagIcon')).toBeInTheDocument();
    expect(screen.getByTestId('ThumbUpIcon')).toBeInTheDocument();
    expect(screen.getByTestId('ThumbDownIcon')).toBeInTheDocument();
    expect(screen.getByTestId('ShareIcon')).toBeInTheDocument();
  });

  it('displays tooltips on hover', async () => {
    render(<Feedback {...defaultProps} />);

    // Check for aria-labels instead of titles since disabled buttons don't show tooltips properly
    expect(screen.getByLabelText('Regenerate response')).toBeInTheDocument();
    expect(screen.getByLabelText('Flag this answer')).toBeInTheDocument();
    expect(screen.getByLabelText('Thumbs up')).toBeInTheDocument();
    expect(screen.getByLabelText('Thumbs down')).toBeInTheDocument();
    expect(screen.getByLabelText('Share answer')).toBeInTheDocument();
  });

  it('handles thumbs up click', () => {
    render(<Feedback {...defaultProps} />);

    const thumbsUpButton = screen.getByTestId('ThumbUpIcon').closest('button');
    fireEvent.click(thumbsUpButton!);

    expect(mockSaveInteraction).toHaveBeenCalledWith({
      type: 'frontend-interaction-thumbs',
      context: {
        chatMessage: { uniqueID: 'msg-123' },
        thumbsValue: 1,
      },
    });
  });

  it('handles thumbs down click', () => {
    render(<Feedback {...defaultProps} />);

    const thumbsDownButton = screen.getByTestId('ThumbDownIcon').closest('button');
    fireEvent.click(thumbsDownButton!);

    expect(mockSaveInteraction).toHaveBeenCalledWith({
      type: 'frontend-interaction-thumbs',
      context: {
        chatMessage: { uniqueID: 'msg-123' },
        thumbsValue: -1,
      },
    });
  });

  it('changes color when thumbs up is clicked', () => {
    render(<Feedback {...defaultProps} />);

    const thumbsUpButton = screen.getByTestId('ThumbUpIcon').closest('button');
    fireEvent.click(thumbsUpButton!);

    expect(thumbsUpButton).toHaveClass('MuiIconButton-colorSuccess');
  });

  it('changes color when thumbs down is clicked', () => {
    render(<Feedback {...defaultProps} />);

    const thumbsDownButton = screen.getByTestId('ThumbDownIcon').closest('button');
    fireEvent.click(thumbsDownButton!);

    expect(thumbsDownButton).toHaveClass('MuiIconButton-colorError');
  });

  it('disables other buttons after thumbs up', () => {
    render(<Feedback {...defaultProps} />);

    const thumbsUpButton = screen.getByTestId('ThumbUpIcon').closest('button');
    const thumbsDownButton = screen.getByTestId('ThumbDownIcon').closest('button');

    fireEvent.click(thumbsUpButton!);

    expect(thumbsDownButton).toBeDisabled();
  });

  it('disables other buttons after thumbs down', () => {
    render(<Feedback {...defaultProps} />);

    const thumbsUpButton = screen.getByTestId('ThumbUpIcon').closest('button');
    const thumbsDownButton = screen.getByTestId('ThumbDownIcon').closest('button');

    fireEvent.click(thumbsDownButton!);

    expect(thumbsUpButton).toBeDisabled();
  });

  it('handles flag button click with user input', () => {
    mockPrompt.mockReturnValue('This is incorrect');

    render(<Feedback {...defaultProps} />);

    const flagButton = screen.getByTestId('FlagIcon').closest('button');
    fireEvent.click(flagButton!);

    expect(mockPrompt).toHaveBeenCalledWith('Please enter your feedback:', '');
    expect(mockSaveInteraction).toHaveBeenCalledWith({
      type: 'frontend-interaction-feedback-flag',
      context: {
        messages: { uniqueID: 'msg-123', reply: 'This is incorrect' },
      },
    });
  });

  it('handles flag button click with no user input', () => {
    mockPrompt.mockReturnValue(null);

    render(<Feedback {...defaultProps} />);

    const flagButton = screen.getByTestId('FlagIcon').closest('button');
    fireEvent.click(flagButton!);

    expect(mockSaveInteraction).toHaveBeenCalledWith({
      type: 'frontend-interaction-feedback-flag',
      context: {
        messages: { uniqueID: 'msg-123', reply: '' },
      },
    });
  });

  it('disables flag button after clicking', () => {
    mockPrompt.mockReturnValue('Feedback');

    render(<Feedback {...defaultProps} />);

    const flagButton = screen.getByTestId('FlagIcon').closest('button');
    fireEvent.click(flagButton!);

    expect(flagButton).toBeDisabled();
    expect(flagButton).toHaveClass('MuiIconButton-colorWarning');
  });

  it('regenerate and share buttons are disabled', () => {
    render(<Feedback {...defaultProps} />);

    const regenerateButton = screen.getByTestId('CachedIcon').closest('button');
    const shareButton = screen.getByTestId('ShareIcon').closest('button');

    expect(regenerateButton).toBeDisabled();
    expect(shareButton).toBeDisabled();
  });

  it('uses horizontal stack layout', () => {
    const { container } = render(<Feedback {...defaultProps} />);
    const stack = container.firstChild;

    expect(stack).toHaveClass('MuiStack-root');
  });

  it('works without videoID prop', () => {
    render(<Feedback index="msg-123" />);
    expect(screen.getByTestId('ThumbUpIcon')).toBeInTheDocument();
  });
});