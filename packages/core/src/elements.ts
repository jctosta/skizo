import type { Node } from "./ast";
import { didYouMean } from "./nearest";

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
  /** `W:H`, two whole numbers above 0. `default` is filled in when the prop is missing. */
  | { kind: "ratio"; default?: string }
  /** Comma-separated; `\,` is a literal comma. */
  | { kind: "list" }
  /**
   * The id of an Element of one of the `to` types, resolved once the whole file is read. A Screen resolves file-wide
   * (to=); any other type only on the referring Element's own Screen (opens=).
   */
  | { kind: "ref"; to: readonly string[] };

export type ElementSpec = {
  label: "required" | "optional" | "none";
  /** `id` is allowed on every Element and need not be listed. */
  props: Record<string, PropSpec>;
  /** Any other prop or flag passes unchecked, as written: a string, or true for a flag (Custom). */
  anyProps?: true;
  /** Element types allowed as children; "any" for all; omitted for none. */
  children?: readonly string[] | "any";
  /** Element types this one may sit directly under (not in their slots); omitted for anywhere. */
  parents?: readonly string[];
  slots?: readonly ("actions" | "footer")[];
  /**
   * Sets props the source implies but does not write: a Screen's id, a Sidebar's active Link. Runs after the
   * Element's own props are coerced, before `check` and before its children are walked.
   */
  infer?: (node: Node, parent?: Node) => void;
  /**
   * Rules the generic checks can't express; reports only, never changes the AST. Runs after `infer`, before the
   * children are walked; `line` defaults to the Element's.
   */
  check?: (node: Node, err: (message: string, line?: number) => void, parent?: Node) => void;
  /** A flag at most one child may set; with `firstByDefault`, the first child gets it when none does. */
  exclusive?: { flag: string; firstByDefault?: true };
  /** Props any direct child (not in a slot) may set, whatever its type: Grid's span. Anywhere else they are an error. */
  childProps?: Record<string, PropSpec>;
  /** Runs on each direct child once its props are coerced: the childProps rules that need this Element's props. */
  checkChild?: (child: Node, err: (message: string) => void, parent: Node) => void;
};

const sizes = { kind: "enum", values: ["md", "sm", "lg"] } as const;
/** Button and Menu (its trigger is a Button). */
const variants = { kind: "enum", values: ["default", "secondary", "outline", "ghost", "destructive", "link"] } as const;
/** Button and Menu: icon-only shows nothing but the icon, so it needs one. */
const iconOnly: ElementSpec["check"] = (node, err) => {
  if (node.props["icon-only"] === true && node.props.icon === undefined) err("icon-only needs icon=... too");
};
/** Select and Radio: value= is one of options=. */
const valueInOptions: ElementSpec["check"] = (node, err) => {
  const value = node.props.value;
  const options = (node.props.options ?? []) as string[];
  if (typeof value !== "string" || options.includes(value)) return;
  if (!options.length) err(`value=${value} needs options= that include it`);
  else err(`unknown value "${value}"${didYouMean(value, options)} (expected: ${options.join(", ")})`);
};
/**
 * Table and Chart: `|` rows or rows=N, not both; cols= is required; one cell per column. Returns the columns, or
 * undefined without cols=. `example` shows how to write cols= in the error.
 */
