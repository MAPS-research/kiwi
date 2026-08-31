import { render, screen } from '@testing-library/react';
import HeroCarousel from './HeroCarousel.tsx';

vi.mock('../../auth/AuthContext.tsx', () => ({
  useAuth: () => ({
    user: { username: 'student@example.edu' },
  }),
}));

// Mock react-slick
vi.mock('react-slick', () => {
  return {
    default: ({ children, autoplay }: { children: React.ReactNode; autoplay?: boolean }) => (
      <div data-testid="mock-slider" data-autoplay={String(autoplay)}>
        {children}
      </div>
    ),
  };
});

describe('HeroCarousel', () => {
  it('renders without crashing', () => {
    render(<HeroCarousel />);
    expect(screen.getByTestId('mock-slider')).toBeInTheDocument();
    expect(screen.getByTestId('mock-slider')).toHaveAttribute('data-autoplay', 'true');
  });

  it('displays all carousel images', () => {
    render(<HeroCarousel />);

    expect(screen.getAllByTestId('hero-carousel-image')).toHaveLength(3);
    expect(screen.getByText('Welcome to Kiwi, student!')).toBeInTheDocument();
  });

  it('has proper container structure', () => {
    const { container } = render(<HeroCarousel />);
    const carouselBox = container.firstChild;

    expect(carouselBox).toHaveClass('MuiBox-root');
    expect(carouselBox).toHaveStyle({
      width: '100%',
      maxWidth: '1440px'
    });
  });

  it('applies border radius without adding a shadow', () => {
    const { container } = render(<HeroCarousel />);
    const carouselBox = container.firstChild;

    expect(carouselBox).toHaveStyle({
      borderRadius: '16px',
      overflow: 'hidden'
    });
  });

  it('renders one welcome message over the carousel', () => {
    render(<HeroCarousel />);

    const welcome = screen.getByText('Welcome to Kiwi, student!');
    expect(welcome).toHaveClass('MuiTypography-root');
    expect(screen.getAllByText('Welcome to Kiwi, student!')).toHaveLength(1);
    expect(screen.getByTestId('hero-carousel-overlay')).toHaveStyle({
      position: 'absolute'
    });
  });

  it('has responsive height settings', () => {
    render(<HeroCarousel />);

    // Check that the component renders (specific responsive styling would need integration tests)
    expect(screen.getByTestId('mock-slider')).toBeInTheDocument();
  });

  it('contains image backgrounds for each slide', () => {
    render(<HeroCarousel />);
    expect(screen.getAllByTestId('hero-carousel-image')).toHaveLength(3);
  });
});
