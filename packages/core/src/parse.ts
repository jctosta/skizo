import type { CheckError, Document, Node } from "./ast";

/** Line-based parser for the Spec v0.2 line grammar. Builds the AST and reports syntax errors. */
export function parse(source: string): { document: Document; errors: CheckError[] } {
  const errors: CheckError[] = [];
  const screens: Node[] = [];
  /** stack[n] receives the children of lines at indent level n. */
  const stack: Node[][] = [screens];

  source.split("\n").forEach((raw, i) => {
    const line = i + 1;
    const content = raw.trim();
    if (!content) return;
    const node = element(content, line);
    const err = (message: string) => errors.push({ line, type: node.type, message });

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
    stack[level]!.push(node);
    stack.push(node.children);
  });

  return { document: { screens }, errors };
}

function element(content: string, line: number): Node {
  const text = content.startsWith('"');
  const type = text ? "Text" : content.match(/^\S+/)![0];
  const label = content.match(/"([^"]*)"/)?.[1];
  return { type, label, props: {}, children: [], line };
}
