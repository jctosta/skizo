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

const SKETCH = `Screen "Orders"
  actions
    Button "New order" opens=new-order
    Button "Filters" opens=filters
  Dialog "New order" id=new-order
    Input "Customer"
    footer
      Button "Cancel" variant=outline
  Sheet "Filters" id=filters
    Text "Narrow the list."
`;

/** Opens the Preview of `sketch` with the network blocked; `external` collects any request that left the file. */
async function openPreview(sketch = SKETCH): Promise<{ page: Page; external: string[] }> {
  const cwd = withFiles({ "orders.skz": sketch });
  await runCli(["preview", "orders.skz"], cwd);
  const context = await browser.newContext({ viewport: { width: 640, height: 480 } });
  const external: string[] = [];
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith("file:")) return route.continue();
    external.push(url);
    return route.abort();
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(join(cwd, "orders.html")).href);
  return { page, external };
}

/** Opens the Overlay named `name` from its Button and reports whether it was hidden before and shown after. */
async function open(page: Page, name: string) {
  const overlay = page.getByRole("dialog", { name });
  const hiddenBefore = await overlay.isHidden();
  await page.getByRole("button", { name }).click();
  return { overlay, hiddenBefore, visibleAfter: await overlay.isVisible() };
}

test("opens= shows the Dialog and its close button hides it, without network requests", async () => {
  const { page, external } = await openPreview();
  const { overlay, hiddenBefore, visibleAfter } = await open(page, "New order");
  await overlay.getByRole("button", { name: "Close" }).click();
  expect({ hiddenBefore, visibleAfter, hiddenAfterClose: await overlay.isHidden(), external }).toEqual({
    hiddenBefore: true,
    visibleAfter: true,
    hiddenAfterClose: true,
    external: [],
  });
  await page.context().close();
});

test("a backdrop click closes the Dialog", async () => {
  const { page } = await openPreview();
  const { overlay, visibleAfter } = await open(page, "New order");
  await page.mouse.click(5, 5);
  expect({ visibleAfter, hiddenAfterClose: await overlay.isHidden() }).toEqual({ visibleAfter: true, hiddenAfterClose: true });
  await page.context().close();
});

test("a footer Button without Behavior closes the Dialog", async () => {
  const { page } = await openPreview();
  const { overlay, visibleAfter } = await open(page, "New order");
  await overlay.getByRole("button", { name: "Cancel" }).click();
  expect({ visibleAfter, hiddenAfterClose: await overlay.isHidden() }).toEqual({ visibleAfter: true, hiddenAfterClose: true });
  await page.context().close();
});

test("opens= shows the Sheet at its side and a backdrop click closes it", async () => {
  const { page } = await openPreview();
  const { overlay, visibleAfter } = await open(page, "Filters");
  const box = await overlay.boundingBox();
  await page.mouse.click(5, 5);
  // side=right is the default: the Sheet's right edge is the viewport's.
  expect({ visibleAfter, right: box && box.x + box.width, hiddenAfterClose: await overlay.isHidden() }).toEqual({
    visibleAfter: true,
    right: 640,
    hiddenAfterClose: true,
  });
  await page.context().close();
});

test("an Overlay flagged open shows on load", async () => {
  const { page } = await openPreview(`Screen "Orders"\n  Dialog "Welcome back" open\n    "Here is what changed."\n`);
  expect(await page.getByRole("dialog", { name: "Welcome back" }).isVisible()).toBe(true);
  await page.context().close();
});
