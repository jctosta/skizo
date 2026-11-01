import type { CheckError, Document, Node } from "./ast";
import { ELEMENTS, type ElementSpec, type PropSpec } from "./elements";
import { didYouMean } from "./nearest";

const ID: PropSpec = { kind: "string" };

export type CheckOptions = {
  /** Every name `icon=` accepts. Injected by the caller so core ships no icon data; when omitted, any icon name passes. */
  iconNames?: ReadonlySet<string>;
};

/**
 * Checks a parsed document against the ELEMENTS schemas. Generic: per-Element-type rules belong in ELEMENTS.
 * Mutates the AST into what Backends read: coerced prop values, enum defaults, Screen ids.
 */
export function validate(document: Document, options: CheckOptions = {}): CheckError[] {
  const errors: CheckError[] = [];
  const ids = new Map<string, number>();
  const err = (node: Node, message: string) => errors.push({ line: node.line, type: node.type, message });

  if (!document.screens.length) errors.push({ line: 1, type: "Screen", message: 'no Screen in the file (start with Screen "Title")' });

  const walk = (node: Node, parent?: Node, inSlot = false) => {
    const spec = ELEMENTS[node.type];
    if (!spec) err(node, `unknown Element type "${node.type}"${didYouMean(node.type, Object.keys(ELEMENTS))}`);
    else {
      if (!parent && node.type !== "Screen") err(node, "must be inside a Screen (only Screens go at the top level)");
      if (parent && node.type === "Screen") err(node, "must be at the top level, not inside another Element");
      const allowed = parent && !inSlot ? ELEMENTS[parent.type]?.children : "any";
      if (!allowed) err(node, `cannot go inside ${parent!.type} (${parent!.type} takes no children)`);
      else if (allowed !== "any" && !allowed.includes(node.type))
        err(node, `cannot go inside ${parent!.type} (allowed: ${allowed.join(", ")})`);
      if (spec.parents && !spec.parents.includes(parent?.type ?? "")) err(node, `only goes inside ${spec.parents.join(" or ")}`);
      if (spec.label === "required" && node.label === undefined) err(node, `needs a Label (${node.type} "...")`);
      if (spec.label === "none" && node.label !== undefined) err(node, "takes no Label");
      for (const name of Object.keys(node.slots ?? {}) as (keyof NonNullable<Node["slots"]>)[])
        if (!spec.slots?.includes(name)) {
          const owners = Object.keys(ELEMENTS).filter((type) => ELEMENTS[type]!.slots?.includes(name));
          err(node, `takes no "${name}" slot (allowed in: ${owners.join(", ")})`);
        }
      props(node, spec, options, err);
      spec.check?.(node, (message, line = node.line) => errors.push({ line, type: node.type, message }));
      // `span` (on any Element type whose schema lists it) counts columns of the Grid it sits directly in.
      const span = node.props.span;
      if (typeof span === "number") {
        const cols = parent?.type === "Grid" && !inSlot ? parent.props.cols : undefined;
        if (cols === undefined) err(node, "span only works directly inside a Grid");
        else if (typeof cols === "number" && span > cols) err(node, `span=${span} is larger than the Grid's cols=${cols}`);
      }
      if (node.type === "Screen" && node.props.id === undefined && node.label !== undefined) {
        const slug = slugify(node.label);
        if (slug) node.props.id = slug;
        else err(node, "cannot derive an id from the Label (add id=name)");
      }
    }

    const id = node.props.id;
    if (typeof id === "string") {
      const first = ids.get(id);
      if (first === undefined) ids.set(id, node.line);
      else err(node, `duplicate id "${id}" (also on line ${first})`);
    }

    for (const child of node.children) walk(child, node);
    for (const child of [...(node.slots?.actions ?? []), ...(node.slots?.footer ?? [])]) walk(child, node, true);

    if (spec?.exclusive) {
      const { flag, firstByDefault } = spec.exclusive;
      const [first, ...extra] = node.children.filter((child) => child.props[flag] === true);
      for (const child of extra)
        err(child, `only one ${child.type} per ${node.type} can be ${flag} (line ${first!.line} is ${flag} too)`);
      if (!first && firstByDefault && node.children[0]) node.children[0].props[flag] = true;
    }
  };
  for (const screen of document.screens) walk(screen);
  return errors;
}

function props(node: Node, spec: ElementSpec, options: CheckOptions, err: (node: Node, message: string) => void) {
  const names = ["id", ...Object.keys(spec.props)];
  for (const [key, raw] of Object.entries(node.props)) {
    const prop = key === "id" ? ID : spec.props[key];
    if (!prop) {
      const enumProp = Object.entries(spec.props).find(([, p]) => p.kind === "enum" && p.values.includes(key))?.[0];
      if (raw !== true) err(node, `unknown prop "${key}"${didYouMean(key, names)}`);
      else err(node, `unknown flag "${key}"${enumProp ? ` — did you mean ${enumProp}=${key}?` : didYouMean(key, names)}`);
    } else if (prop.kind === "flag") {
      if (raw !== true) err(node, `${key} is a flag and takes no value (write just ${key})`);
      else if (prop.needs && node.props[prop.needs] === undefined) err(node, `${key} needs ${prop.needs}=... too`);
    } else if (raw === true) {
      err(node, `${key} needs a value${prop.kind === "enum" ? ` (expected: ${prop.values.join(", ")})` : ""}`);
    } else node.props[key] = coerce(key, String(raw), prop, options, (message) => err(node, message));
  }
  for (const [key, prop] of Object.entries(spec.props)) {
    if (node.props[key] !== undefined) continue;
    if (prop.kind === "enum") node.props[key] = prop.values[0]!;
    if (prop.kind === "number" && prop.default !== undefined) node.props[key] = prop.default;
  }
}

function coerce(
  key: string,
  value: string,
  prop: PropSpec,
  { iconNames }: CheckOptions,
  err: (message: string) => void,
): string | number | string[] {
  switch (prop.kind) {
    case "icon":
      if (iconNames && !iconNames.has(value))
        err(`unknown icon "${value}"${didYouMean(value, iconNames)} (expected: a Lucide icon name)`);
      return value;
    case "enum":
      if (!prop.values.includes(value))
        err(`unknown ${key} "${value}"${didYouMean(value, prop.values)} (expected: ${prop.values.join(", ")})`);
      return value;
    case "number": {
      const n = Number(value);
      if (!/^-?\d+$/.test(value)) err(`${key}=${value} is not a whole number`);
      else if (n < (prop.min ?? -Infinity) || n > (prop.max ?? Infinity))
        err(`${key}=${value} is out of range (expected: ${prop.min ?? ""}..${prop.max ?? ""})`);
      return n;
    }
    case "list":
      return value.split(/(?<!\\),/).map((item) => item.replaceAll("\\,", ",").trim());
    default:
      return value.replaceAll("\\,", ",");
  }
}

/** "Order list" → "order-list". */
export const slugify = (label: string) =>
  label
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
