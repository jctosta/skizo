import type { Node } from "@skizo/core";

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

/** A Screen's Sidebar, when it is the first child (the page shell's column), and the rest: the Screen's body. */
export function screenParts(screen: Node) {
  const sidebar = screen.children[0]?.type === "Sidebar" ? screen.children[0] : undefined;
  return { sidebar, body: sidebar ? screen.children.slice(1) : screen.children };
}

const ARROWS = { none: "", up: "↑", down: "↓" };
/** A Stat's hint line: its trend arrow, then hint=; "" when it has neither. */
export const statHint = (node: Node) => [ARROWS[node.props.trend as keyof typeof ARROWS], node.props.hint].filter(Boolean).join(" ");

/** Whether a Button declares a Behavior (opens= or to=). In a footer, a Button without one closes its Dialog or Sheet. */
export const hasBehavior = (node: Node) => node.props.opens !== undefined || node.props.to !== undefined;

/** The color of a Chart's series (a pie's slice) `i`: shadcn's --chart-1 to --chart-5, then from the start again. */
export const chartColor = (i: number) => `var(--chart-${(i % 5) + 1})`;

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
