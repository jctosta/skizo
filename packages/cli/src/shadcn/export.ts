import type { Document, Node } from "@skizo/core";
import { emitterFor, lines, pascalCase } from "../backend";
import { nodePaths } from "../placeholder";
import { EMITTERS, wrap, type Ctx, type Router } from "./elements";

/** The shadcn Export target: file name → TSX, one file per Screen, named after its id. */
export function exportShadcn(document: Document, { router }: { router?: Router } = {}): Record<string, string> {
  const paths = nodePaths(document);
  return Object.fromEntries(document.screens.map((screen) => [`${screen.props.id}.tsx`, screenFile(screen, paths, router)]));
}

/** `order-details` → `OrderDetailsScreen`; `2026-report` → `Screen2026ReportScreen` (no identifier starts with a digit). */
const componentName = (id: string) => `${pascalCase(id, "Screen")}Screen`;

const DEFAULT = "default as ";
/** What an import statement names: `{ A, B }`; a `default as X` name comes first and bare: `X, { A }`. */
const importClause = (names: string[]) => {
  const defaultName = names.find((name) => name.startsWith(DEFAULT));
  const named = names.filter((name) => name !== defaultName);
  return [defaultName?.slice(DEFAULT.length), named.length > 0 && `{ ${named.join(", ")} }`].filter(Boolean).join(", ");
};

function screenFile(screen: Node, paths: Map<Node, string>, router: Router | undefined): string {
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
    router,
    render: (nodes) => nodes.map((n) => emitterFor(EMITTERS, n.type, "shadcn export")(n, ctx(n))).join("\n"),
  });
  const jsx = ctx(screen).render([screen]);
  const head = [...imports.keys()].sort().map((from) => `import ${importClause([...imports.get(from)!].sort())} from "${from}"\n`);
  const body = wrap(`export function ${componentName(screen.props.id as string)}() {`, lines(...hooks, wrap("return (", jsx, ")")), "}");
  return `${head.join("")}${head.length ? "\n" : ""}${body}\n`;
}
