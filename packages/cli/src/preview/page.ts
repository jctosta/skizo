import type { Document, Node } from "@skizo/core";
import { readAsset } from "../assets";
import { EMITTERS, esc, type Ctx } from "./elements";
import { SCRIPTS, type Script } from "./script";

/** The Preview: one self-contained HTML page holding every Screen. No network: CSS and JS are inlined. */
export function renderPreview(document: Document): string {
  const scripts = new Set<Script>();
  const ctx: Ctx = { render: (nodes) => render(nodes, ctx), script: (name) => scripts.add(name) };
  const body = render(document.screens, ctx);
  const handlers = (Object.keys(SCRIPTS) as Script[]).filter((name) => scripts.has(name)).map((name) => SCRIPTS[name]);
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${esc(document.screens[0]!.label!)}</title>`,
    `<style>${readAsset("assets/preview.css")}</style>`,
    "</head>",
    "<body>",
    body,
    ...(handlers.length ? ["<script>", ...handlers, "</script>"] : []),
    // Keep a literal </body>: preview --watch splices its reload script in before it.
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

function render(nodes: Node[], ctx: Ctx): string {
  return nodes
    .map((node) => {
      const emit = EMITTERS[node.type];
      if (!emit) throw new Error(`Preview has no emitter for Element type ${node.type}`);
      return emit(node, ctx);
    })
    .join("\n");
}
