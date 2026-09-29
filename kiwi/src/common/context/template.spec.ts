import { renderConditional, stripUnrenderedTokens } from './template';

describe('renderConditional', () => {
  it('keeps a section body when the condition holds', () => {
    expect(renderConditional('a{{#if x}}B{{/if}}c', 'x', (i) => i)).toBe('aBc');
  });

  it('drops a section entirely when the condition fails', () => {
    expect(renderConditional('a{{#if x}}B{{/if}}c', 'x', null)).toBe('ac');
  });

  it('leaves other sections untouched', () => {
    const template = '{{#if x}}X{{/if}}|{{#if y}}Y{{/if}}';
    expect(renderConditional(template, 'x', null)).toBe('|{{#if y}}Y{{/if}}');
  });

  it('renders every occurrence, not just the first', () => {
    expect(
      renderConditional('{{#if x}}A{{/if}}-{{#if x}}B{{/if}}', 'x', (i) => i),
    ).toBe('A-B');
  });

  describe('nesting — the bug that put literal {{/if}} into every prompt', () => {
    // The old implementation used /\{\{#if x\}\}[\s\S]*?\{\{\/if\}\}/, whose
    // non-greedy body stops at the FIRST {{/if}} — the inner one — so the outer
    // close tag survived into the rendered system prompt.
    const nested = 'pre{{#if outer}}A{{#if inner}}B{{/if}}C{{/if}}post';

    it('drops the whole nested section, including the outer close tag', () => {
      const out = renderConditional(nested, 'outer', null);
      expect(out).toBe('prepost');
      expect(out).not.toContain('{{/if}}');
    });

    it('keeps the whole nested body when the outer condition holds', () => {
      const out = renderConditional(nested, 'outer', (inner) => inner);
      expect(out).toBe('preA{{#if inner}}B{{/if}}Cpost');
    });

    it('composes with an inner render pass without leaking tags', () => {
      const out = renderConditional(nested, 'outer', (inner) =>
        renderConditional(inner, 'inner', null),
      );
      expect(out).toBe('preACpost');
      expect(out).not.toContain('{{');
    });

    it('handles two levels of nesting', () => {
      const deep = '{{#if a}}1{{#if b}}2{{#if c}}3{{/if}}4{{/if}}5{{/if}}';
      expect(renderConditional(deep, 'a', null)).toBe('');
    });
  });

  it('emits the remainder verbatim rather than truncating an unbalanced template', () => {
    const unbalanced = 'x{{#if a}}body-with-no-close';
    expect(renderConditional(unbalanced, 'a', (i) => i)).toBe(unbalanced);
  });
});

describe('stripUnrenderedTokens', () => {
  it('removes leftover placeholders and close tags', () => {
    expect(stripUnrenderedTokens('a{{/if}}b{{foo.bar}}c')).toBe('abc');
  });

  it('leaves ordinary text alone', () => {
    expect(stripUnrenderedTokens('use $x$ and {not a token}')).toBe(
      'use $x$ and {not a token}',
    );
  });
});
