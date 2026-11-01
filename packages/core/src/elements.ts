import type { Node } from "./ast";

/** How `check` reads one prop. Raw values are strings (or true for a bare flag); `check` coerces them. */
export type PropSpec =
  | { kind: "flag" }
  | { kind: "string" }
  /** values[0] is the default, filled in when the prop is missing. */
  | { kind: "enum"; values: readonly string[] }
  | { kind: "number"; min?: number; max?: number }
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
  /** Rules the generic checks can't express. Runs after props are coerced; `line` defaults to the Element's. */
  check?: (node: Node, err: (message: string, line?: number) => void) => void;
};

const sizes = { kind: "enum", values: ["md", "sm", "lg"] } as const;

/**
 * One schema per Element type: the whole vocabulary `check` accepts.
 * Add an Element type with one entry here (and its emitter in each Backend).
 * Screens go only at the top level; that rule lives in validate.ts.
 */
export const ELEMENTS: Record<string, ElementSpec> = {
  Screen: { label: "required", props: { id: { kind: "string" }, subtitle: { kind: "string" } }, children: "any" },
  Heading: { label: "required", props: { level: { kind: "enum", values: ["2", "1", "3", "4"] } } },
  Text: { label: "required", props: { size: sizes, muted: { kind: "flag" }, bold: { kind: "flag" } } },
  Table: {
    label: "none",
    props: { cols: { kind: "list" }, rows: { kind: "number", min: 1 } },
    check(node, err) {
      const cols = node.props.cols as string[] | undefined;
      if (!cols) return err('needs cols (Table cols="A,B,C")');
      node.rows?.forEach((cells, i) => {
        if (cells.length !== cols.length)
          err(`row has ${cells.length} cells, expected ${cols.length} (cols: ${cols.join(", ")})`, node.rowLines![i]);
      });
    },
  },
};
