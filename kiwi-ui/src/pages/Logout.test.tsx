import { render, screen } from '@testing-library/react';
import { Logout } from './Logout.tsx';

const mockLogout = vi.fn();

vi.mock('../auth/AuthContext.tsx', () => ({
  useAuth: () => ({
    logout: mockLogout,
  }),
}));

describe('Logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<Logout />);
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('calls logout function on render', () => {
    render(<Logout />);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('displays logout text', () => {
    render(<Logout />);
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('calls logout immediately when component mounts', () => {
    expect(mockLogout).not.toHaveBeenCalled();
    render(<Logout />);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('only calls logout once per mount', () => {
    const { unmount } = render(<Logout />);
    expect(mockLogout).toHaveBeenCalledTimes(1);

    unmount();
    render(<Logout />);
    expect(mockLogout).toHaveBeenCalledTimes(2); // Once for each mount
  });
});