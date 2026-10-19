import { render, screen } from '@testing-library/react';

// LOGO_LIGHT_URL is read when branding.ts loads, so each test stubs the env
// and imports a fresh copy of the component (and of MUI, so the theme context
// the component reads is the one the test provides).
async function renderLogo(mode?: 'light' | 'dark') {
  vi.resetModules();
  const { default: InstitutionLogo } = await import('./InstitutionLogo.tsx');
  if (!mode) return render(<InstitutionLogo />);
  const { ThemeProvider, createTheme } = await import('@mui/material/styles');
  return render(
    <ThemeProvider theme={createTheme({ palette: { mode } })}>
      <InstitutionLogo />
    </ThemeProvider>,
  );
}

describe('InstitutionLogo', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('shows the 28 px square logo beside "Kiwi" by default', async () => {
    vi.stubEnv('VITE_LOGO_LIGHT_URL', '');
    const { container } = await renderLogo();

    const logo = screen.getByRole('img', { name: 'Kiwi' });
    expect(logo).toHaveTextContent('Kiwi');
    const mark = container.querySelector('img');
    expect(mark).toHaveAttribute('src', '/assets/images/kiwi-mark.svg');
    expect(mark).toHaveAttribute('alt', '');
    expect(mark).toHaveStyle({ width: '28px', height: '28px' });
    // The pair is one image named "Kiwi"; the visible word is not read twice.
    expect(screen.getByText('Kiwi')).toHaveAttribute('aria-hidden', 'true');
  });

  it('masks the configured wordmark instead', async () => {
    vi.stubEnv('VITE_LOGO_LIGHT_URL', '/assets/images/kiwi-logo.svg');
    const { container } = await renderLogo();

    const logo = screen.getByRole('img', { name: 'Kiwi' });
    expect(logo).toHaveStyle({
      maskImage: 'url(/assets/images/kiwi-logo.svg)',
    });
    expect(logo).toBeEmptyDOMElement();
    expect(container.querySelector('img')).toBeNull();
  });

  it('paints the masked wordmark neutral black on a light surface (G2)', async () => {
    vi.stubEnv('VITE_LOGO_LIGHT_URL', '/assets/images/kiwi-logo.svg');
    await renderLogo('light');

    expect(screen.getByRole('img', { name: 'Kiwi' })).toHaveStyle({
      backgroundColor: 'rgb(0, 0, 0)',
    });
  });

  it('paints the masked wordmark neutral white on a dark surface (G2)', async () => {
    vi.stubEnv('VITE_LOGO_LIGHT_URL', '/assets/images/kiwi-logo.svg');
    await renderLogo('dark');

    expect(screen.getByRole('img', { name: 'Kiwi' })).toHaveStyle({
      backgroundColor: 'rgb(255, 255, 255)',
    });
  });
});
