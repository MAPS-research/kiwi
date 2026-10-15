import { render, screen } from '@testing-library/react';

// LOGO_LIGHT_URL is read when branding.ts loads, so each test stubs the env
// and imports a fresh copy of the component.
async function renderLogo() {
  vi.resetModules();
  const { default: InstitutionLogo } = await import('./InstitutionLogo.tsx');
  return render(<InstitutionLogo />);
}

describe('InstitutionLogo', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('shows the square logo in colour next to the name by default', async () => {
    vi.stubEnv('VITE_LOGO_LIGHT_URL', '');
    const { container } = await renderLogo();

    expect(screen.getByRole('img', { name: 'Kiwi' })).toHaveTextContent('Kiwi');
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      '/assets/images/kiwi-mark.svg',
    );
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
});
