import type { CheckError, Document, Node } from "./ast";

/** Where the children of a line go: an Element's children, a slot of it, or nowhere (row lines). */
type Frame = { node?: Node; into: Node[] | null };

const SLOTS = ["actions", "footer"] as const;
const STRING = /"((?:[^"\\]|\\.)*)"/y;
const WORD = /([^\s="]+)(=?)/y;
const BARE = /[^\s"]*/y;
const FLAG = /^[a-z][a-z0-9-]*$/;

/**
 * Line-based parser for the Spec v0.2 line grammar. Builds the AST and reports syntax errors.
 * Prop values stay raw strings (`\,` kept for list splitting); the validator coerces them.
 */
export function parse(source: string): { document: Document; errors: CheckError[] } {
  const errors: CheckError[] = [];
  const screens: Node[] = [];
  /** stack[n] is the frame that receives lines at indent level n. */
  const stack: Frame[] = [{ into: screens }];

  source.split("\n").forEach((raw, i) => {
    const line = i + 1;
    const content = raw.trim();
    if (!content || content.startsWith("//")) return;
    const kind = content.startsWith('"') ? "Text" : content.startsWith("|") ? "Table" : content.match(/^[^\s"]*/)![0];
    const err = (message: string) => errors.push({ line, type: kind, message });

    const ws = raw.slice(0, raw.length - raw.trimStart().length);
    let indent = ws.length;
    if (ws.includes("\t")) {
      err("tab in indentation (indent with 2 spaces)");
      indent = ws.replaceAll("\t", "  ").length;
    } else if (indent % 2) err(`indent of ${indent} spaces is not a multiple of 2`);
    let level = Math.floor(indent / 2);
    if (level >= stack.length) {
      err("more than one level deeper than its parent (indent 2 spaces per level)");
      level = stack.length - 1;
    }
    stack.length = level + 1;
    const parent = stack[level]!;
    const place = (node: Node) => {
      if (parent.into) parent.into.push(node);
      else err("row lines take no children");
    };

    if (kind === "Table") {
      if (parent.node?.type === "Table") (parent.node.rows ??= []).push(cells(content));
      else err("row line outside a Table");
      stack.push({ into: null });
    } else if ((SLOTS as readonly string[]).includes(content)) {
      const name = content as (typeof SLOTS)[number];
      if (parent.node) stack.push({ into: ((parent.node.slots ??= {})[name] ??= []) });
      else {
        err(`slot word "${name}" goes directly under an Element`);
        stack.push({ into: [] });
      }
    } else {
      const node: Node = { type: kind, props: {}, children: [], line };
      tokenize(kind === "Text" ? content : content.slice(kind.length), node, err);
      if (kind === "Text" && Object.keys(node.props).length)
        err('a bare string line takes no flags or props (write Text "..." with them instead)');
      place(node);
      stack.push({ node, into: node.children });
    }
  });

  return { document: { screens }, errors };
}

/** Reads the Label, flags and props of one line into `node`. Stops at the first unreadable string. */
function tokenize(rest: string, node: Node, err: (message: string) => void) {
  let i = 0;
  const read = (re: RegExp) => {
    re.lastIndex = i;
    const m = re.exec(rest);
    if (m) i = re.lastIndex;
    return m;
  };
  const string = () => {
    const m = read(STRING);
    if (!m) err('unterminated string (missing closing ")');
    return m?.[1]!.replace(/\\(["\\])/g, "$1");
  };

  while (i < rest.length) {
    if (rest[i] === " ") {
      i++;
    } else if (rest[i] === '"') {
      const s = string();
      if (s === undefined) return;
      if (node.label === undefined) node.label = s;
      else err(`second bare string "${s}" (an Element has one Label)`);
    } else {
      const m = read(WORD);
      const key = m?.[1] ?? rest.slice(i).split(" ")[0]!;
      if (!m) i += key.length;
      if (key.startsWith("//")) {
        err('unexpected "//" (comments go on their own line)');
        return;
      }
      let value: string | true = true;
      if (m?.[2]) {
        const s = rest[i] === '"' ? string() : read(BARE)![0];
        if (s === undefined) return;
        if (s === "") err(`${key}= has no value`);
        value = s;
      }
      if (!FLAG.test(key)) err(`unexpected "${key}" (Labels are quoted, flags are lowercase words, props are key=value)`);
      else if (key in node.props) err(`duplicate "${key}"`);
      else node.props[key] = value;
    }
  }
}

/** `| a | b |` → ["a", "b"]; the trailing pipe is optional. */
const cells = (row: string) => row.replace(/^\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());
