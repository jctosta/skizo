import type { Document, Node } from "@skizo/core";
import { emitterFor, lines, pascalCase } from "../backend";
import { nodePaths } from "../placeholder";
import { EMITTERS, wrap, type Ctx } from "./elements";

/** The shadcn Export target: file name → TSX, one file per Screen, named after its id. */
export function exportShadcn(document: Document): Record<string, string> {
  const paths = nodePaths(document);
  return Object.fromEntries(document.screens.map((screen) => [`${screen.props.id}.tsx`, screenFile(screen, paths)]));
}

/** `order-details` → `OrderDetailsScreen`; `2026-report` → `Screen2026ReportScreen` (no identifier starts with a digit). */
const componentName = (id: string) => `${pascalCase(id, "Screen")}Screen`;

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
  const declarations: string[] = [];
  const declare: Ctx["declare"] = (code) => declarations.push(code);
  const ctx = (node: Node): Ctx => ({
    path: paths.get(node)!,
    use,
    id,
    hook,
    declare,
    render: (nodes) => nodes.map((n) => emitterFor(EMITTERS, n.type, "shadcn export")(n, ctx(n))).join("\n"),
  });
  const jsx = ctx(screen).render([screen]);
  const head = [...imports.keys()].sort().map((from) => `import { ${[...imports.get(from)!].sort().join(", ")} } from "${from}"\n`);
  const body = wrap(`export function ${componentName(screen.props.id as string)}() {`, lines(...hooks, wrap("return (", jsx, ")")), "}");
  return `${head.join("")}${head.length ? "\n" : ""}${declarations.map((code) => `${code}\n\n`).join("")}${body}\n`;
}
