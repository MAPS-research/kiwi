import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import PrimaryButton from './PrimaryButton.tsx';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('PrimaryButton', () => {
  it('renders without crashing', () => {
    renderWithTheme(<PrimaryButton>Test Button</PrimaryButton>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('displays button text correctly', () => {
    renderWithTheme(<PrimaryButton>Click Me</PrimaryButton>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    renderWithTheme(<PrimaryButton onClick={handleClick}>Click Me</PrimaryButton>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('passes through button props', () => {
    renderWithTheme(<PrimaryButton disabled>Disabled Button</PrimaryButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies correct styling', () => {
    renderWithTheme(<PrimaryButton>Styled Button</PrimaryButton>);
    const button = screen.getByRole('button');

    expect(button).toHaveStyle({ textTransform: 'uppercase' });
  });

  it('renders with custom type', () => {
    renderWithTheme(<PrimaryButton type="submit">Submit</PrimaryButton>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });
});