import { render, screen } from '@testing-library/react';
import { Home as HomeIcon } from '@mui/icons-material';
import SidebarItem from './SidebarItem.tsx';

describe('SidebarItem', () => {
  const defaultProps = {
    icon: <HomeIcon data-testid="home-icon" />,
    label: 'Home',
  };

  it('renders without crashing', () => {
    render(<SidebarItem {...defaultProps} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('displays the icon', () => {
    render(<SidebarItem {...defaultProps} />);
    expect(screen.getByTestId('home-icon')).toBeInTheDocument();
  });

  it('displays the label', () => {
    render(<SidebarItem {...defaultProps} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('renders as link when href is provided', () => {
    render(<SidebarItem {...defaultProps} href="/home" />);
    const linkElement = screen.getByRole('link');
    expect(linkElement).toHaveAttribute('href', '/home');
  });

  it('renders as div when no href is provided', () => {
    render(<SidebarItem {...defaultProps} />);
    const listItem = screen.getByRole('button');
    expect(listItem.tagName).toBe('DIV');
  });

  it('applies active styling when active', () => {
    render(<SidebarItem {...defaultProps} active={true} />);
    const listItem = screen.getByRole('button');
    expect(listItem).toHaveClass('Mui-selected');
  });

  it('shows chevron icon when active', () => {
    render(<SidebarItem {...defaultProps} active={true} />);
    expect(screen.getByTestId('ChevronRightIcon')).toBeInTheDocument();
  });


  it('applies default mode padding', () => {
    render(<SidebarItem {...defaultProps} />);
    const listItem = screen.getByRole('button');
    expect(listItem).toHaveStyle({
      paddingLeft: '12px',
      paddingRight: '12px'
    });
  });

  it('applies active font weight', () => {
    render(<SidebarItem {...defaultProps} active={true} />);
    const typography = screen.getByText('Home');
    expect(typography).toHaveStyle({ fontWeight: 600 });
  });

  it('applies normal font weight when not active', () => {
    render(<SidebarItem {...defaultProps} active={false} />);
    const typography = screen.getByText('Home');
    expect(typography).toHaveStyle({ fontWeight: 400 });
  });

  it('has proper icon container styling', () => {
    const { container } = render(<SidebarItem {...defaultProps} />);
    const iconContainer = container.querySelector('.MuiListItemIcon-root');
    expect(iconContainer).toHaveStyle({
      minWidth: '36px',
      display: 'flex',
      justifyContent: 'center'
    });
  });

  it('has border radius styling', () => {
    render(<SidebarItem {...defaultProps} />);
    const listItem = screen.getByRole('button');
    expect(listItem).toHaveStyle({
      borderRadius: '8px'
    });
  });

  it('handles different icon types', () => {
    const customIcon = <span data-testid="custom-icon">Custom</span>;
    render(<SidebarItem icon={customIcon} label="Custom Item" />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('handles empty label', () => {
    render(<SidebarItem {...defaultProps} label="" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});