import { readFileSync } from "node:fs";

/**
 * Reads a file shipped in the package, relative to packages/cli/ (e.g. "assets/preview.css").
 * Must stay directly in src/: the bundle is flat (dist/cli.mjs), so "../" is packages/cli/ from both.
 */
export const readAsset = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
