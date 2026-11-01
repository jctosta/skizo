/** One Element: a source line plus everything nested under it. */
export type Node = {
  /** Element type: "Screen", "Heading", "Text", ... */
  type: string;
  label?: string;
  /** Raw strings from the parser (flags folded in as true); `check` coerces them per schema. */
  props: Record<string, string | number | boolean | string[]>;
  children: Node[];
  slots?: { actions?: Node[]; footer?: Node[] };
  /** Table and Chart only. */
  rows?: string[][];
  /** Table and Chart only: the 1-based source line of each of `rows`, for errors. */
  rowLines?: number[];
  /** 1-based source line. */
  line: number;
};

/** After `check`, every Screen has `props.id` (auto-slug of its Label when missing). */
export type Document = { screens: Node[] };

/** One problem in a source file. `type` is the Element type the line holds. */
export type CheckError = { line: number; type: string; message: string };
