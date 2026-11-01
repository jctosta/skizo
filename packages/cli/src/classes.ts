/**
 * Tailwind classes shared by every Backend, one entry per Element type, so the Preview and exports look alike.
 * Write full literal class strings (never `gap-${n}`): Tailwind finds them by scanning this file.
 */
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
