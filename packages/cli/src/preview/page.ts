import type { Document, Node } from "@skizo/core";
import { readAsset } from "../assets";
import { nodePaths } from "../placeholder";
import { EMITTERS, esc, type Ctx } from "./elements";

/** The Preview: one self-contained HTML page holding every Screen. No network: CSS is inlined. */
export function renderPreview(document: Document): string {
  const paths = nodePaths(document.screens);
  const ctx: Ctx = { render: (nodes) => render(nodes, ctx), path: (node) => paths.get(node)! };
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
    render(document.screens, ctx),
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
