import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser, type Page } from "playwright";
import { afterAll, beforeAll, expect, test } from "vitest";
import { runCli, withFiles } from "./helpers/run-cli";

let browser: Browser;
beforeAll(async () => {
  browser = await chromium.launch();
});
afterAll(async () => {
  await browser?.close();
});

const SKETCH = `Screen "New order"
  Button "More actions" icon=ellipsis icon-only variant=ghost
  Select "Status" options="Open,Paid" value=Open
  Select "Plan" options="Free,Pro" placeholder="Pick a plan" open
`;

/** Opens the Preview of SKETCH with the network blocked; `external` collects any request that left the file. */
async function openPreview(): Promise<{ page: Page; external: string[] }> {
  const cwd = withFiles({ "order.skz": SKETCH });
  await runCli(["preview", "order.skz"], cwd);
  const context = await browser.newContext({ viewport: { width: 640, height: 480 } });
  const external: string[] = [];
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith("file:")) return route.continue();
    external.push(url);
    return route.abort();
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(join(cwd, "order.html")).href);
  return { page, external };
}

test("a Select opens on click and shows its options, without network requests", async () => {
  const { page, external } = await openPreview();
  const paid = page.getByRole("option", { name: "Paid" });
  const hiddenBefore = await paid.isHidden();
  await page.getByRole("combobox", { name: "Status" }).click();
  expect({ hiddenBefore, visibleAfter: await paid.isVisible(), external }).toEqual({
    hiddenBefore: true,
    visibleAfter: true,
    external: [],
  });
  await page.context().close();
});

test("a Select flagged open shows its options on load", async () => {
  const { page } = await openPreview();
  expect(await page.getByRole("option", { name: "Pro" }).isVisible()).toBe(true);
  await page.context().close();
});

test("an icon-only Button shows only its icon and keeps its Label as the accessible name", async () => {
  const { page } = await openPreview();
  const button = page.getByRole("button", { name: "More actions" });
  const box = await button.boundingBox();
  // The visible content is the icon alone: a square icon button (shadcn size="icon", 36px).
  expect({ icons: await button.locator("svg").count(), width: box?.width, height: box?.height }).toEqual({
    icons: 1,
    width: 36,
    height: 36,
  });
  await page.context().close();
});
