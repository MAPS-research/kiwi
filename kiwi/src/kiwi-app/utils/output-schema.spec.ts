import { BadRequestException } from '@nestjs/common';
import { sanitizeOutputSchema } from './output-schema';

describe('sanitizeOutputSchema', () => {
  it('wraps a valid schema as a strict OpenAI json_schema response format', () => {
    const result = sanitizeOutputSchema({
      type: 'object',
      properties: {
        flashcards: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              front: { type: 'string', description: 'Question side' },
              back: { type: 'string' },
            },
            required: ['front', 'back'],
          },
        },
      },
      required: ['flashcards'],
      additionalProperties: false,
    });

    expect(result.type).toBe('json_schema');
    expect(result.json_schema.name).toBe('kiwi_app_output');
    expect(result.json_schema.strict).toBe(true);
    expect(result.json_schema.schema).toEqual({
      type: 'object',
      properties: {
        flashcards: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              front: { type: 'string', description: 'Question side' },
              back: { type: 'string' },
            },
            required: ['front', 'back'],
            additionalProperties: false,
          },
        },
      },
      required: ['flashcards'],
      additionalProperties: false,
    });
  });

  it('drops unknown keywords instead of copying them', () => {
    const result = sanitizeOutputSchema({
      type: 'object',
      properties: { a: { type: 'string', default: 'x', examples: ['y'] } },
      $schema: 'http://json-schema.org/draft-07/schema#',
    } as any);

    expect(result.json_schema.schema).toEqual({
      type: 'object',
      properties: { a: { type: 'string' } },
      required: ['a'],
      additionalProperties: false,
    });
  });

  it('forces strict object rules: all properties required, no additional', () => {
    // App declares a partial `required` and open additionalProperties — strict
    // mode requires all keys present and additionalProperties:false.
    const result = sanitizeOutputSchema({
      type: 'object',
      properties: { a: { type: 'string' }, b: { type: 'number' } },
      required: ['a'],
      additionalProperties: true,
    });

    expect(result.json_schema.schema).toEqual({
      type: 'object',
      properties: { a: { type: 'string' }, b: { type: 'number' } },
      required: ['a', 'b'],
      additionalProperties: false,
    });
  });

  it('drops constraint keywords strict mode rejects', () => {
    const result = sanitizeOutputSchema({
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 40, format: 'email' },
        age: { type: 'number', minimum: 0, maximum: 120 },
      },
    });

    expect((result.json_schema.schema as any).properties).toEqual({
      name: { type: 'string' },
      age: { type: 'number' },
    });
  });

  it('infers "object" for a nested node that omits type but has properties', () => {
    // Without the inference the node would skip the strict rewrite and the
    // gateway would reject the schema for a missing required/additionalProperties.
    const result = sanitizeOutputSchema({
      type: 'object',
      properties: {
        card: { properties: { front: { type: 'string' } } },
      },
    });

    expect((result.json_schema.schema as any).properties.card).toEqual({
      type: 'object',
      properties: { front: { type: 'string' } },
      required: ['front'],
      additionalProperties: false,
    });
  });

  it('infers "array" for a nested node that omits type but has items', () => {
    const result = sanitizeOutputSchema({
      type: 'object',
      properties: {
        tags: { items: { type: 'string' } },
      },
    });

    expect((result.json_schema.schema as any).properties.tags).toEqual({
      type: 'array',
      items: { type: 'string' },
    });
  });

  it('rejects an array node without items', () => {
    expect(() =>
      sanitizeOutputSchema({
        type: 'object',
        properties: { tags: { type: 'array' } },
      }),
    ).toThrow(/arrays must declare "items"/);
  });

  it('rejects unknown or non-string type values', () => {
    expect(() =>
      sanitizeOutputSchema({
        type: 'object',
        properties: { a: { type: 'strng' } },
      }),
    ).toThrow(/"type" must be one of/);
    expect(() =>
      sanitizeOutputSchema({
        type: 'object',
        properties: { a: { type: 42 } },
      }),
    ).toThrow(BadRequestException);
    // union types are objects and were already rejected as non-primitive
    expect(() =>
      sanitizeOutputSchema({
        type: 'object',
        properties: { a: { type: ['string', 'null'] } },
      }),
    ).toThrow(BadRequestException);
  });

  it('accepts integer and null types', () => {
    const result = sanitizeOutputSchema({
      type: 'object',
      properties: { a: { type: 'integer' }, b: { type: 'null' } },
    });

    expect((result.json_schema.schema as any).properties).toEqual({
      a: { type: 'integer' },
      b: { type: 'null' },
    });
  });

  it('rejects a non-object root', () => {
    expect(() => sanitizeOutputSchema('{"type":"object"}')).toThrow(
      BadRequestException,
    );
    expect(() => sanitizeOutputSchema({ type: 'array' })).toThrow(
      BadRequestException,
    );
  });

  it('rejects $ref anywhere in the schema', () => {
    expect(() =>
      sanitizeOutputSchema({
        type: 'object',
        properties: { a: { $ref: '#/definitions/evil' } },
      }),
    ).toThrow(/references are not allowed/);
  });

  it('rejects schemas nested deeper than the limit', () => {
    // depth 6: object > properties.a > items > items > items > items
    const deep = {
      type: 'object',
      properties: {
        a: {
          type: 'array',
          items: {
            type: 'array',
            items: {
              type: 'array',
              items: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    };
    expect(() => sanitizeOutputSchema(deep)).toThrow(/nesting depth/);
  });

  it('rejects schemas with too many total properties', () => {
    const properties: Record<string, any> = {};
    for (let i = 0; i < 101; i++) properties[`p${i}`] = { type: 'string' };
    expect(() => sanitizeOutputSchema({ type: 'object', properties })).toThrow(
      /total properties/,
    );
  });

  it('rejects oversized schemas', () => {
    const big = {
      type: 'object',
      properties: { a: { type: 'string', description: 'x'.repeat(10_000) } },
    };
    expect(() => sanitizeOutputSchema(big)).toThrow(/serialized characters/);
  });

  it('rejects non-primitive enum entries', () => {
    expect(() =>
      sanitizeOutputSchema({
        type: 'object',
        properties: { a: { type: 'string', enum: [{ evil: true }] } },
      }),
    ).toThrow(BadRequestException);
  });
});
