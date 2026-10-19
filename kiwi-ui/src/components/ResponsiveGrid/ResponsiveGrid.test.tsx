import { render, screen } from '@testing-library/react';
import ResponsiveGrid from './ResponsiveGrid.tsx';

describe('ResponsiveGrid', () => {
  it('renders without crashing', () => {
    render(
      <ResponsiveGrid>
        <div>Child 1</div>
        <div>Child 2</div>
      </ResponsiveGrid>
    );
    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
  });

  it('renders children correctly', () => {
    render(
      <ResponsiveGrid>
        <div data-testid="child-1">First child</div>
        <div data-testid="child-2">Second child</div>
        <div data-testid="child-3">Third child</div>
      </ResponsiveGrid>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
    expect(screen.getByTestId('child-3')).toBeInTheDocument();
  });

  it('applies default minWidth of 310px, capped at the container width', () => {
    const { container } = render(
      <ResponsiveGrid>
        <div>Content</div>
      </ResponsiveGrid>
    );

    const gridContainer = container.firstChild;
    expect(gridContainer).toHaveStyle({
      gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 310px), 1fr))'
    });
  });

  it('accepts custom minWidth', () => {
    const { container } = render(
      <ResponsiveGrid minWidth="250px">
        <div>Content</div>
      </ResponsiveGrid>
    );

    const gridContainer = container.firstChild;
    expect(gridContainer).toHaveStyle({
      gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 250px), 1fr))'
    });
  });

  it('applies grid display and gap', () => {
    const { container } = render(
      <ResponsiveGrid>
        <div>Content</div>
      </ResponsiveGrid>
    );

    const gridContainer = container.firstChild;
    expect(gridContainer).toHaveStyle({
      display: 'grid',
      width: '100%'
    });
  });

  it('accepts custom sx styles', () => {
    const { container } = render(
      <ResponsiveGrid sx={{ backgroundColor: 'red', padding: '20px' }}>
        <div>Content</div>
      </ResponsiveGrid>
    );

    const gridContainer = container.firstChild;
    expect(gridContainer).toHaveStyle({
      'background-color': 'rgb(255, 0, 0)',
      padding: '20px'
    });
  });

  it('merges custom sx with default styles', () => {
    const { container } = render(
      <ResponsiveGrid sx={{ margin: '10px' }}>
        <div>Content</div>
      </ResponsiveGrid>
    );

    const gridContainer = container.firstChild;
    expect(gridContainer).toHaveStyle({
      display: 'grid',
      width: '100%',
      margin: '10px'
    });
  });

  it('is a Box component', () => {
    const { container } = render(
      <ResponsiveGrid>
        <div>Content</div>
      </ResponsiveGrid>
    );

    expect(container.firstChild).toHaveClass('MuiBox-root');
  });
});