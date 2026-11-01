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
  },
  Input: {
    control: "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm",
  },
  Textarea: {
    /** shadcn's minus field-sizing-content, so the Preview honors rows=. */
    control: "flex min-h-16 w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  },
} as const;

/** Joins the truthy class strings. */
export const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(" ");
