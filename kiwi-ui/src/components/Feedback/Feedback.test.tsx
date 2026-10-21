import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    mockSaveInteraction.mockResolvedValue(true);
  });

  it('renders the five toolbar buttons by name', () => {
    render(<Feedback {...defaultProps} />);

    expect(screen.getByRole('toolbar', { name: 'Feedback' })).toBeInTheDocument();
    for (const name of ['Regenerate answer', 'Flag this answer', 'Thumbs up', 'Thumbs down', 'Share answer']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
  });

  it('is one tab stop, moved between its buttons with the arrow keys, Home and End', () => {
    render(<Feedback {...defaultProps} />);
    const button = (name: string) => screen.getByRole('button', { name });
    const toolbar = screen.getByRole('toolbar', { name: 'Feedback' });

    const tabStops = screen.getAllByRole('button').filter((b) => b.tabIndex === 0);
    expect(tabStops).toEqual([button('Regenerate answer')]);

    button('Regenerate answer').focus();
    fireEvent.keyDown(toolbar, { key: 'ArrowRight' });
    expect(button('Flag this answer')).toHaveFocus();
    expect(button('Flag this answer')).toHaveAttribute('tabindex', '0');
    expect(button('Regenerate answer')).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(toolbar, { key: 'End' });
    expect(button('Share answer')).toHaveFocus();
    fireEvent.keyDown(toolbar, { key: 'ArrowRight' });
    expect(button('Regenerate answer')).toHaveFocus();
    fireEvent.keyDown(toolbar, { key: 'ArrowLeft' });
    expect(button('Share answer')).toHaveFocus();
    fireEvent.keyDown(toolbar, { key: 'Home' });
    expect(button('Regenerate answer')).toHaveFocus();
  });

  it('keeps Regenerate and Share focusable and says why they are unavailable', () => {
    render(<Feedback {...defaultProps} />);

    const regenerate = screen.getByRole('button', { name: 'Regenerate answer' });
    const share = screen.getByRole('button', { name: 'Share answer' });

    expect(regenerate).toHaveAttribute('aria-disabled', 'true');
    expect(regenerate).not.toBeDisabled();
    expect(regenerate).toHaveAccessibleDescription("Regenerating answers isn't available yet.");
    expect(share).toHaveAttribute('aria-disabled', 'true');
    expect(share).toHaveAccessibleDescription("Sharing answers isn't available yet.");

    fireEvent.click(regenerate);
    fireEvent.click(share);
    expect(mockSaveInteraction).not.toHaveBeenCalled();
  });

  it('saves a thumbs up and draws the chosen thumb filled', async () => {
    render(<Feedback {...defaultProps} />);

    const thumbsUp = screen.getByRole('button', { name: 'Thumbs up' });
    expect(thumbsUp).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('ThumbUpOutlinedIcon')).toBeInTheDocument();

    fireEvent.click(thumbsUp);

    expect(mockSaveInteraction).toHaveBeenCalledWith({
      type: 'frontend-interaction-thumbs',
      context: {
        chatMessage: { uniqueID: 'msg-123' },
        thumbsValue: 1,
      },
    });
    expect(thumbsUp).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('ThumbUpIcon')).toBeInTheDocument();
    expect(screen.getByTestId('ThumbDownOutlinedIcon')).toBeInTheDocument();
  });

  it('saves a thumbs down', () => {
    render(<Feedback {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Thumbs down' }));

    expect(mockSaveInteraction).toHaveBeenCalledWith({
      type: 'frontend-interaction-thumbs',
      context: {
        chatMessage: { uniqueID: 'msg-123' },
        thumbsValue: -1,
      },
    });
  });

  it('lets the student change their mind, and does not save the same choice twice', () => {
    render(<Feedback {...defaultProps} />);

    const thumbsUp = screen.getByRole('button', { name: 'Thumbs up' });
    const thumbsDown = screen.getByRole('button', { name: 'Thumbs down' });

    fireEvent.click(thumbsUp);
    fireEvent.click(thumbsUp);
    fireEvent.click(thumbsDown);

    expect(mockSaveInteraction).toHaveBeenCalledTimes(2);
    expect(thumbsDown).toHaveAttribute('aria-pressed', 'true');
    expect(thumbsUp).toHaveAttribute('aria-pressed', 'false');
  });

  it('announces "Feedback saved." only once the save succeeded', async () => {
    mockSaveInteraction.mockResolvedValueOnce(false);
    render(<Feedback {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Thumbs up' }));
    await waitFor(() => expect(mockSaveInteraction).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('status')).toHaveTextContent('');

    fireEvent.click(screen.getByRole('button', { name: 'Thumbs down' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Feedback saved.'));
  });

  it('asks what is wrong when the answer is flagged', () => {
    mockPrompt.mockReturnValue('This is incorrect');

    render(<Feedback {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Flag this answer' }));

    expect(mockPrompt).toHaveBeenCalledWith("What's wrong with this answer?", '');
    expect(mockSaveInteraction).toHaveBeenCalledWith({
      type: 'frontend-interaction-feedback-flag',
      context: {
        messages: { uniqueID: 'msg-123', reply: 'This is incorrect' },
      },
    });
  });

  it('saves a flag with no reply when the prompt is dismissed', () => {
    mockPrompt.mockReturnValue(null);

    render(<Feedback {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Flag this answer' }));

    expect(mockSaveInteraction).toHaveBeenCalledWith({
      type: 'frontend-interaction-feedback-flag',
      context: {
        messages: { uniqueID: 'msg-123', reply: '' },
      },
    });
  });

  it('flags an answer once', () => {
    mockPrompt.mockReturnValue('Feedback');

    render(<Feedback {...defaultProps} />);

    const flag = screen.getByRole('button', { name: 'Flag this answer' });
    fireEvent.click(flag);

    expect(flag).toBeDisabled();
  });

  it('works without videoID prop', () => {
    render(<Feedback index="msg-123" />);
    expect(screen.getByRole('button', { name: 'Thumbs up' })).toBeInTheDocument();
  });
});
