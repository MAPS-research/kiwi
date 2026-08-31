import { BadRequestException } from '@nestjs/common';
import OpenAI from 'openai';

/**
 * Sanitizes an app-supplied JSON Schema before it is passed to the LLM as
 * `response_format` (issue #217). Apps are untrusted: the schema is size- and
 * depth-capped, references are rejected outright, and only a whitelist of
 * structural keywords is copied — everything else is dropped.
 *
 * The result is emitted with `strict: true` so the model is GUARANTEED to
 * return an instance conforming to the schema (with strict:false the model is
 * only softly guided and may echo the schema envelope instead). To satisfy
 * OpenAI strict mode the sanitizer rewrites every object node to set
 * `additionalProperties: false` and list every property in `required`, and it
 * drops constraint keywords (minimum/maxLength/format/…) that strict mode does
 * not accept. The shape contract apps depend on is preserved; only advisory
 * value constraints are lost.
 */

const MAX_SERIALIZED_CHARS = 10_000;
const MAX_DEPTH = 5;
const MAX_TOTAL_PROPERTIES = 100;

// Keywords copied verbatim from the app's schema. `required` and
// `additionalProperties` are intentionally NOT here — strict mode forces them,
// so they are recomputed per object rather than trusted from input. Constraint
// keywords (minimum, maximum, minLength, maxLength, format, pattern) are
// omitted because OpenAI strict mode rejects them.
const ALLOWED_KEYS = new Set([
  'type',
  'properties',
  'items',
  'enum',
  'description',
]);

const FORBIDDEN_KEYS = new Set(['$ref', '$defs', '$id', 'definitions']);

const PRIMITIVE_TYPES = new Set(['string', 'number', 'boolean']);

// JSON Schema types the LLM gateway accepts. Anything else (a typo, a union
// array, a made-up type) is rejected here rather than at the gateway.
const SCHEMA_TYPES = new Set([
  'string',
  'number',
  'integer',
  'boolean',
  'object',
  'array',
  'null',
]);

export function sanitizeOutputSchema(
  schema: unknown,
): OpenAI.ResponseFormatJSONSchema {
  if (typeof schema !== 'object' || schema === null || Array.isArray(schema)) {
    throw new BadRequestException('outputSchema must be a JSON object');
  }
  if (JSON.stringify(schema).length > MAX_SERIALIZED_CHARS) {
    throw new BadRequestException(
      `outputSchema exceeds ${MAX_SERIALIZED_CHARS} serialized characters`,
    );
  }
  if ((schema as Record<string, unknown>).type !== 'object') {
    throw new BadRequestException(
      'outputSchema root must be a schema with type "object"',
    );
  }

  const state = { properties: 0 };
  const sanitized = sanitizeNode(schema, 1, state);

  return {
    type: 'json_schema',
    json_schema: {
      name: 'kiwi_app_output',
      strict: true,
      schema: sanitized,
    },
  };
}

function sanitizeNode(
  node: unknown,
  depth: number,
  state: { properties: number },
): Record<string, any> {
  if (typeof node !== 'object' || node === null || Array.isArray(node)) {
    throw new BadRequestException('outputSchema nodes must be JSON objects');
  }
  if (depth > MAX_DEPTH) {
    throw new BadRequestException(
      `outputSchema exceeds the maximum nesting depth of ${MAX_DEPTH}`,
    );
  }

  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(node)) {
    if (FORBIDDEN_KEYS.has(key)) {
      throw new BadRequestException(
        `outputSchema must not use "${key}" (schema references are not allowed)`,
      );
    }
    if (!ALLOWED_KEYS.has(key)) continue; // drop unknown/unsupported keywords

    switch (key) {
      case 'properties': {
        if (
          typeof value !== 'object' ||
          value === null ||
          Array.isArray(value)
        ) {
          throw new BadRequestException(
            'outputSchema "properties" must be an object',
          );
        }
        const props: Record<string, any> = {};
        for (const [propName, propSchema] of Object.entries(value)) {
          state.properties++;
          if (state.properties > MAX_TOTAL_PROPERTIES) {
            throw new BadRequestException(
              `outputSchema exceeds ${MAX_TOTAL_PROPERTIES} total properties`,
            );
          }
          props[propName] = sanitizeNode(propSchema, depth + 1, state);
        }
        out.properties = props;
        break;
      }
      case 'items':
        out.items = sanitizeNode(value, depth + 1, state);
        break;
      case 'enum': {
        if (
          !Array.isArray(value) ||
          !value.every((v) => PRIMITIVE_TYPES.has(typeof v))
        ) {
          throw new BadRequestException(
            'outputSchema "enum" must be an array of primitive values',
          );
        }
        out.enum = [...value];
        break;
      }
      case 'type': {
        if (typeof value !== 'string' || !SCHEMA_TYPES.has(value)) {
          throw new BadRequestException(
            `outputSchema "type" must be one of: ${[...SCHEMA_TYPES].join(', ')}`,
          );
        }
        out.type = value;
        break;
      }
      default:
        // description
        if (typeof value === 'object' && value !== null) {
          throw new BadRequestException(
            `outputSchema "${key}" must be a primitive value`,
          );
        }
        out[key] = value;
    }
  }

  // Infer the node type when the app omitted it: `properties` means object,
  // `items` means array. Without this a typeless node would skip the strict
  // rewrite below and be rejected by the LLM gateway at request time.
  if (out.type === undefined) {
    if (out.properties !== undefined) out.type = 'object';
    else if (out.items !== undefined) out.type = 'array';
  }

  // Strict-mode object rules: every object must forbid extra properties and
  // require every declared property. Recomputed here so the app cannot supply
  // a strict-incompatible object (partial `required`, open `additionalProperties`).
  if (out.type === 'object') {
    out.properties = out.properties ?? {};
    out.required = Object.keys(out.properties);
    out.additionalProperties = false;
  } else if (out.type === 'array' && out.items === undefined) {
    // Strict mode requires every array to declare its item schema.
    throw new BadRequestException('outputSchema arrays must declare "items"');
  }

  return out;
}
