import { render, screen } from '@testing-library/react';
import FormCard from './FormCard.tsx';

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

  it('applies proper Paper styling', () => {
    const { container } = render(<FormCard>Content</FormCard>);
    const paper = container.firstChild;

    expect(paper).toHaveClass('MuiPaper-root');
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

  it('supports a plain appearance for embedded forms', () => {
    const { container } = render(<FormCard appearance="plain">Content</FormCard>);

    expect(container.firstChild).toHaveClass('MuiPaper-elevation0');
  });
});
