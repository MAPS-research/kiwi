import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createKiwiTheme } from '../../Theme.ts';
import ReadOnlyCodeViewer from './ReadOnlyCodeViewer.tsx';
import { kiwiPrism } from '../../theme/codeThemes.ts';

/** "#b9cf9b" → "rgb(185, 207, 155)", the form jsdom reports for a style colour. */
const rgb = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
};

describe('ReadOnlyCodeViewer highlighting', () => {
  it.each([
    ['python', 'def answer():\n    return 42'],
    ['javascript', 'const answer = 42;'],
    ['r', 'answer <- function() { return(42) }'],
  ])('highlights %s without changing the code', (language, code) => {
    const { container } = render(
      <ReadOnlyCodeViewer code={code} language={language} showLineNumbers={false} />
    );
    const output = container.querySelector('code')!;
    expect(output.textContent).toBe(code);
    expect(output.querySelector('span[style*="color"]')).not.toBeNull();
  });

  it('renders unknown languages as text and preserves HTML-like content', () => {
    const code = '<script>alert("example")</script>';
    const { container } = render(
      <ReadOnlyCodeViewer code={code} language="unknown-language" showLineNumbers={false} />
    );
    expect(container.querySelector('code')?.textContent).toBe(code);
    expect(container.querySelector('script')).toBeNull();
  });

  it.each(['light', 'dark'] as const)('uses the Kiwi Prism colours in %s mode', (mode) => {
    const { container } = render(
      // The app's CSS-variables theme: the scheme on screen is the colour-scheme state, not palette.mode.
      <ThemeProvider theme={createKiwiTheme({ dark: true })} defaultMode={mode} storageManager={null}>
        <ReadOnlyCodeViewer code={"x = 'hi'"} language="python" showLineNumbers={false} />
      </ThemeProvider>
    );
    const string = Array.from(container.querySelectorAll('code span')).find(
      (span) => span.textContent === "'hi'"
    ) as HTMLElement;
    expect(string.style.color).toBe(rgb(kiwiPrism(mode).string.color as string));
  });

  it('keeps line numbers upright in the gutter colour, not styled as comments', () => {
    const { container } = render(<ReadOnlyCodeViewer code={'x = 1'} language="python" />);
    const lineNumber = container.querySelector('.react-syntax-highlighter-line-number') as HTMLElement;
    expect(lineNumber.textContent).toBe('1');
    expect(lineNumber.style.fontStyle).toBe('normal');
    expect(lineNumber.getAttribute('style')).toContain('var(--editor-gutter-text)');
  });
});
