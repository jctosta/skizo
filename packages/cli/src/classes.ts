import type { Node } from "@skizo/core";

/**
 * Tailwind classes shared by every Backend, one entry per Element type, so the Preview and exports look alike.
 * Write full literal class strings (never `gap-${n}`): Tailwind finds them by scanning this file.
 */

/** `gap=sm|md|lg`, the same tokens in every Backend. */
const gap = { sm: "gap-2", md: "gap-4", lg: "gap-6" } as const;
/** Stack and Row. `start` adds no class: it is CSS's stretch, so Cards and Tables in a Stack keep their full width. */
const flex = {
  gap,
  align: { start: "", center: "items-center", end: "items-end" },
  justify: { start: "", between: "justify-between", end: "justify-end" },
} as const;

export const CLASSES = {
  Screen: {
    root: "min-h-screen p-6",
    header: "mb-6 grid gap-1",
    title: "text-2xl font-semibold tracking-tight",
    subtitle: "text-sm text-muted-foreground",
    body: "flex flex-col gap-4",
  },
  Heading: {
    "1": "text-3xl font-bold tracking-tight",
    "2": "text-xl font-semibold tracking-tight",
    "3": "text-lg font-semibold tracking-tight",
    "4": "text-base font-semibold",
  },
  Text: {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
    muted: "text-muted-foreground",
    bold: "font-semibold",
  },
  Stack: { root: "flex flex-col", ...flex },
  Row: { root: "flex", ...flex },
  Grid: {
    root: "grid",
    gap,
    cols: { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5", 6: "grid-cols-6" },
  },
  /** The shadcn look, for the Preview; the export gets it from the project's own Separator. */
  Separator: { root: "h-px w-full shrink-0 bg-border" },
} as const;

/** Joins the truthy class strings. */
export const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(" ");

/** A checked Stack or Row's classes. */
export function flexClasses(node: Node) {
  const c = CLASSES[node.type as "Stack" | "Row"];
  const p = node.props as { gap: keyof typeof gap; align: keyof typeof flex.align; justify: keyof typeof flex.justify };
  return cx(c.root, c.gap[p.gap], c.align[p.align], c.justify[p.justify]);
}

/** A checked Grid's classes. */
export function gridClasses(node: Node) {
  const c = CLASSES.Grid;
  const p = node.props as { cols: keyof typeof c.cols; gap: keyof typeof gap };
  return cx(c.root, c.cols[p.cols], c.gap[p.gap]);
}
