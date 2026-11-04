import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CodeCopyButton from './CopyButton.tsx';

// Mock clipboard API
const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

// Mock react-dom/server
vi.mock('react-dom/server', () => ({
  renderToString: vi.fn((element) => {
    // Simple mock that returns a basic string representation
    if (typeof element === 'string') return element;
    if (element?.props?.children) {
      if (typeof element.props.children === 'string') {
        return element.props.children;
      }
    }
    return 'mocked content';
  }),
}));

describe('CodeCopyButton', () => {
  beforeEach(() => {
    mockWriteText.mockClear();
  });

  it('renders without crashing', () => {
    render(<CodeCopyButton>Test content</CodeCopyButton>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('is named "Copy code"', () => {
    render(<CodeCopyButton>Test content</CodeCopyButton>);
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument();
  });

  it('displays ContentCopy icon initially', () => {
    render(<CodeCopyButton>Test content</CodeCopyButton>);
    const button = screen.getByRole('button');
    expect(button.querySelector('[data-testid="ContentCopyIcon"]')).toBeInTheDocument();
  });

  it('handles successful copy', async () => {
    mockWriteText.mockResolvedValue(undefined);

    render(<CodeCopyButton>Copy this text</CodeCopyButton>);

    fireEvent.click(screen.getByRole('button'));

    expect(mockWriteText).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Copied');
    });
  });

  it('shows check icon after successful copy', async () => {
    mockWriteText.mockResolvedValue(undefined);

    render(<CodeCopyButton>Copy this text</CodeCopyButton>);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      const button = screen.getByRole('button');
      expect(button.querySelector('[data-testid="CheckIcon"]')).toBeInTheDocument();
    });
  });

  it('handles copy failure gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    mockWriteText.mockRejectedValue(new Error('Copy failed'));

    render(<CodeCopyButton>Copy this text</CodeCopyButton>);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to copy to clipboard:',
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('works with complex children', () => {
    render(
      <CodeCopyButton>
        <div>Complex content</div>
        <span>Multiple elements</span>
      </CodeCopyButton>
    );

    fireEvent.click(screen.getByRole('button'));
    expect(mockWriteText).toHaveBeenCalled();
  });
});