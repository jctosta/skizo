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
 *
 * Breakpoints, Tailwind's defaults in both Backends: phone below 768 px (base classes), tablet from 768 px (`md:`),
 * desktop from 1024 px (`lg:`). Write the phone layout first, then what changes from md: and lg:.
 */
export const CLASSES = {
  Screen: {
    /** Smaller padding on phones. */
    root: "min-h-screen p-4 md:p-6",
    /** A Screen with a Sidebar: the page shell, a sidebar column beside the main area (which holds header and body). */
    shell: "flex min-h-screen",
    main: "min-w-0 flex-1 p-4 md:p-6",
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
  /** Wraps at every width: children that do not fit go to the next line instead of past the page edge. */
  Row: { root: "flex flex-wrap", ...flex },
  Grid: {
    root: "grid",
    gap,
    /** One column on phones, at most 2 on tablets, cols on desktop. cols=2 needs no lg: class. */
    cols: {
      2: "grid-cols-1 md:grid-cols-2",
      3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
      5: "grid-cols-1 md:grid-cols-2 lg:grid-cols-5",
      6: "grid-cols-1 md:grid-cols-2 lg:grid-cols-6",
    },
    /** Wraps a child with span=N: a one-cell grid, so the child still stretches like any other Grid child. */
    cell: "grid",
    /**
     * span=N at each width, never more than the columns: none on phones (one column), at most 2 on tablets, N on
     * desktop. check keeps N <= cols, so span alone decides; span=2 needs no lg: class.
     */
    span: {
      1: "col-span-1",
      2: "md:col-span-2",
      3: "md:col-span-2 lg:col-span-3",
      4: "md:col-span-2 lg:col-span-4",
      5: "md:col-span-2 lg:col-span-5",
      6: "md:col-span-2 lg:col-span-6",
    },
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
  /** Its ratio=W:H is an inline aspect-ratio style in every Backend, so any ratio works without a class built for it. */
  Image: { root: "flex w-full items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground" },
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
    /** Scrolls sideways when the Table is wider than the page, as shadcn's container does in the export. */
    container: "relative w-full overflow-x-auto",
    table: "w-full caption-bottom text-sm",
    header: "[&_tr]:border-b",
    body: "[&_tr:last-child]:border-0",
    row: "border-b transition-colors hover:bg-muted/50",
    head: "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground",
    cell: "p-2 align-middle whitespace-nowrap",
  },
  List: { root: "ml-6 list-disc text-sm [&>li]:mt-1" },
  Chart: {
    /** The Preview: the plot (an inline SVG), the x labels in a row of equal columns, then the legend. */
    root: "grid gap-2",
    plot: "h-48 w-full overflow-visible",
    pie: "mx-auto aspect-square h-48",
    labels: "grid text-center text-xs text-muted-foreground",
    label: "truncate",
    // shadcn's ChartLegendContent look.
    legend: "flex flex-wrap items-center justify-center gap-4 pt-3 text-xs",
    legendItem: "flex items-center gap-1.5",
    swatch: "h-2 w-2 shrink-0 rounded-[2px]",
    /** The export: the size of the ChartContainer. */
    container: "aspect-auto h-60 w-full",
    pieContainer: "mx-auto aspect-square h-60",
  },
  /** shadcn's TabsList and TabsTrigger looks; the Preview marks the active Tab with aria-selected. */
  Tabs: {
    root: "flex flex-col gap-2",
    list: "inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground",
    trigger:
      "inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring aria-selected:bg-background aria-selected:text-foreground aria-selected:shadow-sm",
    panel: "flex flex-col gap-4",
  },
  /** shadcn DropdownMenu look-alike for the Preview, opened by preview/script.ts (exports use <DropdownMenu>). Its trigger uses Button. */
  Menu: {
    // No top/left and no positioned wrapper: the content sits under its trigger (its static position) but is laid out
    // against the page, so a Card's overflow-hidden cannot clip a Menu in the Card's actions.
    content: "absolute z-50 mt-1 w-max min-w-32 rounded-md bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10",
    item: "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm select-none",
    default: "hover:bg-accent hover:text-accent-foreground",
    destructive: "text-destructive hover:bg-destructive/10",
    disabled: "pointer-events-none opacity-50",
  },
  // Dialog and Sheet copy the vendored radix-vega components (no animations) for the Preview, shown and hidden by
  // preview/script.ts. The export gets these from the project's own components, plus the `body` wrapper.
  Dialog: {
    backdrop: "fixed inset-0 isolate z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs",
    content: "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-6 rounded-xl bg-popover p-6 text-sm text-popover-foreground ring-1 ring-foreground/10 outline-none sm:max-w-md",
    header: "flex flex-col gap-2",
    title: "leading-none font-medium",
    desc: "text-sm text-muted-foreground",
    body: "grid gap-4",
    footer: "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
    /** The corner X, a ghost icon Button. */
    close: "absolute top-4 right-4",
  },
  Sheet: {
    backdrop: "fixed inset-0 z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs",
    content: "fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg",
    right: "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
    left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
    header: "flex flex-col gap-1.5 p-4",
    title: "font-medium text-foreground",
    desc: "text-sm text-muted-foreground",
    body: "grid flex-1 auto-rows-min gap-4 px-4",
    footer: "mt-auto flex flex-col gap-2 p-4",
    close: "absolute top-4 right-4",
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
    trigger: "flex h-9 w-fit items-center justify-between gap-1.5 rounded-md border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
    placeholder: "text-muted-foreground",
    chevron: "pointer-events-none size-4 text-muted-foreground",
    // Like Menu's: no top/left and no positioned wrapper, so a Card's overflow-hidden cannot clip it.
    content: "absolute z-50 mt-1 min-w-36 overflow-hidden rounded-md bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10",
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
  /** The Preview's stand-in for a project component: a dashed box, its `<Name>` tag and props on top. The export renders the component. */
  Custom: {
    root: "flex flex-col gap-3 rounded-lg border border-dashed p-3",
    tag: "font-mono text-xs break-words text-muted-foreground",
    name: "font-medium text-foreground",
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

/** The classes of the cell a Grid wraps around a child with span=N; undefined without span (no wrapper). */
export function spanClasses(child: Node) {
  const span = child.props.span as keyof typeof CLASSES.Grid.span | undefined;
  return span === undefined ? undefined : cx(CLASSES.Grid.cell, CLASSES.Grid.span[span]);
}
