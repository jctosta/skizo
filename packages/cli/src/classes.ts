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
  Stat: {
    root: "grid gap-1",
    title: "text-sm text-muted-foreground",
    value: "text-2xl font-bold",
    /** The hint line, by trend. */
    none: "text-xs text-muted-foreground",
    up: "text-xs text-emerald-600",
    down: "text-xs text-destructive",
  },
  // Badge, Avatar, Alert and Progress copy the vendored shadcn components (radix-vega) for the Preview only:
  // the export uses the components themselves.
  Badge: {
    root: "inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
    default: "border-transparent bg-primary text-primary-foreground",
    secondary: "border-transparent bg-secondary text-secondary-foreground",
    outline: "text-foreground",
    destructive: "border-transparent bg-destructive/10 text-destructive",
  },
  Avatar: {
    root: "flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground select-none",
    sm: "size-6 text-xs",
    md: "size-8 text-sm",
    lg: "size-10 text-sm",
  },
  Image: {
    root: "flex w-full items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground",
    "16:9": "aspect-video",
    "4:3": "aspect-4/3",
    "3:2": "aspect-3/2",
    "1:1": "aspect-square",
  },
  Alert: {
    root: "grid w-full gap-0.5 rounded-lg border bg-card px-4 py-3 text-left text-sm",
    default: "text-card-foreground",
    destructive: "text-destructive",
    title: "font-medium",
    text: { default: "text-muted-foreground", destructive: "text-destructive/90" },
  },
  Progress: {
    root: "relative flex h-1.5 w-full items-center overflow-hidden rounded-full bg-muted",
    indicator: "h-full bg-primary",
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
