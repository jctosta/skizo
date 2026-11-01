import type { Node } from "@skizo/core";

/** `gap=sm|md|lg`, the same tokens in every Backend. */
const gap = { sm: "gap-2", md: "gap-4", lg: "gap-6" } as const;
/** Stack and Row. `start` adds no class: it is CSS's stretch, so Cards and Tables in a Stack keep their full width. */
const flex = {
  gap,
  align: { start: "", center: "items-center", end: "items-end" },
  justify: { start: "", between: "justify-between", end: "justify-end" },
} as const;

/**
 * Tailwind classes shared by every Backend, one entry per Element type, so the Preview and exports look alike.
 * Write full literal class strings (never `gap-${n}`): Tailwind finds them by scanning this file.
 */
export const CLASSES = {
  Screen: {
    root: "min-h-screen p-6",
    header: "mb-6 grid gap-1",
    headerWithActions: "grid-cols-[1fr_auto] gap-x-4",
    actions: "col-start-2 row-span-2 row-start-1 flex items-center gap-2 self-start justify-self-end",
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
  Card: {
    // The shadcn look, for the Preview; the export gets these from the project's own Card components.
    root: "flex flex-col gap-6 overflow-hidden rounded-xl bg-card py-6 text-sm text-card-foreground shadow-xs ring-1 ring-foreground/10",
    header: "grid auto-rows-min items-start gap-1 px-6",
    headerWithActions: "grid-cols-[1fr_auto]",
    title: "text-base leading-normal font-medium",
    desc: "text-sm text-muted-foreground",
    action: "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
    content: "flex flex-col gap-3 px-6",
    footer: "flex items-center px-6",
    // Added in every Backend: a slot lays its Elements out side by side.
    actions: "flex items-center gap-2",
    footerItems: "gap-2",
    span: { 1: "col-span-1", 2: "col-span-2", 3: "col-span-3", 4: "col-span-4", 5: "col-span-5", 6: "col-span-6" },
  },
  /** The Preview's copy of shadcn's table.tsx; the export gets these from the project's own Table components. */
  Table: {
    container: "relative w-full overflow-x-auto",
    table: "w-full caption-bottom text-sm",
    header: "[&_tr]:border-b",
    body: "[&_tr:last-child]:border-0",
    row: "border-b transition-colors hover:bg-muted/50",
    head: "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground",
    cell: "p-2 align-middle whitespace-nowrap",
  },
  List: { root: "ml-6 list-disc text-sm [&>li]:mt-1" },
  /** shadcn's TabsList and TabsTrigger looks; the Preview marks the active Tab with aria-selected. */
  Tabs: {
    root: "flex flex-col gap-2",
    list: "inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground",
    trigger:
      "inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring aria-selected:bg-background aria-selected:text-foreground aria-selected:shadow-sm",
    panel: "flex flex-col gap-4",
  },
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
