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

/** Opens the Preview of `flow` with the network blocked; `external` collects any request that left the file. */
async function openPreview(flow = FLOW): Promise<{ page: Page; external: string[] }> {
  const cwd = withFiles({ "flow.skz": flow });
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

test("a shared Sidebar shows on each Screen, with the current Screen's Link marked, and not on a plain Screen", async () => {
  const { page } = await openPreview(`Sidebar
  Link "Dashboard" to=dashboard
  Link "Orders" to=orders

Screen "Orders"
  Button "Sign out" to=sign-in

Screen "Dashboard"
  "Welcome back"

Screen "Sign in" plain
  "Sign in to continue"
`);
  const current = () => page.locator('[aria-current="page"]').filter({ visible: true }).allTextContents();
  expect(await current()).toEqual(["Orders"]);
  await page.getByRole("link", { name: "Dashboard" }).filter({ visible: true }).click();
  await expect.poll(() => shownTitle(page)).toEqual(["Dashboard"]);
  expect(await current()).toEqual(["Dashboard"]);
  await page.getByRole("link", { name: "Orders" }).filter({ visible: true }).click();
  await page.getByRole("link", { name: "Sign out" }).click();
  await expect.poll(() => shownTitle(page)).toEqual(["Sign in"]);
  expect(await page.getByRole("navigation").filter({ visible: true }).count()).toBe(0);
  await page.context().close();
});

test("a Button with to= shows its Screen", async () => {
  const { page } = await openPreview();
  await page.getByRole("link", { name: "Open dashboard" }).click();
  await expect.poll(() => shownTitle(page)).toEqual(["Dashboard"]);
  await page.context().close();
});

test("a Dialog left open on a Screen is closed when you come back to it", async () => {
  const { page } = await openPreview(`Screen "Orders"
  Button "New order" opens=new-order
  Dialog "New order" id=new-order
    footer
      Button "See dashboard" to=dashboard

Screen "Dashboard"
  Button "Back to orders" to=orders
`);
  await page.getByRole("button", { name: "New order" }).click();
  await page.getByRole("link", { name: "See dashboard" }).click();
  await expect.poll(() => shownTitle(page)).toEqual(["Dashboard"]);
  await page.getByRole("link", { name: "Back to orders" }).click();
  await expect.poll(() => shownTitle(page)).toEqual(["Orders"]);
  expect(await page.getByRole("dialog", { name: "New order" }).isVisible()).toBe(false);
  await page.context().close();
});
