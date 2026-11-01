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
  /**
   * Props that give the Element its content instead of the Label (Text lorem=N).
   * One content source only: the Label or one of these. A required Label is satisfied by any of them.
   */
  content?: readonly string[];
  /** A flag at most one child may set; with `firstByDefault`, the first child gets it when none does. */
  exclusive?: { flag: string; firstByDefault?: true };
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
  Text: {
    label: "required",
    props: { size: sizes, muted: { kind: "flag" }, bold: { kind: "flag" }, lorem: { kind: "number", min: 1 } },
    content: ["lorem"],
  },
  /** The Label is the value. trend colors the hint and adds an arrow. */
  Stat: {
    label: "required",
    props: { title: { kind: "string" }, hint: { kind: "string" }, trend: { kind: "enum", values: ["none", "up", "down"] } },
  },
  Badge: { label: "required", props: { variant: { kind: "enum", values: ["default", "secondary", "outline", "destructive"] } } },
  /** The Label is a name; the Avatar shows its initials. */
  Avatar: { label: "required", props: { size: sizes } },
  /** The Label is the alt text of a placeholder box. */
  Image: { label: "required", props: { ratio: { kind: "enum", values: ["16:9", "4:3", "3:2", "1:1"] } } },
  /** The Label is the title. */
  Alert: { label: "required", props: { text: { kind: "string" }, variant: { kind: "enum", values: ["default", "destructive"] } } },
  Progress: { label: "none", props: { value: { kind: "number", min: 0, max: 100 } } },
  Tabs: { label: "none", props: {}, children: ["Tab"], exclusive: { flag: "active", firstByDefault: true } },
  Tab: { label: "required", props: { active: { kind: "flag" } }, children: "any", parents: ["Tabs"] },
};
