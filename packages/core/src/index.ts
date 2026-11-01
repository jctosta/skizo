import type { CheckError, Document } from "./ast";
import { parse } from "./parse";

export type { CheckError, Document, Node } from "./ast";

/** Parses and validates a Skizo source. The document is safe to hand to a Backend only when `errors` is empty. */
export function check(source: string): { document: Document; errors: CheckError[] } {
  return parse(source);
}
