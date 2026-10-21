import { render, screen } from '@testing-library/react';
import FormCard from './FormCard.tsx';

// Token values stay var() strings in jsdom's computed style.
const computed = (element: ChildNode | null) => getComputedStyle(element as Element);

describe('FormCard', () => {
  it('renders without crashing', () => {
    render(<FormCard>Test content</FormCard>);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders children correctly', () => {
    render(
      <FormCard>
        <div>Child 1</div>
        <div>Child 2</div>
      </FormCard>
    );

    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
  });

  it('is the main landmark, drawn as a Paper', () => {
    const { container } = render(<FormCard>Content</FormCard>);
    const paper = container.firstChild;

    expect(paper).toHaveClass('MuiPaper-root');
    expect(screen.getByRole('main')).toBe(paper);
  });

  it('renders with correct structure', () => {
    render(
      <FormCard>
        <h1>Title</h1>
        <p>Description</p>
      </FormCard>
    );

    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('draws the sheet: an edge, the sheet radius, no glass and no shadow', () => {
    const { container } = render(<FormCard>Content</FormCard>);
    const style = computed(container.firstChild);

    expect(container.firstChild).toHaveClass('MuiPaper-elevation0');
    expect(style.borderRadius).toBe('var(--radius-sheet)');
    expect(style.border).toBe('1px solid var(--border)');
    expect(style.boxShadow).toBe('none');
    expect(style.backdropFilter ?? '').toBe('');
  });

  it('draws the same sheet for the solid appearance', () => {
    const { container } = render(<FormCard appearance="solid">Content</FormCard>);

    expect(computed(container.firstChild).border).toBe('1px solid var(--border)');
    expect(computed(container.firstChild).boxShadow).toBe('none');
  });

  it('supports a plain appearance for embedded forms', () => {
    const { container } = render(<FormCard appearance="plain">Content</FormCard>);

    expect(container.firstChild).toHaveClass('MuiPaper-elevation0');
    const transparent = document.createElement('div');
    transparent.style.backgroundColor = 'transparent';
    document.body.appendChild(transparent);
    expect(computed(container.firstChild).backgroundColor).toBe(computed(transparent).backgroundColor);
    transparent.remove();
    expect(computed(container.firstChild).border).not.toContain('var(--border)');
  });
});
