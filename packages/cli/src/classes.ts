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
    /** A Screen with a Sidebar: the page shell, a sidebar column beside the main area (which holds header and body). */
    shell: "flex min-h-screen",
    main: "min-w-0 flex-1 p-6",
    header: "mb-6 grid gap-1",
    headerWithActions: "grid-cols-[1fr_auto] gap-x-4",
    actions: "col-start-2 row-span-2 row-start-1 flex items-center gap-2 self-start justify-self-end",
    title: "text-2xl font-semibold tracking-tight",
    subtitle: "text-sm text-muted-foreground",
    body: "flex flex-col gap-4",
  },
  /** Plain markup in every Backend, styled after shadcn's sidebar (bg-sidebar is about bg-muted/50 on white). */
  Sidebar: { root: "w-64 shrink-0 border-r bg-muted/50 p-2", nav: "flex flex-col gap-1" },
  /** shadcn's SidebarMenuButton look; the active Link carries aria-current="page". */
  Link: {
    root: "flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-accent aria-[current=page]:font-medium aria-[current=page]:text-accent-foreground",
    icon: "size-4 shrink-0",
  },
  Heading: {
    "1":"text-3xl font-bold tracking-tight",
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
  /** shadcn Button look-alike for the Preview (exports use <Button variant size>). Reuse it for any button-like trigger. */
  Button: {
    base: "inline-flex shrink-0 items-center justify-center rounded-md border border-transparent text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
    variant: {
      default: "bg-primary text-primary-foreground hover:bg-primary/80",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      outline: "border-border bg-background shadow-xs hover:bg-muted hover:text-foreground",
      ghost: "hover:bg-muted hover:text-foreground",
      destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20",
      link: "text-primary underline-offset-4 hover:underline",
    },
    size: { sm: "h-8 gap-1 px-2.5", md: "h-9 gap-1.5 px-2.5", lg: "h-10 gap-1.5 px-2.5" },
    /** Square sizes for icon-only. */
    iconSize: { sm: "size-8", md: "size-9", lg: "size-10" },
    /** The loading spinner icon. */
    spinner: "animate-spin",
    /** An icon-only Label: hidden, still the accessible name. */
    hiddenLabel: "sr-only",
  },
  /** Shared by the form-control Element types: a Label above its control, error text below. */
  Field: {
    root: "grid gap-2",
    /** shadcn Label look-alike for the Preview (exports use <Label>). */
    label: "flex items-center gap-2 text-sm leading-none font-medium select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
    error: "text-sm text-destructive",
    /** A small control beside its Label (Checkbox, Switch, a Radio option). */
    choice: "flex items-center gap-2",
  },
  Input: {
    control: "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm",
  },
  Textarea: {
    /** shadcn's minus field-sizing-content, so the Preview honors rows=. */
    control: "flex min-h-16 w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  },
  /** shadcn Select look-alike for the Preview, opened by preview/script.ts (exports use <Select>). */
  Select: {
    root: "relative",
    trigger: "flex h-9 w-fit items-center justify-between gap-1.5 rounded-md border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
    placeholder: "text-muted-foreground",
    chevron: "pointer-events-none size-4 text-muted-foreground",
    content: "absolute top-full left-0 z-50 mt-1 min-w-36 overflow-hidden rounded-md bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10",
    item: "relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm select-none hover:bg-accent hover:text-accent-foreground aria-selected:[&_svg]:visible",
    check: "pointer-events-none invisible absolute right-2 size-4",
  },
  /** The Preview uses native inputs tinted with the primary color (exports use <Checkbox>, <RadioGroupItem>). */
  Checkbox: { control: "peer size-4 shrink-0 accent-primary disabled:cursor-not-allowed disabled:opacity-50" },
  Switch: {
    track: "peer inline-flex h-[18.4px] w-[32px] shrink-0 items-center rounded-full border border-transparent shadow-xs disabled:cursor-not-allowed disabled:opacity-50",
    trackOn: "bg-primary",
    trackOff: "bg-input",
    thumb: "pointer-events-none block size-4 rounded-full bg-background",
    thumbOn: "translate-x-[calc(100%-2px)]",
    thumbOff: "translate-x-0",
  },
  Radio: { group: "grid gap-3", control: "peer size-4 shrink-0 accent-primary disabled:cursor-not-allowed disabled:opacity-50" },
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
