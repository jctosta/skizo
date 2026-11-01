import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Browser } from "playwright";
import { onTestFinished } from "vitest";
import { runCli, withFiles } from "./run-cli";

/**
 * Runs `skizo preview sketch.skz ...args` on `source` and opens the written page in a window `window` px wide,
 * closed when the test ends. The network is blocked: `external` collects any request that left the file.
 * The toolbar is on `page`, the sketch in its frame (`sketch`). The default 1280 px shows the desktop sketch unscaled:
 * Playwright's click checks miss in a scaled frame, so a test that clicks needs scale 1 (or `page.mouse`).
 */
export async function openPreview(browser: Browser, source: string, { args = [] as string[], window = 1280 } = {}) {
  const { code, stderr, cwd } = await runCli(["preview", "sketch.skz", ...args], withFiles({ "sketch.skz": source }));
  if (code !== 0) throw new Error(`skizo preview failed (${code}):\n${stderr}`);
  const context = await browser.newContext({ viewport: { width: window, height: 720 } });
  onTestFinished(() => context.close());
  const external: string[] = [];
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith("file:")) return route.continue();
    external.push(url);
    return route.abort();
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(join(cwd, "sketch.html")).href);
  return { page, sketch: page.frameLocator("iframe"), external, cwd };
}
