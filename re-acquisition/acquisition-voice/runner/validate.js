import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { loadSchema } from './ollama.js';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validators = new Map();

export function validateExtraction(data, kind = 'seller-call') {
  if (!validators.has(kind)) {
    const schema = loadSchema(kind);
    validators.set(kind, ajv.compile(schema));
  }
  const validate = validators.get(kind);
  const valid = validate(data);
  if (!valid) {
    const errors = validate.errors
      ?.map((e) => `${e.instancePath} ${e.message}`)
      .join('; ');
    throw new Error(`Schema validation failed: ${errors}`);
  }
  return data;
}
