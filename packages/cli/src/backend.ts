import { ELEMENTS, type Node } from "@skizo/core";

// Helpers every Backend shares, besides CLASSES (classes.ts) and placeholder content (placeholder.ts),
// so the Preview and the exports read the AST the same way.

/** Joins the present lines. */
export const lines = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join("\n");

/** The emitter for an Element type. Each Backend has one for every type in ELEMENTS, so a missing one is a bug. */
export function emitterFor<E>(emitters: Record<string, E>, type: string, backend: string): E {
  const emit = emitters[type];
  if (!emit) throw new Error(`${backend} has no emitter for Element type ${type}`);
  return emit;
}

/**
 * The Sidebar a Screen shows (the page shell's column) and the rest, the Screen's body. The Sidebar is its first
 * child, else `shared` (Document.sidebar) unless the Screen is plain. With `isShared`, the Backend marks the active
 * Link for this Screen itself: the shared node has none.
 */
export function screenParts(screen: Node, shared?: Node) {
  const own = screen.children[0]?.type === "Sidebar" ? screen.children[0] : undefined;
  const sidebar = own ?? (screen.props.plain === true ? undefined : shared);
  return { sidebar, isShared: !own && sidebar !== undefined, body: own ? screen.children.slice(1) : screen.children };
}

const ARROWS = { none: "", up: "↑", down: "↓" };
/** A Stat's hint line: its trend arrow, then hint=; "" when it has neither. */
export const statHint = (node: Node) => [ARROWS[node.props.trend as keyof typeof ARROWS], node.props.hint].filter(Boolean).join(" ");

/** Whether a Button declares a Behavior (opens= or to=). In a footer, a Button without one closes its Dialog or Sheet. */
export const hasBehavior = (node: Node) => node.props.opens !== undefined || node.props.to !== undefined;

/** The color of a Chart's series (a pie's slice) `i`: shadcn's --chart-1 to --chart-5, then from the start again. */
export const chartColor = (i: number) => `var(--chart-${(i % 5) + 1})`;

/** Props a parent grants (a Grid's span): the parent lays its child out with them. */
const GRANTED = new Set(Object.values(ELEMENTS).flatMap((spec) => Object.keys(spec.childProps ?? {})));
/** A Custom's props as written (strings, true for a flag), except those a parent grants: they are not the component's. */
export const customProps = (node: Node) => Object.entries(node.props).filter(([key]) => !GRANTED.has(key));

/** `order-details` → `OrderDetails`; lives in core, which uses it for a Custom name's hint. */
export { pascalCase } from "@skizo/core";
