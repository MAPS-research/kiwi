import { render, screen } from '@testing-library/react';
import LogoBox from './LogoBox.tsx';

describe('LogoBox', () => {
  it('renders without crashing', () => {
    render(<LogoBox />);
    expect(screen.getByAltText('Kiwi logo')).toBeInTheDocument();
  });

  it('displays institution logo image', () => {
    render(<LogoBox />);
    const image = screen.getByAltText('Kiwi logo');
    expect(image).toHaveAttribute('src', '/assets/images/kiwi-mark.svg');
  });

  it('has correct image dimensions', () => {
    render(<LogoBox />);
    const image = screen.getByAltText('Kiwi logo');
    expect(image).toHaveAttribute('height', '140');
    expect(image).toHaveAttribute('width', '140');
  });

  it('applies object-fit cover style', () => {
    render(<LogoBox />);
    const image = screen.getByAltText('Kiwi logo');
    expect(image).toHaveStyle({ objectFit: 'cover' });
  });

  it('is wrapped in a Box container', () => {
    const { container } = render(<LogoBox />);
    const box = container.firstChild;
    expect(box).toHaveClass('MuiBox-root');
  });
});