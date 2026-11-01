import type { Document, Node } from "@skizo/core";
import { readAsset } from "../assets";
import { EMITTERS, esc, type Ctx } from "./elements";
import { SCRIPT } from "./script";

/** The Preview: one self-contained HTML page holding every Screen. No network: CSS and JS are inlined. */
export function renderPreview(document: Document): string {
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
    render(document.screens),
    `<script>${SCRIPT}</script>`,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

const ctx: Ctx = { render };

function render(nodes: Node[]): string {
  return nodes
    .map((node) => {
      const emit = EMITTERS[node.type];
      if (!emit) throw new Error(`Preview has no emitter for Element type ${node.type}`);
      return emit(node, ctx);
    })
    .join("\n");
}
