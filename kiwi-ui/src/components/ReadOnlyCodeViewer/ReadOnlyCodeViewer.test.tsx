import { render } from '@testing-library/react';
import ReadOnlyCodeViewer from './ReadOnlyCodeViewer.tsx';

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
});
