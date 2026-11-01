import type { Document, Node } from "@skizo/core";
import { emitterFor, lines, pascalCase } from "../backend";
import { nodePaths } from "../placeholder";
import { EMITTERS, wrap, type Ctx } from "./elements";

/**
 * The shadcn Export target: file name → TSX, one file per Screen, named after its id, plus `app-sidebar.tsx` for
 * the shared Sidebar. ponytail: a Screen with id `app-sidebar` overwrites that file; reserve the id if it bites.
 */
export function exportShadcn(document: Document): Record<string, string> {
  const paths = nodePaths(document);
  const { sidebar } = document;
  const screens = document.screens.map((screen) => [
    `${screen.props.id}.tsx`,
    componentFile(`${componentName(screen.props.id as string)}()`, screen, paths, sidebar),
  ]);
  if (!sidebar) return Object.fromEntries(screens);
  return Object.fromEntries([["app-sidebar.tsx", componentFile("AppSidebar({ current }: { current: string })", sidebar, paths, sidebar)], ...screens]);
}

/** `order-details` → `OrderDetailsScreen`; `2026-report` → `Screen2026ReportScreen` (no identifier starts with a digit). */
const componentName = (id: string) => `${pascalCase(id, "Screen")}Screen`;

/** A file exporting one component, `signature` (name and parameters), that renders `node`. */
function componentFile(signature: string, node: Node, paths: Map<Node, string>, sidebar?: Node): string {
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
  const ctx = (n: Node): Ctx => ({
    path: paths.get(n)!,
    use,
    id,
    hook,
    sidebar,
    render: (nodes) => nodes.map((child) => emitterFor(EMITTERS, child.type, "shadcn export")(child, ctx(child))).join("\n"),
  });
  const jsx = ctx(node).render([node]);
  const head = [...imports.keys()].sort().map((from) => `import { ${[...imports.get(from)!].sort().join(", ")} } from "${from}"\n`);
  const body = wrap(`export function ${signature} {`, lines(...hooks, wrap("return (", jsx, ")")), "}");
  return `${head.join("")}${head.length ? "\n" : ""}${body}\n`;
}
