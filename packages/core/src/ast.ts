/** One Element: a source line plus everything nested under it. */
export type Node = {
  /** Element type: "Screen", "Heading", "Text", ... */
  type: string;
  label?: string;
  /** Raw strings from the parser (flags folded in as true); `check` coerces them per schema. */
  props: Record<string, string | number | boolean | string[]>;
  children: Node[];
  slots?: { actions?: Node[]; footer?: Node[] };
  /** Table only. */
  rows?: string[][];
  /** Table only: the 1-based source line of each of `rows`, for errors. */
  rowLines?: number[];
  /** 1-based source line. */
  line: number;
};

/**
 * After `check`, every Screen has `props.id` (auto-slug of its Label when missing). `sidebar` is the Sidebar written
 * at the top level, before the first Screen: each Screen without its own shows it, unless the Screen is `plain`.
 * Its Links carry no `active`; each Backend marks the Link whose `to` is the Screen it shows.
 */
export type Document = { screens: Node[]; sidebar?: Node };

/** One problem in a source file. `type` is the Element type the line holds. */
export type CheckError = { line: number; type: string; message: string };
