import { render, screen, fireEvent, act } from '@testing-library/react';
import { GlobalChatButton } from './GlobalChatButton.tsx';

const hoisted = vi.hoisted(() => ({
  chatState: {
    toggleChat: vi.fn(),
    isOpen: false,
    messages: [] as { role: 'user' | 'assistant'; content: string; timestamp: number }[],
    activeTab: 'materials' as string,
  },
}));

vi.mock('../../context/GlobalChatContext', () => ({
  useGlobalChat: () => hoisted.chatState,
}));

const FAB_SIZE = 56;
const EDGE_MARGIN = 8;

/** jsdom's default viewport. */
const VIEWPORT_WIDTH = 1024;
const VIEWPORT_HEIGHT = 768;

const DEFAULT_LEFT = VIEWPORT_WIDTH - FAB_SIZE - 24; // 944
const DEFAULT_TOP = VIEWPORT_HEIGHT - FAB_SIZE - 96; // 616
const RIGHT_EDGE = VIEWPORT_WIDTH - FAB_SIZE - EDGE_MARGIN; // 960
const BOTTOM_EDGE = VIEWPORT_HEIGHT - FAB_SIZE - EDGE_MARGIN; // 704

const getWrapper = () => screen.getByTestId('global-chat-button-draggable');
const getFab = () => screen.getByRole('button', { name: 'Open Kiwi chat' });

/** Drive a full mouse gesture through react-draggable's document listeners. */
function drag(from: { x: number; y: number }, to: { x: number; y: number }) {
  fireEvent.mouseDown(getFab(), { clientX: from.x, clientY: from.y, button: 0 });
  fireEvent.mouseMove(document, { clientX: to.x, clientY: to.y });
  // Fired on the FAB so it bubbles to react-draggable's document listener and
  // still lets MUI's ripple settle.
  fireEvent.mouseUp(getFab(), { clientX: to.x, clientY: to.y });
  // The browser fires a click on the FAB right after the gesture ends.
  fireEvent.click(getFab());
}

const mockedLocalStorage = window.localStorage as unknown as {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
};

