/** How `check` reads one prop. Raw values are strings (or true for a bare flag); `check` coerces them. */
export type PropSpec =
  | { kind: "flag" }
  | { kind: "string" }
  /** values[0] is the default, filled in when the prop is missing. */
  | { kind: "enum"; values: readonly string[] }
  /** `default` is filled in when the prop is missing. */
  | { kind: "number"; min?: number; max?: number; default?: number }
  /** Comma-separated; `\,` is a literal comma. */
  | { kind: "list" };

export type ElementSpec = {
  label: "required" | "optional" | "none";
  /** `id` is allowed on every Element and need not be listed. */
  props: Record<string, PropSpec>;
  /** Element types allowed as children; "any" for all; omitted for none. */
  children?: readonly string[] | "any";
  /** Element types this one may sit directly under; omitted for anywhere. */
  parents?: readonly string[];
  slots?: readonly ("actions" | "footer")[];
};

const sizes = { kind: "enum", values: ["md", "sm", "lg"] } as const;
/** Stack and Row. */
const flex = {
  gap: sizes,
  align: { kind: "enum", values: ["start", "center", "end"] },
  justify: { kind: "enum", values: ["start", "between", "end"] },
} as const;

/**
 * One schema per Element type: the whole vocabulary `check` accepts.
 * Add an Element type with one entry here (and its emitter in each Backend).
 * Screens go only at the top level; that rule lives in validate.ts.
 */
export const ELEMENTS: Record<string, ElementSpec> = {
  Screen: { label: "required", props: { id: { kind: "string" }, subtitle: { kind: "string" } }, children: "any" },
  Heading: { label: "required", props: { level: { kind: "enum", values: ["2", "1", "3", "4"] } } },
  Text: { label: "required", props: { size: sizes, muted: { kind: "flag" }, bold: { kind: "flag" } } },
  Stack: { label: "none", props: flex, children: "any" },
  Row: { label: "none", props: flex, children: "any" },
  Grid: { label: "none", props: { cols: { kind: "number", min: 2, max: 6, default: 2 }, gap: sizes }, children: "any" },
  Separator: { label: "none", props: {} },
};
