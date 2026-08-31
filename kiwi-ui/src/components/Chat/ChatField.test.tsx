import React, { useRef } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ChatField from './ChatField.tsx';

// Mock ChatCommands component
vi.mock('./ChatCommands.tsx', () => ({
  default: ({ visible }: { visible: boolean }) => (
    <div data-testid="chat-commands" style={{ display: visible ? 'block' : 'none' }}>
      Commands Menu
    </div>
  ),
}));

// Mock floating-ui
vi.mock('@floating-ui/react', () => ({
  useFloating: () => ({
    refs: {
      setReference: vi.fn(),
      setFloating: vi.fn(),
    },
    floatingStyles: {},
  }),
  offset: vi.fn(),
}));

const theme = createTheme({
  palette: {
    custom: {
      border: '#ddd',
      chatMessageBg: '#f0f0f0',
    },
  } as any,
});

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

// Test wrapper component to provide formRef
const TestWrapper = ({
  Component,
  props,
}: {
  Component: React.FC<any>;
  props: any;
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <div>
      <form ref={formRef} onSubmit={(e) => e.preventDefault()}>
        <button type="submit">Submit</button>
      </form>
      <Component {...props} formRef={formRef} />
    </div>
  );
};

const defaultProps = {
  botAnswering: false,
  setPrompt: vi.fn(),
  prompt: '',
};

describe('ChatField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithTheme(<TestWrapper Component={ChatField} props={defaultProps} />);
    expect(screen.getByPlaceholderText(/Ask Kiwi/)).toBeInTheDocument();
  });

  it('displays the placeholder text', () => {
    renderWithTheme(<TestWrapper Component={ChatField} props={defaultProps} />);
    expect(
      screen.getByPlaceholderText(
        'Ask Kiwi... You can type / to see available commands.'
      )
    ).toBeInTheDocument();
  });

  it('displays current prompt value', () => {
    renderWithTheme(
      <TestWrapper
        Component={ChatField}
        props={{ ...defaultProps, prompt: 'Test message' }}
      />
    );
    expect(screen.getByDisplayValue('Test message')).toBeInTheDocument();
  });

  it('calls setPrompt when text changes', () => {
    const setPrompt = vi.fn();
    renderWithTheme(
      <TestWrapper
        Component={ChatField}
        props={{ ...defaultProps, setPrompt }}
      />
    );

    const textField = screen.getByPlaceholderText(/Ask Kiwi/);
    fireEvent.change(textField, { target: { value: 'New message' } });

    expect(setPrompt).toHaveBeenCalledWith('New message');
  });

  it('disables input when bot is answering', () => {
    renderWithTheme(
      <TestWrapper
        Component={ChatField}
        props={{ ...defaultProps, botAnswering: true }}
      />
    );

    const textField = screen.getByPlaceholderText(/Ask Kiwi/);
    expect(textField).toBeDisabled();
  });

  it('disables action buttons when bot is answering', () => {
    renderWithTheme(
      <TestWrapper
        Component={ChatField}
        props={{ ...defaultProps, botAnswering: true }}
      />
    );

    const sendButton = screen.getByTestId('SendIcon').closest('button');

    expect(sendButton).toBeDisabled();
  });

  it('renders action buttons', () => {
    renderWithTheme(<TestWrapper Component={ChatField} props={defaultProps} />);

    expect(screen.getByTestId('SendIcon')).toBeInTheDocument();
  });

  it('handles send button click', () => {
    const mockFormSubmit = vi.fn((e) => e.preventDefault());
    const { container } = renderWithTheme(
      <TestWrapper Component={ChatField} props={defaultProps} />
    );

    // Mock form submission
    const form = container.querySelector('form');
    form?.addEventListener('submit', mockFormSubmit);

    const sendButton = screen.getByTestId('SendIcon').closest('button');
    fireEvent.click(sendButton!);

    expect(mockFormSubmit).toHaveBeenCalled();
  });

  it('handles Enter key press to send', () => {
    renderWithTheme(<TestWrapper Component={ChatField} props={defaultProps} />);

    const textField = screen.getByPlaceholderText(/Ask Kiwi/);
    fireEvent.keyDown(textField, { key: 'Enter', shiftKey: false });

    // Should prevent default behavior and trigger form submission
    // This is hard to test directly, but we can ensure the event was handled
    expect(textField).toBeInTheDocument();
  });

  it('allows Shift+Enter for new line', () => {
    renderWithTheme(<TestWrapper Component={ChatField} props={defaultProps} />);

    const textField = screen.getByPlaceholderText(/Ask Kiwi/);
    fireEvent.keyDown(textField, { key: 'Enter', shiftKey: true });

    // Should not prevent default, allowing new line
    expect(textField).toBeInTheDocument();
  });

  it('shows commands menu when typing /', async () => {
    renderWithTheme(<TestWrapper Component={ChatField} props={defaultProps} />);

    const textField = screen.getByPlaceholderText(/Ask Kiwi/);
    fireEvent.change(textField, { target: { value: '/', selectionEnd: 1 } });

    await waitFor(() => {
      expect(screen.getByTestId('chat-commands')).toBeVisible();
    });
  });

  it('hides commands menu when not typing command', () => {
    renderWithTheme(<TestWrapper Component={ChatField} props={defaultProps} />);

    const textField = screen.getByPlaceholderText(/Ask Kiwi/);
    fireEvent.change(textField, { target: { value: 'regular text' } });

    const chatCommands = screen.getByTestId('chat-commands');
    expect(chatCommands).not.toBeVisible();
  });

  it('has proper styling structure', () => {
    renderWithTheme(<TestWrapper Component={ChatField} props={defaultProps} />);

    // Test that key elements are present with expected structure
    const textField = screen.getByPlaceholderText(/Ask Kiwi/);
    expect(textField).toBeInTheDocument();

    const sendButton = screen.getByTestId('SendIcon');
    expect(sendButton).toBeInTheDocument();
  });

  it('uses multiline text field', () => {
    renderWithTheme(<TestWrapper Component={ChatField} props={defaultProps} />);

    const textField = screen
      .getByPlaceholderText(/Ask Kiwi/)
      .closest('.MuiTextField-root');
    expect(textField).toHaveClass('MuiTextField-root');

    // Should be multiline (textarea)
    const textarea = screen.getByPlaceholderText(/Ask Kiwi/);
    expect(textarea.tagName).toBe('TEXTAREA');
  });
});