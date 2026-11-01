import type { Document, Node } from "@skizo/core";
import { EMITTERS, wrap, type Ctx } from "./elements";

/** The shadcn Export target: file name → TSX, one file per Screen, named after its id. */
export function exportShadcn(document: Document): Record<string, string> {
  return Object.fromEntries(document.screens.map((screen) => [`${screen.props.id}.tsx`, screenFile(screen)]));
}

/** `order-details` → `OrderDetailsScreen`. */
const componentName = (id: string) =>
  `${id
    .split(/[^A-Za-z0-9]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")}Screen`;

function screenFile(screen: Node): string {
  const imports = new Map<string, Set<string>>();
  const ids = new Map<string, number>();
  const ctx: Ctx = {
    render: (nodes) => nodes.map((node) => emit(node, ctx)).join("\n"),
    use(from, ...names) {
      const set = imports.get(from) ?? new Set();
      for (const name of names) set.add(name);
      imports.set(from, set);
    },
    id(base) {
      const n = (ids.get(base) ?? 0) + 1;
      ids.set(base, n);
      // ponytail: a Label that slugs to "name-2" can still collide with a second "Name"; dedupe across both if it bites.
      return n === 1 ? base : `${base}-${n}`;
    },
  };
  const jsx = emit(screen, ctx);
  const head = [...imports.keys()].sort().map((from) => `import { ${[...imports.get(from)!].sort().join(", ")} } from "${from}"\n`);
  const body = wrap(`export function ${componentName(screen.props.id as string)}() {`, wrap("return (", jsx, ")"), "}");
  return `${head.join("")}${head.length ? "\n" : ""}${body}\n`;
}

function emit(node: Node, ctx: Ctx): string {
  const emitter = EMITTERS[node.type];
  if (!emitter) throw new Error(`shadcn export has no emitter for Element type ${node.type}`);
  return emitter(node, ctx);
}
