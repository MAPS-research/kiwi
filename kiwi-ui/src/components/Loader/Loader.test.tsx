import { render, screen, waitFor, act } from '@testing-library/react';
import Loader from './Loader.tsx';

// Mock the CSS import
vi.mock('./loader.css', () => ({}));

describe('Loader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders without crashing', () => {
    render(<Loader />);
    expect(screen.getByText('Thinking.')).toBeInTheDocument();
  });

  it('starts with a single dot', () => {
    render(<Loader />);
    expect(screen.getByText('Thinking.')).toBeInTheDocument();
  });

  it('animates dots correctly', () => {
    render(<Loader />);

    // Initial state: single dot
    expect(screen.getByText('Thinking.')).toBeInTheDocument();

    // After 500ms: two dots
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByText('Thinking..')).toBeInTheDocument();

    // After another 500ms: three dots
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByText('Thinking...')).toBeInTheDocument();

    // After another 500ms: back to single dot
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByText('Thinking.')).toBeInTheDocument();
  });

  it('applies loader class', () => {
    const { container } = render(<Loader />);
    const loaderElement = container.firstChild;

    expect(loaderElement).toHaveClass('loader');
  });

  it('cleans up interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    const { unmount } = render(<Loader />);

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});