import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { createKiwiTheme } from '../../Theme.ts';
import { GlobalChatModal } from './GlobalChatModal.tsx';

const hoisted = vi.hoisted(() => ({
  chat: {
    isOpen: true,
    displayMode: 'modal' as 'modal' | 'fullscreen' | 'sidepanel' | 'snap',
    displayModeSource: 'default',
    closeChat: vi.fn(),
    setDisplayMode: vi.fn(),
    setDisplayModeAsUser: vi.fn(),
    panelWidth: 420,
    setPanelWidth: vi.fn(),
    isResizingPanel: false,
    setIsResizingPanel: vi.fn(),
    currentClassId: 'class-1',
    currentPdfId: null,
    currentPdfPage: null,
    currentPdfMaterialType: null,
    pdfContent: null,
    activeTab: 'materials',
    activeView: null,
    currentPath: '/class-1',
    activeAppSlug: null,
    activeAppName: null,
    appContext: null,
    appTutoringMode: null,
    pendingPrompt: null,
    clearPendingPrompt: vi.fn(),
    setPendingCode: vi.fn(),
  },
}));

vi.mock('../../context/GlobalChatContext.tsx', () => ({
  MIN_PANEL_WIDTH: 320,
  MAX_PANEL_WIDTH: 800,
  useGlobalChat: () => hoisted.chat,
}));

vi.mock('../TopNav/TopNav.tsx', () => ({ TOP_NAV_HEIGHT: 52 }));

// A stand-in for the chat: one box that keeps Escape to itself, as the composer
// does while it stops an answer, and one that lets it through.
vi.mock('../Chat/ChatCore.tsx', () => ({
  default: () => (
    <div>
      <input
        aria-label="Box that uses Escape"
        onKeyDown={(e) => {
          if (e.key === 'Escape') e.preventDefault();
        }}
      />
      <input aria-label="Box that ignores Escape" />
    </div>
  ),
}));

const renderPanel = () =>
  render(
    <MemoryRouter>
      <ThemeProvider theme={createKiwiTheme({ dark: false })}>
        <button data-kiwi-launcher type="button">
          Open Kiwi chat
        </button>
        <GlobalChatModal />
      </ThemeProvider>
    </MemoryRouter>
  );

const originalMatchMedia = window.matchMedia;

describe('GlobalChatModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.chat.isOpen = true;
    hoisted.chat.displayMode = 'modal';
    hoisted.chat.panelWidth = 420;
    window.innerWidth = 1024;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('is named by its heading, Kiwi chat', () => {
    renderPanel();

    expect(screen.getByRole('heading', { level: 2, name: 'Kiwi chat' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Kiwi chat' })).toBeInTheDocument();
  });

  it('marks the current mode as pressed and switches mode on click', () => {
    hoisted.chat.displayMode = 'sidepanel';
    renderPanel();

    expect(screen.getByRole('button', { name: 'Show as side panel' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Show as modal' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Snap to side' })).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'Snap to side' }));
    expect(hoisted.chat.setDisplayModeAsUser).toHaveBeenCalledWith('snap');
  });

  it('offers Exit fullscreen in fullscreen, which goes back to the modal', () => {
    hoisted.chat.displayMode = 'fullscreen';
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Exit fullscreen' }));
    expect(hoisted.chat.setDisplayModeAsUser).toHaveBeenCalledWith('modal');
  });

  it('closes on Close chat and hands focus back to the launcher', async () => {
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Close chat' }));

    expect(hoisted.chat.closeChat).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open Kiwi chat' })).toHaveFocus());
  });

  it('closes on Escape, unless a control inside has already used the key', () => {
    renderPanel();

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Box that uses Escape' }), { key: 'Escape' });
    expect(hoisted.chat.closeChat).not.toHaveBeenCalled();

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Box that ignores Escape' }), { key: 'Escape' });
    expect(hoisted.chat.closeChat).toHaveBeenCalledTimes(1);
  });

  it('closes when the backdrop behind the modal is clicked', () => {
    renderPanel();

    const backdrop = document.querySelector('.MuiBackdrop-root');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);

    expect(hoisted.chat.closeChat).toHaveBeenCalledTimes(1);
  });

  it('resizes a docked panel from the keyboard on its separator', () => {
    hoisted.chat.displayMode = 'snap';
    renderPanel();

    const separator = screen.getByRole('separator', { name: 'Resize chat panel' });
    expect(separator).toHaveAttribute('aria-orientation', 'vertical');
    expect(separator).toHaveAttribute('aria-valuemin', '320');
    expect(separator).toHaveAttribute('aria-valuemax', '800');
    expect(separator).toHaveAttribute('aria-valuenow', '420');

    fireEvent.keyDown(separator, { key: 'ArrowLeft' });
    fireEvent.keyDown(separator, { key: 'ArrowLeft', shiftKey: true });
    fireEvent.keyDown(separator, { key: 'ArrowRight' });
    fireEvent.keyDown(separator, { key: 'Home' });
    fireEvent.keyDown(separator, { key: 'End' });

    expect(hoisted.chat.setPanelWidth.mock.calls).toEqual([
      [436], // 16 px wider: the panel sits on the right
      [484], // 64 px with Shift
      [404],
      [320],
      [704], // the widest that still leaves 320 px of the page
    ]);
  });

  it('has no separator as a centred modal', () => {
    renderPanel();

    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  it('keeps only Close chat on a phone, where the panel is always fullscreen', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('max-width:599.95px'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    hoisted.chat.displayMode = 'snap';
    renderPanel();

    expect(screen.getByRole('button', { name: 'Close chat' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show as modal' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fullscreen' })).not.toBeInTheDocument();
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });
});
