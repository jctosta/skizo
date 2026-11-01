import type { Document, Node } from "@skizo/core";
import { emitterFor, lines, pascalCase } from "../backend";
import { nodePaths } from "../placeholder";
import { EMITTERS, wrap, type Ctx, type Router } from "./elements";

/**
 * The shadcn Export target: file name → TSX, one file per Screen, named after its id, plus `app-sidebar.tsx` for
 * the shared Sidebar (check reserves that id when a shared Sidebar exists).
 */
export function exportShadcn(document: Document, { router }: { router?: Router } = {}): Record<string, string> {
  const paths = nodePaths(document);
  const { sidebar } = document;
  const file = (signature: string, node: Node) => componentFile(signature, node, paths, router, sidebar);
  const screens = document.screens.map((screen) => [`${screen.props.id}.tsx`, file(`${componentName(screen.props.id as string)}()`, screen)]);
  if (!sidebar) return Object.fromEntries(screens);
  return Object.fromEntries([["app-sidebar.tsx", file("AppSidebar({ current }: { current: string })", sidebar)], ...screens]);
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

/** A file exporting one component, `signature` (name and parameters), that renders `node`. */
function componentFile(signature: string, node: Node, paths: Map<Node, string>, router: Router | undefined, sidebar?: Node): string {
  const render = (clashes: ReadonlySet<string>) => renderFile(node, paths, router, sidebar, clashes);
  const first = render(new Set());
  // A name the file would declare twice: a Custom named like another import (Label) or like the component itself.
  // Only a Custom can clash, so a second render that aliases it settles the file.
  const declared = [signature.slice(0, signature.indexOf("(")), ...[...first.imports.values()].flatMap((names) => [...names].map(localName))];
  const clashes = new Set(declared.filter((name, i) => declared.indexOf(name) !== i));
  const { imports, hooks, declarations, jsx } = clashes.size ? render(clashes) : first;
  // The Next.js App Router renders a file on the server unless it says otherwise; hooks and recharts need the client.
  const client = router === "next" && (hooks.length > 0 || imports.has("recharts")) ? `"use client"\n\n` : "";
  const head = [...imports.keys()].sort().map((from) => `import ${importClause([...imports.get(from)!].sort())} from "${from}"\n`);
  const body = wrap(`export function ${signature} {`, lines(...hooks, wrap("return (", jsx, ")")), "}");
  return `${client}${head.join("")}${head.length ? "\n" : ""}${declarations.map((code) => `${code}\n\n`).join("")}${body}\n`;
}

/** The name an import entry declares in the file: `Label`, `default as Link` → Link, `type ChartConfig` → ChartConfig. */
const localName = (entry: string) => entry.split(" ").at(-1)!;

/** Renders `node` with fresh per-file state: its JSX and what goes above it (imports, hooks, declarations). */
function renderFile(node: Node, paths: Map<Node, string>, router: Router | undefined, sidebar: Node | undefined, clashes: ReadonlySet<string>) {
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
  const ctx = (n: Node): Ctx => ({
    path: paths.get(n)!,
    use,
    id,
    hook,
    declare,
    router,
    sidebar,
    clashes,
    render: (nodes) => nodes.map((child) => emitterFor(EMITTERS, child.type, "shadcn export")(child, ctx(child))).join("\n"),
  });
  const jsx = ctx(node).render([node]);
  return { imports, hooks, declarations, jsx };
}
