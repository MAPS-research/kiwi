import { render, screen } from '@testing-library/react';
import TopNav from './Header.tsx';

describe('Header TopNav', () => {
  it('renders without crashing', () => {
    render(<TopNav />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('displays Dashboard title', () => {
    render(<TopNav />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('displays account icon button', () => {
    render(<TopNav />);
    expect(screen.getByTestId('AccountCircleIcon')).toBeInTheDocument();
  });

  it('has white background', () => {
    const { container } = render(<TopNav />);
    const topNavBox = container.firstChild;

    expect(topNavBox).toHaveStyle({
      backgroundColor: '#ffffff'
    });
  });

  it('has proper layout styling', () => {
    const { container } = render(<TopNav />);
    const topNavBox = container.firstChild;

    expect(topNavBox).toHaveStyle({
      width: '100%',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    });
  });

  it('has border bottom', () => {
    const { container } = render(<TopNav />);
    const topNavBox = container.firstChild;

    expect(topNavBox).toHaveStyle({
      borderBottom: '1px solid #eee'
    });
  });

  it('uses correct title color', () => {
    render(<TopNav />);
    const title = screen.getByText('Dashboard');

    expect(title).toHaveStyle({
      color: '#572c85',
      fontWeight: 600
    });
  });

  it('uses correct typography variant for title', () => {
    render(<TopNav />);
    const title = screen.getByText('Dashboard');

    expect(title).toHaveClass('MuiTypography-h5');
  });

  it('has icon button with correct styling', () => {
    render(<TopNav />);
    const iconButton = screen.getByRole('button');

    expect(iconButton).toHaveStyle({
      backgroundColor: '#f1e4ff',
      color: '#572c85'
    });
  });

  it('icon button is positioned at end', () => {
    render(<TopNav />);
    const iconButton = screen.getByRole('button');

    expect(iconButton).toHaveClass('MuiIconButton-edgeEnd');
  });

  it('has proper padding', () => {
    const { container } = render(<TopNav />);
    const topNavBox = container.firstChild;

    expect(topNavBox).toHaveStyle({
      paddingLeft: '24px',
      paddingRight: '24px',
      paddingTop: '16px',
      paddingBottom: '16px'
    });
  });

  it('renders AccountCircle icon', () => {
    render(<TopNav />);
    expect(screen.getByTestId('AccountCircleIcon')).toBeInTheDocument();
  });

  it('is a Box component', () => {
    const { container } = render(<TopNav />);
    expect(container.firstChild).toHaveClass('MuiBox-root');
  });

  it('has clickable icon button', () => {
    render(<TopNav />);
    const iconButton = screen.getByRole('button');
    expect(iconButton).toBeEnabled();
  });
});