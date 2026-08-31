import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FormLink from './FormLink.tsx';

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('FormLink', () => {
  it('renders without crashing', () => {
    renderWithRouter(<FormLink to="/test">Test Link</FormLink>);
    expect(screen.getByText('Test Link')).toBeInTheDocument();
  });

  it('renders internal link with router', () => {
    renderWithRouter(<FormLink to="/dashboard">Dashboard</FormLink>);
    const link = screen.getByText('Dashboard');
    expect(link.closest('a')).toHaveAttribute('href', '/dashboard');
  });

  it('renders external link', () => {
    render(<FormLink href="https://example.com">External Link</FormLink>);
    const link = screen.getByText('External Link');
    expect(link.closest('a')).toHaveAttribute('href', 'https://example.com');
  });

  it('applies custom font weight', () => {
    render(<FormLink href="/test" fontWeight={700}>Bold Link</FormLink>);
    const link = screen.getByText('Bold Link');
    expect(link).toHaveStyle({ fontWeight: 700 });
  });

  it('applies default font weight', () => {
    render(<FormLink href="/test">Normal Link</FormLink>);
    const link = screen.getByText('Normal Link');
    expect(link).toHaveStyle({ fontWeight: 400 });
  });

  it('applies white color styling', () => {
    render(<FormLink href="/test">White Link</FormLink>);
    const link = screen.getByText('White Link');
    expect(link).toHaveStyle({ color: '#fff' });
  });

  it('has no underline by default', () => {
    render(<FormLink href="/test">No Underline</FormLink>);
    const link = screen.getByText('No Underline');
    expect(link).toHaveClass('MuiLink-underlineNone');
  });

  it('applies custom sx styles', () => {
    render(
      <FormLink href="/test" sx={{ fontSize: '20px' }}>
        Custom Style
      </FormLink>
    );
    const link = screen.getByText('Custom Style');
    expect(link).toHaveStyle({ fontSize: '20px' });
  });

  it('passes through additional props', () => {
    render(
      <FormLink href="/test" target="_blank" rel="noopener">
        External Target
      </FormLink>
    );
    const link = screen.getByText('External Target').closest('a');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener');
  });
});