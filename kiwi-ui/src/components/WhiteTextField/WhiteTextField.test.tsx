import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import WhiteTextField from './WhiteTextField.tsx';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('WhiteTextField', () => {
  it('renders without crashing', () => {
    renderWithTheme(<WhiteTextField label="Test Field" />);
    expect(screen.getByLabelText('Test Field')).toBeInTheDocument();
  });

  it('displays label correctly', () => {
    renderWithTheme(<WhiteTextField label="Email Address" />);
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
  });

  it('handles input changes', () => {
    const handleChange = vi.fn();
    renderWithTheme(
      <WhiteTextField
        label="Test Input"
        onChange={handleChange}
        data-testid="test-input"
      />
    );

    const input = screen.getByTestId('test-input').querySelector('input');
    if (input) {
      fireEvent.change(input, { target: { value: 'test value' } });
      expect(handleChange).toHaveBeenCalled();
    }
  });

  it('accepts and displays value', () => {
    renderWithTheme(
      <WhiteTextField
        label="Test Field"
        value="test value"
        data-testid="test-input"
      />
    );

    const input = screen.getByTestId('test-input').querySelector('input');
    expect(input).toHaveValue('test value');
  });

  it('supports different input types', () => {
    renderWithTheme(
      <WhiteTextField
        label="Password"
        type="password"
        data-testid="password-input"
      />
    );

    const input = screen.getByTestId('password-input').querySelector('input');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('can be disabled', () => {
    renderWithTheme(
      <WhiteTextField
        label="Disabled Field"
        disabled
        data-testid="disabled-input"
      />
    );

    const input = screen.getByTestId('disabled-input').querySelector('input');
    expect(input).toBeDisabled();
  });

  it('passes through custom input slot props', () => {
    renderWithTheme(
      <WhiteTextField
        label="Custom Field"
        slotProps={{ input: { placeholder: 'Custom placeholder' } }}
        data-testid="custom-input"
      />
    );

    const input = screen.getByTestId('custom-input').querySelector('input');
    expect(input).toHaveAttribute('placeholder', 'Custom placeholder');
  });

  it('passes through HTML input slot callbacks while retaining default padding', () => {
    renderWithTheme(
      <WhiteTextField
        label="Verification code"
        slotProps={{ htmlInput: () => ({ inputMode: 'numeric', maxLength: 6 }) }}
      />
    );

    const input = screen.getByLabelText('Verification code');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toHaveAttribute('maxlength', '6');
    expect(input).toHaveStyle({ paddingTop: '10px', paddingBottom: '10px' });
  });
});
