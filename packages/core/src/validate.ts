import type { CheckError, Document, Node } from "./ast";
import { ELEMENTS, type ElementSpec, type PropSpec } from "./elements";
import { didYouMean } from "./nearest";

/** `id=`, which every Element takes without listing it. */
const ID_PROP: PropSpec = { kind: "string" };

export type CheckOptions = {
  /** Every name `icon=` accepts. Injected by the caller so core ships no icon data; when omitted, any icon name passes. */
  iconNames?: ReadonlySet<string>;
};

/**
 * Checks a parsed document against the ELEMENTS schemas. Generic: per-Element-type rules belong in ELEMENTS; the
 * only types named here are those of the top level: Screens, and the shared Sidebar before them.
 * Mutates the AST into what Backends read: coerced prop values, defaults, inferred props (ELEMENTS `infer`), and
 * the shared Sidebar moved from `screens` to `sidebar`.
 */
export function validate(document: Document, options: CheckOptions = {}): CheckError[] {
  const errors: CheckError[] = [];
  /** Each id's first Element and the Screen it sits on. */
  const ids = new Map<string, { node: Node; screen: Node }>();
  /** Ref props (opens=, to=) to resolve once every id is known: a Screen may go to one further down the file. */
  const refs: { node: Node; screen: Node; key: string; to: readonly string[] }[] = [];
  /** The Screen being walked. */
  let current: Node;
  const err = (node: Node, message: string) => errors.push({ line: node.line, type: node.type, message });

  // The first top-level Sidebar is shared when no Screen comes before it.
  const top = document.screens.findIndex((node) => node.type === "Sidebar" || node.type === "Screen");
  if (document.screens[top]?.type === "Sidebar") [document.sidebar] = document.screens.splice(top, 1);
  for (const link of document.sidebar?.children ?? [])
    if (link.props.active === true) err(link, "takes no active in a shared Sidebar (each Screen marks the Link whose to= is that Screen)");

  if (!document.screens.length) errors.push({ line: 1, type: "Screen", message: 'no Screen in the file (start with Screen "Title")' });

  const walk = (node: Node, parent?: Node, inSlot = false) => {
    const spec = ELEMENTS[node.type];
    if (!spec) err(node, `unknown Element type "${node.type}"${didYouMean(node.type, Object.keys(ELEMENTS))}`);
    else {
      if (!parent && node.type === "Sidebar" && node !== document.sidebar) {
        if (document.sidebar) err(node, `only one Sidebar per file can be shared (line ${document.sidebar.line} is shared too)`);
        else err(node, "must come before the first Screen to be shared (or go first inside a Screen)");
      } else if (!parent && node.type !== "Screen" && node !== document.sidebar)
        err(node, "must be inside a Screen (only Screens go at the top level)");
      if (parent && node.type === "Screen") err(node, "must be at the top level, not inside another Element");
      const allowed = parent && !inSlot ? ELEMENTS[parent.type]?.children : "any";
      if (!allowed) err(node, `cannot go inside ${parent!.type} (${parent!.type} takes no children)`);
      else if (allowed !== "any" && !allowed.includes(node.type))
        err(node, `cannot go inside ${parent!.type} (allowed: ${allowed.join(", ")})`);
      // At the top level, the rule above already says where it goes.
      if (spec.parents && parent && (inSlot || !spec.parents.includes(parent.type)))
        err(node, `only goes directly inside ${spec.parents.join(" or ")}`);
      if (spec.label === "required" && node.label === undefined) err(node, `needs a Label (${node.type} "...")`);
      if (spec.label === "none" && node.label !== undefined) err(node, "takes no Label");
      for (const name of Object.keys(node.slots ?? {}) as (keyof NonNullable<Node["slots"]>)[])
        if (!spec.slots?.includes(name)) {
          const owners = Object.keys(ELEMENTS).filter((type) => ELEMENTS[type]!.slots?.includes(name));
          err(node, `takes no "${name}" slot (allowed in: ${owners.join(", ")})`);
        }
      // A direct child (not in a slot) may also set its parent's childProps: a Grid's span.
      const host = parent && !inSlot ? ELEMENTS[parent.type] : undefined;
      props(node, spec, host?.childProps, options, err);
      for (const [key, prop] of Object.entries(spec.props))
        if (prop.kind === "ref" && typeof node.props[key] === "string") refs.push({ node, screen: current, key, to: prop.to });
      spec.infer?.(node, parent);
      spec.check?.(node, (message, line = node.line) => errors.push({ line, type: node.type, message }), parent);
      host?.checkChild?.(node, (message) => err(node, message), parent!);
    }

    const id = node.props.id;
    if (typeof id === "string") {
      const first = ids.get(id);
      if (first === undefined) ids.set(id, { node, screen: current });
      else err(node, `duplicate id "${id}" (also on line ${first.node.line})`);
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
  for (const s of document.sidebar ? [document.sidebar, ...document.screens] : document.screens) {
    current = s;
    walk(s);
  }

  // A ref to a Screen (to=) resolves file-wide; any other (opens=: a Dialog or Sheet) only on its own Screen.
  const screenIds = document.screens.map((screen) => screen.props.id).filter((id) => typeof id === "string");
  const screens = `(expected: ${screenIds.join(", ")})`;
  for (const { node, screen, key, to } of refs) {
    const id = node.props[key] as string;
    const target = ids.get(id);
    const expected = `(expected: a ${to.join(" or ")} on this Screen)`;
    if (to.includes("Screen")) {
      if (!target) err(node, `${key}=${id} is an unknown Screen id${didYouMean(id, screenIds)} ${screens}`);
      else if (target.node.type !== "Screen")
        err(node, `${key}=${id} is the ${target.node.type} on line ${target.node.line}, not a Screen ${screens}`);
    } else if (!target) {
      const near = [...ids].filter(([, t]) => t.screen === screen && to.includes(t.node.type)).map(([name]) => name);
      err(node, `${key}=${id} is an unknown id${didYouMean(id, near)} ${expected}`);
    } else if (!to.includes(target.node.type)) err(node, `${key}=${id} is the ${target.node.type} on line ${target.node.line} ${expected}`);
    else if (target.screen !== screen)
      err(node, `${key}=${id} is the ${target.node.type} on line ${target.node.line}, on another Screen ${expected}`);
  }
  return errors;
}

function props(
  node: Node,
  spec: ElementSpec,
  granted: ElementSpec["childProps"],
  options: CheckOptions,
  err: (node: Node, message: string) => void,
) {
  const own = { ...granted, ...spec.props };
  const names = ["id", ...Object.keys(own)];
  for (const [key, raw] of Object.entries(node.props)) {
    const prop = key === "id" ? ID_PROP : own[key];
    if (!prop) {
      const enumProp = Object.entries(spec.props).find(([, p]) => p.kind === "enum" && p.values.includes(key))?.[0];
      const grantors = Object.keys(ELEMENTS).filter((type) => ELEMENTS[type]!.childProps?.[key]);
      if (grantors.length) err(node, `${key} only works directly inside a ${grantors.join(" or ")}`);
      else if (raw !== true) err(node, `unknown prop "${key}"${didYouMean(key, names)}`);
      else err(node, `unknown flag "${key}"${enumProp ? ` — did you mean ${enumProp}=${key}?` : didYouMean(key, names)}`);
    } else if (prop.kind === "flag") {
      if (raw !== true) err(node, `${key} is a flag and takes no value (write just ${key})`);
    } else if (raw === true) {
      err(node, `${key} needs a value${prop.kind === "enum" ? ` (expected: ${prop.values.join(", ")})` : ""}`);
    } else node.props[key] = coerce(key, String(raw), prop, options, (message) => err(node, message));
  }
  for (const [key, prop] of Object.entries(spec.props)) {
    if (node.props[key] !== undefined) continue;
    if (prop.kind === "enum") node.props[key] = prop.values[0]!;
    if ((prop.kind === "number" || prop.kind === "ratio") && prop.default !== undefined) node.props[key] = prop.default;
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
    case "ratio":
      if (!/^[1-9]\d*:[1-9]\d*$/.test(value)) err(`${key}=${value} is not a ratio (expected: W:H with whole numbers above 0, e.g. 4:3)`);
      return value;
    case "list": {
      const items = value.split(/(?<!\\),/).map((item) => item.replaceAll("\\,", ",").trim());
      // An empty option, column or item renders as nothing (and Radix throws on <SelectItem value="">).
      if (items.includes("")) err(`${key} has an empty item (remove the extra comma)`);
      return items;
    }
    default:
      return value.replaceAll("\\,", ",");
  }
}
