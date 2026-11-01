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

const FLOW = `Screen "Orders"
  Sidebar
    Link "Dashboard" icon=home to=dashboard
    Link "Orders" icon=package to=orders
  Button "Open dashboard" to=dashboard

Screen "Dashboard"
  Sidebar
    Link "Dashboard" icon=home to=dashboard
    Link "Orders" icon=package to=orders
  "Welcome back"
`;

/** Opens the Preview of FLOW with the network blocked; `external` collects any request that left the file. */
async function openPreview(): Promise<{ page: Page; external: string[] }> {
  const cwd = withFiles({ "flow.skz": FLOW });
  await runCli(["preview", "flow.skz"], cwd);
  const context = await browser.newContext({ viewport: { width: 640, height: 480 } });
  const external: string[] = [];
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith("file:")) return route.continue();
    external.push(url);
    return route.abort();
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(join(cwd, "flow.html")).href);
  return { page, external };
}

const shownTitle = (page: Page) => page.getByRole("heading", { level: 1 }).filter({ visible: true }).allTextContents();

test("the first Screen shows on load and a Sidebar Link shows its Screen, marked as the current page", async () => {
  const { page, external } = await openPreview();
  expect(await shownTitle(page)).toEqual(["Orders"]);
  await page.getByRole("link", { name: "Dashboard", exact: true }).filter({ visible: true }).click();
  // hashchange fires after the click resolves.
  await expect.poll(() => shownTitle(page)).toEqual(["Dashboard"]);
  expect({
    current: await page.locator('[aria-current="page"]').filter({ visible: true }).allTextContents(),
    external,
  }).toEqual({ current: ["Dashboard"], external: [] });
  await page.context().close();
});

test("a Button with to= shows its Screen", async () => {
  const { page } = await openPreview();
  await page.getByRole("link", { name: "Open dashboard" }).click();
  await expect.poll(() => shownTitle(page)).toEqual(["Dashboard"]);
  await page.context().close();
});
