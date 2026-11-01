import type { Document, Node } from "@skizo/core";
import { nodePaths } from "../placeholder";
import { EMITTERS, lines, wrap, type Ctx } from "./elements";

/** The shadcn Export target: file name → TSX, one file per Screen, named after its id. */
export function exportShadcn(document: Document): Record<string, string> {
  const paths = nodePaths(document);
  return Object.fromEntries(document.screens.map((screen) => [`${screen.props.id}.tsx`, screenFile(screen, paths)]));
}

/** `order-details` → `OrderDetailsScreen`. */
const componentName = (id: string) =>
  `${id
    .split(/[^A-Za-z0-9]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")}Screen`;

function screenFile(screen: Node, paths: Map<Node, string>): string {
  const imports = new Map<string, Set<string>>();
  const use: Ctx["use"] = (from, ...names) => {
    const set = imports.get(from) ?? new Set();
    for (const name of names) set.add(name);
    imports.set(from, set);
  };
  const ids = new Map<string, number>();
  const id: Ctx["id"] = (base) => {
    const n = (ids.get(base) ?? 0) + 1;
    ids.set(base, n);
    // ponytail: a Label that slugs to "name-2" can still collide with a second "Name"; dedupe across both if it bites.
    return n === 1 ? base : `${base}-${n}`;
  };
  const hooks: string[] = [];
  const hook: Ctx["hook"] = (line) => hooks.push(line);
  const ctx = (node: Node): Ctx => ({
    path: paths.get(node)!,
    use,
    id,
    hook,
    render: (nodes) => nodes.map((n) => emit(n, ctx(n))).join("\n"),
  });
  const jsx = emit(screen, ctx(screen));
  const head = [...imports.keys()].sort().map((from) => `import { ${[...imports.get(from)!].sort().join(", ")} } from "${from}"\n`);
  const body = wrap(`export function ${componentName(screen.props.id as string)}() {`, lines(...hooks, wrap("return (", jsx, ")")), "}");
  return `${head.join("")}${head.length ? "\n" : ""}${body}\n`;
}

function emit(node: Node, ctx: Ctx): string {
  const emitter = EMITTERS[node.type];
  if (!emitter) throw new Error(`shadcn export has no emitter for Element type ${node.type}`);
  return emitter(node, ctx);
}