const tabular = (node: Node, err: (message: string, line?: number) => void, example: string) => {
  if (node.rows && node.props.rows !== undefined) err("has both | rows and rows= (keep one)");
  const cols = node.props.cols as string[] | undefined;
  if (!cols) return void err(`needs cols (${example})`);
  node.rows?.forEach((cells, i) => {
    if (cells.length !== cols.length) err(`row has ${cells.length} cells, expected ${cols.length} (cols: ${cols.join(", ")})`, node.rowLines![i]);
  });
  return cols;
};
/** A Chart value: digits, with an optional minus sign and decimal part (1200, -3, 12.5). */
const NUMBER = /^-?\d+(\.\d+)?$/;
/** Dialog and Sheet. */
const dialog = { desc: { kind: "string" }, open: { kind: "flag" } } as const;
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
  /** Every Screen gets an id: the slug of its Label when it has no id=. `plain` hides the shared Sidebar. */
  Screen: {
    label: "required",
    props: { id: { kind: "string" }, subtitle: { kind: "string" }, plain: { kind: "flag" } },
    children: "any",
    slots: ["actions"],
    infer(node) {
      const slug = slugify(node.label ?? "");
      if (node.props.id === undefined && slug) node.props.id = slug;
    },
    check(node, err) {
      if (node.props.id === undefined && node.label !== undefined) err("cannot derive an id from the Label (add id=name)");
      if (node.props.plain === true && node.children.some((child) => child.type === "Sidebar")) err("has both its own Sidebar and plain (keep one)");
    },
  },
  /**
   * A Screen's navigation column. Its Link going to its own Screen is the active one (no first-child default).
   * At the top level it is shared (Document.sidebar): validate.ts places it, and its Links get no inferred active.
   */
  Sidebar: {
    label: "none",
    props: {},
    children: ["Link"],
    parents: ["Screen"],
    exclusive: { flag: "active" },
    infer(node, parent) {
      // Before the Links are walked, so `exclusive` counts inferred and written `active` alike.
      for (const link of node.children)
        if (parent?.type === "Screen" && link.props.to === parent.props.id && link.props.active === undefined) link.props.active = true;
    },
    check(node, err, parent) {
      // In a slot (index -1) the generic `parents` rule already reports it.
      if (parent?.type === "Screen" && parent.children.indexOf(node) > 0) err("must be the first child of its Screen");
    },
  },
  Link: {
    label: "required",
    props: { icon: { kind: "icon" }, active: { kind: "flag" }, to: { kind: "ref", to: ["Screen"] } },
    parents: ["Sidebar"],
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
  Image: { label: "required", props: { ratio: { kind: "ratio", default: "16:9" } } },
  /** The Label is the title. */
  Alert: { label: "required", props: { text: { kind: "string" }, variant: { kind: "enum", values: ["default", "destructive"] } } },
  Progress: { label: "none", props: { value: { kind: "number", min: 0, max: 100 } } },
  Stack: { label: "none", props: flex, children: "any" },
  Row: { label: "none", props: flex, children: "any" },
  Grid: {
    label: "none",
    props: { cols: { kind: "number", min: 2, max: 6, default: 2 }, gap: sizes },
    children: "any",
    childProps: { span: { kind: "number", min: 1 } },
    checkChild(child, err, grid) {
      const { span } = child.props;
      const { cols } = grid.props;
      if (typeof span === "number" && typeof cols === "number" && span > cols) err(`span=${span} is larger than the Grid's cols=${cols}`);
    },
  },
  Separator: { label: "none", props: {} },
  Card: {
    label: "optional",
    props: { desc: { kind: "string" } },
    children: "any",
    slots: ["actions", "footer"],
  },
  Table: {
    label: "none",
    props: { cols: { kind: "list" }, rows: { kind: "number", min: 1 } },
    check(node, err) {
      tabular(node, err, 'Table cols="A,B,C"');
    },
  },
  List: {
    label: "none",
    props: { items: { kind: "list" }, rows: { kind: "number", min: 1 } },
    check(node, err) {
      if (node.props.items !== undefined && node.props.rows !== undefined) err("has both items= and rows= (keep one)");
    },
  },
  /** Data as a Table's: the first column is the x axis (pie: the slice names), each further column a series of numbers. The Label is the accessible name. */
  Chart: {
    label: "required",
    props: { type: { kind: "enum", values: ["line", "bar", "area", "pie"] }, cols: { kind: "list" }, rows: { kind: "number", min: 1 } },
    check(node, err) {
      const cols = tabular(node, err, 'Chart "Label" cols="X,Series"');
      if (!node.rows && node.props.rows === undefined) err("needs | rows or rows=N (a Chart without data draws nothing)");
      if (!cols) return;
      if (cols.length < 2) err("needs at least two columns in cols (the x column, then one per series)");
      else if (node.props.type === "pie" && cols.length !== 2) err("type=pie needs exactly two columns in cols (the slice name, then its value)");
      node.rows?.forEach((cells, i) => {
        if (cells.length !== cols.length) return;
        for (const [j, cell] of cells.entries())
          if (j > 0 && !NUMBER.test(cell)) err(`"${cell}" in column ${cols[j]} is not a number (write digits, e.g. 1200 or 12.5)`, node.rowLines![i]);
      });
    },
  },
  /** The Label is the title. Shown by a Button's opens=, or on load with `open`. */
  Dialog: { label: "required", props: dialog, children: "any", parents: ["Screen"], slots: ["footer"] },
  Sheet: {
    label: "required",
    props: { ...dialog, side: { kind: "enum", values: ["right", "left"] } },
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
      variant: variants,
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
      variant: variants,
      size: sizes,
      icon: { kind: "icon" },
      "icon-only": { kind: "flag" },
      disabled: { kind: "flag" },
      loading: { kind: "flag" },
      opens: { kind: "ref", to: ["Dialog", "Sheet"] },
      to: { kind: "ref", to: ["Screen"] },
    },
    check(node, err, parent) {
      iconOnly(node, err, parent);
      if (node.props.opens !== undefined && node.props.to !== undefined) err("has both opens= and to= (keep one)");
    },
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
    check: valueInOptions,
  },
  Checkbox: { label: "required", props: { checked: { kind: "flag" }, disabled: { kind: "flag" } } },
  Switch: { label: "required", props: { checked: { kind: "flag" }, disabled: { kind: "flag" } } },
  Radio: { label: "required", props: { options: { kind: "list" }, value: { kind: "string" } }, check: valueInOptions },
  /** A component of the project that the vocabulary lacks. The Label is its name, so the export can import it. */
  Custom: {
    label: "required",
    props: {},
    anyProps: true,
    children: "any",
    check(node, err) {
      const name = node.label;
      if (name === "Custom") return err('"Custom" is not the name of a component (write the name of your component, e.g. Custom "ChatBubble")');
      // One way to write each thing: an Element type is written as itself, never through Custom.
      if (name !== undefined && Object.hasOwn(ELEMENTS, name)) return err(`"${name}" is an Element type (use ${name} instead of Custom)`);
      if (name === undefined || /^[A-Z][A-Za-z0-9]*$/.test(name)) return;
      const fixed = pascalCase(name);
      const hint = /^[A-Z]/.test(fixed) ? ` — did you mean ${fixed}?` : " (expected: a capital letter, then letters and digits)";
      err(`"${name}" is not a PascalCase name${hint}`);
    },
  },
};

/** "Order list" → "order-list". */
export const slugify = (label: string) =>
  label
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * A JS identifier in PascalCase from an id or icon name: `order-details` → `OrderDetails`. One that would start
 * with a digit (or be empty) gets `prefix` first: `2026-report` → `Screen2026Report` with prefix `Screen`.
 */
export const pascalCase = (id: string, prefix = "") => {
  const name = id
    .split(/[^A-Za-z0-9]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return /^[A-Za-z]/.test(name) ? name : `${prefix}${name}`;
};
