import type { Node } from "./ast";

/** How `check` reads one prop. Raw values are strings (or true for a bare flag); `check` coerces them. */
export type PropSpec =
  | { kind: "flag" }
  | { kind: "string" }
  /** A Lucide icon name, checked against the names the caller passes to `check` (core holds no icon data). */
  | { kind: "icon" }
  /** values[0] is the default, filled in when the prop is missing. */
  | { kind: "enum"; values: readonly string[] }
  /** `default` is filled in when the prop is missing. */
  | { kind: "number"; min?: number; max?: number; default?: number }
  /** Comma-separated; `\,` is a literal comma. */
  | { kind: "list" }
  /** An Element's id. `overlay`: a Dialog or Sheet on the same Screen (opens=). */
  | { kind: "ref"; to: "overlay" };

export type ElementSpec = {
  label: "required" | "optional" | "none";
  /** `id` is allowed on every Element and need not be listed. */
  props: Record<string, PropSpec>;
  /** Element types allowed as children; "any" for all; omitted for none. */
  children?: readonly string[] | "any";
  /** Element types this one may sit directly under (not in their slots); omitted for anywhere. */
  parents?: readonly string[];
  slots?: readonly ("actions" | "footer")[];
  /** Rules the generic checks can't express. Runs after props are coerced; `line` defaults to the Element's. */
  check?: (node: Node, err: (message: string, line?: number) => void) => void;
  /** A flag at most one child may set; with `firstByDefault`, the first child gets it when none does. */
  exclusive?: { flag: string; firstByDefault?: true };
};

const sizes = { kind: "enum", values: ["md", "sm", "lg"] } as const;
/** Button and Menu: icon-only shows nothing but the icon, so it needs one. */
const iconOnly: ElementSpec["check"] = (node, err) => {
  if (node.props["icon-only"] === true && node.props.icon === undefined) err("icon-only needs icon=... too");
};
/** Dialog and Sheet. */
const overlay = { desc: { kind: "string" }, open: { kind: "flag" } } as const;
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
  Screen: {
    label: "required",
    props: { id: { kind: "string" }, subtitle: { kind: "string" } },
    children: "any",
    slots: ["actions"],
  },
  Heading: { label: "required", props: { level: { kind: "enum", values: ["2", "1", "3", "4"] } } },
  Text: {
    label: "optional",
    props: { size: sizes, muted: { kind: "flag" }, bold: { kind: "flag" }, lorem: { kind: "number", min: 1 } },
    check(node, err) {
      if (node.label !== undefined && node.props.lorem !== undefined) err("has both a Label and lorem= (keep one)");
      if (node.label === undefined && node.props.lorem === undefined) err('needs a Label (Text "...") or lorem=N');
    },
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
  Stack: { label: "none", props: flex, children: "any" },
  Row: { label: "none", props: flex, children: "any" },
  Grid: { label: "none", props: { cols: { kind: "number", min: 2, max: 6, default: 2 }, gap: sizes }, children: "any" },
  Separator: { label: "none", props: {} },
  Card: {
    label: "optional",
    props: { desc: { kind: "string" }, span: { kind: "number", min: 1 } },
    children: "any",
    slots: ["actions", "footer"],
  },
  Table: {
    label: "none",
    props: { cols: { kind: "list" }, rows: { kind: "number", min: 1 } },
    check(node, err) {
      if (node.rows && node.props.rows !== undefined) err("has both | rows and rows= (keep one)");
      const cols = node.props.cols as string[] | undefined;
      if (!cols) return err('needs cols (Table cols="A,B,C")');
      node.rows?.forEach((cells, i) => {
        if (cells.length !== cols.length)
          err(`row has ${cells.length} cells, expected ${cols.length} (cols: ${cols.join(", ")})`, node.rowLines![i]);
      });
    },
  },
  List: {
    label: "none",
    props: { items: { kind: "list" }, rows: { kind: "number", min: 1 } },
    check(node, err) {
      if (node.props.items !== undefined && node.props.rows !== undefined) err("has both items= and rows= (keep one)");
    },
  },
  /** The Label is the title. Shown by a Button's opens=, or on load with `open`. */
  Dialog: { label: "required", props: overlay, children: "any", parents: ["Screen"], slots: ["footer"] },
  Sheet: {
    label: "required",
    props: { ...overlay, side: { kind: "enum", values: ["right", "left"] } },
    children: "any",
    parents: ["Screen"],
    slots: ["footer"],
  },
  Tabs: { label: "none", props: {}, children: ["Tab"], exclusive: { flag: "active", firstByDefault: true } },
  Tab: { label: "required", props: { active: { kind: "flag" } }, children: "any", parents: ["Tabs"] },
  /** Carries its own trigger, a Button: the Label is its text, or its accessible name with icon-only. */
  Menu: {
    label: "required",
    props: {
      // Button's variants.
      variant: { kind: "enum", values: ["default", "secondary", "outline", "ghost", "destructive", "link"] },
      icon: { kind: "icon" },
      "icon-only": { kind: "flag" },
      open: { kind: "flag" },
    },
    children: ["Item"],
    check: iconOnly,
  },
  Item: { label: "required", props: { destructive: { kind: "flag" }, disabled: { kind: "flag" } }, parents: ["Menu"] },
  Button: {
    label: "required",
    props: {
      variant: { kind: "enum", values: ["default", "secondary", "outline", "ghost", "destructive", "link"] },
      size: sizes,
      icon: { kind: "icon" },
      "icon-only": { kind: "flag" },
      disabled: { kind: "flag" },
      loading: { kind: "flag" },
      opens: { kind: "ref", to: "overlay" },
    },
    check: iconOnly,
  },
  Input: {
    label: "required",
    props: {
      type: { kind: "enum", values: ["text", "email", "password", "number", "search"] },
      placeholder: { kind: "string" },
      value: { kind: "string" },
      error: { kind: "string" },
      disabled: { kind: "flag" },
    },
  },
  Textarea: {
    label: "required",
    props: { placeholder: { kind: "string" }, value: { kind: "string" }, rows: { kind: "number", min: 1 } },
  },
  Select: {
    label: "required",
    props: { options: { kind: "list" }, value: { kind: "string" }, placeholder: { kind: "string" }, open: { kind: "flag" } },
  },
  Checkbox: { label: "required", props: { checked: { kind: "flag" }, disabled: { kind: "flag" } } },
  Switch: { label: "required", props: { checked: { kind: "flag" }, disabled: { kind: "flag" } } },
  Radio: { label: "required", props: { options: { kind: "list" }, value: { kind: "string" } } },
};
