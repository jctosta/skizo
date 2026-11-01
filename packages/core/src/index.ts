import type { CheckError, Document } from "./ast";
import { parse } from "./parse";
import { validate } from "./validate";

export type { CheckError, Document, Node } from "./ast";
export { ELEMENTS, type ElementSpec, type PropSpec } from "./elements";
export { didYouMean, nearest } from "./nearest";

/**
 * Parses and validates a Skizo source, returning every error sorted by line.
 * Hand the document to a Backend only when `errors` is empty.
 */
export function check(source: string): { document: Document; errors: CheckError[] } {
  const { document, errors, garbled } = parse(source);
  const found = [...errors, ...validate(document).filter((e) => !garbled.has(e.line))];
  return { document, errors: found.sort((a, b) => a.line - b.line) };
}
