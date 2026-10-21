import React, { useRef } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createKiwiTheme } from '../../Theme.ts';
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

const PLACEHOLDER = 'Ask a question, or type / for commands';

const renderWithTheme = (component: React.ReactElement) =>
  render(<ThemeProvider theme={createKiwiTheme({ dark: false })}>{component}</ThemeProvider>);

// Test wrapper component to provide formRef
const TestWrapper = ({
  props,
  onSubmit = (e: React.FormEvent) => e.preventDefault(),
}: {
  props: Partial<React.ComponentProps<typeof ChatField>>;
  onSubmit?: (e: React.FormEvent) => void;
}) => {
  const formRef = useRef<HTMLFormElement>(null!);
  return (
    <form ref={formRef} onSubmit={onSubmit}>
      <ChatField botAnswering={false} setPrompt={vi.fn()} prompt="" {...props} formRef={formRef} />
    </form>
  );
};

describe('ChatField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the placeholder, which also names the box', () => {
    renderWithTheme(<TestWrapper props={{}} />);

    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: PLACEHOLDER })).toBeInTheDocument();
  });

  it('displays the current prompt value', () => {
    renderWithTheme(<TestWrapper props={{ prompt: 'Test message' }} />);

    expect(screen.getByDisplayValue('Test message')).toBeInTheDocument();
  });

  it('calls setPrompt when text changes', () => {
    const setPrompt = vi.fn();
    renderWithTheme(<TestWrapper props={{ setPrompt }} />);

    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: 'New message' } });

    expect(setPrompt).toHaveBeenCalledWith('New message');
  });

  it('keeps Send in the box, faded while the box is empty', () => {
    renderWithTheme(<TestWrapper props={{}} />);

    const send = screen.getByRole('button', { name: 'Send message' });
    expect(send).toHaveAttribute('aria-disabled', 'true');
    expect(send).not.toBeDisabled();
    expect(screen.getByTestId('chat-composer-box')).toContainElement(send);
  });

  it('sends with the Send button once there is text', () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    renderWithTheme(<TestWrapper props={{ prompt: 'Why is it NA?' }} onSubmit={onSubmit} />);

    const send = screen.getByRole('button', { name: 'Send message' });
    expect(send).not.toHaveAttribute('aria-disabled');
    fireEvent.click(send);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('sends on Enter, keeps Shift+Enter for a new line, and sends nothing empty', () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const { unmount } = renderWithTheme(<TestWrapper props={{ prompt: 'Hello' }} onSubmit={onSubmit} />);

    fireEvent.keyDown(screen.getByPlaceholderText(PLACEHOLDER), { key: 'Enter', shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByPlaceholderText(PLACEHOLDER), { key: 'Enter', shiftKey: false });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    unmount();

    renderWithTheme(<TestWrapper props={{ prompt: '   ' }} onSubmit={onSubmit} />);
    fireEvent.keyDown(screen.getByPlaceholderText(PLACEHOLDER), { key: 'Enter', shiftKey: false });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('turns Send into Stop while Kiwi answers, with the reason under the box', () => {
    const onStop = vi.fn();
    renderWithTheme(<TestWrapper props={{ botAnswering: true, onStop, prompt: '' }} />);

    expect(screen.queryByRole('button', { name: 'Send message' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Stop answering' }));
    expect(onStop).toHaveBeenCalledTimes(1);

    const box = screen.getByPlaceholderText(PLACEHOLDER);
    expect(box).not.toBeDisabled();
    expect(box).toHaveAttribute('readonly');
    expect(box).toHaveAttribute('aria-disabled', 'true');
    expect(box).toHaveAccessibleDescription('Kiwi is answering. Select Stop to interrupt.');
  });

  it('stops the answer on Escape in the box', () => {
    const onStop = vi.fn();
    renderWithTheme(<TestWrapper props={{ botAnswering: true, onStop }} />);

    fireEvent.keyDown(screen.getByPlaceholderText(PLACEHOLDER), { key: 'Escape' });

    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('shows the commands menu when typing /', async () => {
    renderWithTheme(<TestWrapper props={{}} />);

    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: '/', selectionEnd: 1 } });

    await waitFor(() => {
      expect(screen.getByTestId('chat-commands')).toBeVisible();
    });
  });

  it('closes the commands menu on Escape and keeps the key from the chat panel', async () => {
    const panelKeyDown = vi.fn();
    renderWithTheme(
      <div onKeyDown={panelKeyDown}>
        <TestWrapper props={{}} />
      </div>
    );

    const box = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.change(box, { target: { value: '/', selectionEnd: 1 } });
    await waitFor(() => expect(screen.getByTestId('chat-commands')).toBeVisible());

    fireEvent.keyDown(box, { key: 'Escape' });

    expect(screen.getByTestId('chat-commands')).not.toBeVisible();
    expect(panelKeyDown).not.toHaveBeenCalled();
  });

  it('hides the commands menu when not typing a command', () => {
    renderWithTheme(<TestWrapper props={{}} />);

    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: 'regular text' } });

    expect(screen.getByTestId('chat-commands')).not.toBeVisible();
  });

  it('uses a multiline text box', () => {
    renderWithTheme(<TestWrapper props={{}} />);

    expect(screen.getByPlaceholderText(PLACEHOLDER).tagName).toBe('TEXTAREA');
  });
});