describe('GlobalChatButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedLocalStorage.getItem.mockReturnValue(null);
    hoisted.chatState.isOpen = false;
    hoisted.chatState.messages = [];
    hoisted.chatState.activeTab = 'materials';
    window.innerWidth = VIEWPORT_WIDTH;
    window.innerHeight = VIEWPORT_HEIGHT;
  });

  it('renders nothing when not visible', () => {
    render(<GlobalChatButton visible={false} />);
    expect(screen.queryByRole('button', { name: 'Open Kiwi chat' })).not.toBeInTheDocument();
  });

  it('rests in the bottom-right corner by default', () => {
    render(<GlobalChatButton />);
    expect(getWrapper()).toHaveStyle({ transform: `translate(${DEFAULT_LEFT}px,${DEFAULT_TOP}px)` });
  });

  it('rests in the bottom-left corner on app tabs', () => {
    hoisted.chatState.activeTab = 'app';
    render(<GlobalChatButton />);
    expect(getWrapper()).toHaveStyle({ transform: `translate(24px,${DEFAULT_TOP}px)` });
  });

  it('uses a stored position, clamped into the viewport', () => {
    mockedLocalStorage.getItem.mockReturnValue(JSON.stringify({ left: 5000, top: 5000 }));
    render(<GlobalChatButton />);
    expect(getWrapper()).toHaveStyle({ transform: `translate(${RIGHT_EDGE}px,${BOTTOM_EDGE}px)` });
  });

  it('toggles the chat on a plain click', () => {
    render(<GlobalChatButton />);
    fireEvent.click(getFab());
    expect(hoisted.chatState.toggleChat).toHaveBeenCalledTimes(1);
  });

  it('treats sub-threshold movement as a click, not a drag', () => {
    render(<GlobalChatButton />);
    drag({ x: 900, y: 600 }, { x: 902, y: 601 });

    expect(hoisted.chatState.toggleChat).toHaveBeenCalledTimes(1);
    // Position is untouched and nothing was persisted.
    expect(getWrapper()).toHaveStyle({ transform: `translate(${DEFAULT_LEFT}px,${DEFAULT_TOP}px)` });
    expect(mockedLocalStorage.setItem).not.toHaveBeenCalled();
  });

  it('snaps to the left edge and persists when released on the left half', () => {
    render(<GlobalChatButton />);
    // Moves the FAB by (-500, -300) from its default spot → x 444, y 316.
    drag({ x: 900, y: 600 }, { x: 400, y: 300 });

    expect(getWrapper()).toHaveStyle({ transform: `translate(${EDGE_MARGIN}px,316px)` });
    expect(mockedLocalStorage.setItem).toHaveBeenCalledWith(
      'globalChatButtonPosition',
      JSON.stringify({ left: EDGE_MARGIN, top: 316 })
    );
    // The click that trails the drag must not open the chat.
    expect(hoisted.chatState.toggleChat).not.toHaveBeenCalled();
  });

  it('temporarily disables iframe pointer events for the duration of a drag', () => {
    render(<GlobalChatButton />);

    fireEvent.mouseDown(getFab(), { clientX: 900, clientY: 600, button: 0 });
    expect(document.documentElement).toHaveClass('global-chat-dragging');

    fireEvent.mouseMove(document, { clientX: 400, clientY: 300 });
    fireEvent.mouseUp(getFab(), { clientX: 400, clientY: 300 });
    expect(document.documentElement).not.toHaveClass('global-chat-dragging');
  });

  it('snaps to the right edge and clamps vertically when dragged past the viewport', () => {
    render(<GlobalChatButton />);
    // Moves by (+600, +100) → x 1544, y 716, both outside the allowed bounds.
    drag({ x: 100, y: 100 }, { x: 700, y: 200 });

    expect(getWrapper()).toHaveStyle({ transform: `translate(${RIGHT_EDGE}px,${BOTTOM_EDGE}px)` });
    expect(mockedLocalStorage.setItem).toHaveBeenCalledWith(
      'globalChatButtonPosition',
      JSON.stringify({ left: RIGHT_EDGE, top: BOTTOM_EDGE })
    );
    expect(hoisted.chatState.toggleChat).not.toHaveBeenCalled();
  });

  it('opens the chat again on the next real click after a drag', async () => {
    vi.useFakeTimers();
    try {
      render(<GlobalChatButton />);
      drag({ x: 900, y: 600 }, { x: 400, y: 300 });
      expect(hoisted.chatState.toggleChat).not.toHaveBeenCalled();

      // The one-shot click guard clears on the next tick.
      act(() => {
        vi.runAllTimers();
      });
      fireEvent.click(getFab());
      expect(hoisted.chatState.toggleChat).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('re-clamps a dragged position when the viewport shrinks', () => {
    mockedLocalStorage.getItem.mockReturnValue(JSON.stringify({ left: 900, top: 600 }));
    render(<GlobalChatButton />);
    expect(getWrapper()).toHaveStyle({ transform: 'translate(900px,600px)' });

    act(() => {
      window.innerWidth = 500;
      window.innerHeight = 400;
      window.dispatchEvent(new Event('resize'));
    });

    expect(getWrapper()).toHaveStyle({ transform: `translate(${500 - FAB_SIZE - EDGE_MARGIN}px,${400 - FAB_SIZE - EDGE_MARGIN}px)` });
  });

  it('shows the unread badge only when there are messages', () => {
    const { rerender } = render(<GlobalChatButton />);
    expect(screen.queryByText('3')).not.toBeInTheDocument();

    hoisted.chatState.messages = [
      { role: 'user', content: 'a', timestamp: 1 },
      { role: 'assistant', content: 'b', timestamp: 2 },
      { role: 'user', content: 'c', timestamp: 3 },
    ];
    rerender(<GlobalChatButton />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
