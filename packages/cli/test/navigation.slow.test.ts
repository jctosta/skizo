import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser, type FrameLocator } from "playwright";
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
async function openPreview(flow = FLOW) {
  const cwd = withFiles({ "flow.skz": flow });
  await runCli(["preview", "flow.skz"], cwd);
  // 1280 px shows the desktop sketch unscaled: Playwright's click checks miss in a scaled frame.
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const external: string[] = [];
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith("file:")) return route.continue();
    external.push(url);
    return route.abort();
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(join(cwd, "flow.html")).href);
  return { page, sketch: page.frameLocator("iframe"), external };
}

const shownTitle = (sketch: FrameLocator) => sketch.getByRole("heading", { level: 1 }).filter({ visible: true }).allTextContents();

test("the first Screen shows on load and a Sidebar Link shows its Screen, marked as the current page", async () => {
  const { page, sketch, external } = await openPreview();
  expect(await shownTitle(sketch)).toEqual(["Orders"]);
  await sketch.getByRole("link", { name: "Dashboard", exact: true }).filter({ visible: true }).click();
  // hashchange fires after the click resolves.
  await expect.poll(() => shownTitle(sketch)).toEqual(["Dashboard"]);
  expect({
    current: await sketch.locator('[aria-current="page"]').filter({ visible: true }).allTextContents(),
    external,
  }).toEqual({ current: ["Dashboard"], external: [] });
  await page.context().close();
});

test("a shared Sidebar shows on each Screen, with the current Screen's Link marked, and not on a plain Screen", async () => {
  const { page, sketch } = await openPreview(`Sidebar
  Link "Dashboard" to=dashboard
  Link "Orders" to=orders

Screen "Orders"
  Button "Sign out" to=sign-in

Screen "Dashboard"
  "Welcome back"

Screen "Sign in" plain
  "Sign in to continue"
`);
  const current = () => sketch.locator('[aria-current="page"]').filter({ visible: true }).allTextContents();
  expect(await current()).toEqual(["Orders"]);
  await sketch.getByRole("link", { name: "Dashboard" }).filter({ visible: true }).click();
  await expect.poll(() => shownTitle(sketch)).toEqual(["Dashboard"]);
  expect(await current()).toEqual(["Dashboard"]);
  await sketch.getByRole("link", { name: "Orders" }).filter({ visible: true }).click();
  await sketch.getByRole("link", { name: "Sign out" }).click();
  await expect.poll(() => shownTitle(sketch)).toEqual(["Sign in"]);
  expect(await sketch.getByRole("navigation").filter({ visible: true }).count()).toBe(0);
  await page.context().close();
});

test("a Button with to= shows its Screen", async () => {
  const { page, sketch } = await openPreview();
  await sketch.getByRole("link", { name: "Open dashboard" }).click();
  await expect.poll(() => shownTitle(sketch)).toEqual(["Dashboard"]);
  await page.context().close();
});

test("a Dialog left open on a Screen is closed when you come back to it", async () => {
  const { page, sketch } = await openPreview(`Screen "Orders"
  Button "New order" opens=new-order
  Dialog "New order" id=new-order
    footer
      Button "See dashboard" to=dashboard

Screen "Dashboard"
  Button "Back to orders" to=orders
`);
  await sketch.getByRole("button", { name: "New order" }).click();
  await sketch.getByRole("link", { name: "See dashboard" }).click();
  await expect.poll(() => shownTitle(sketch)).toEqual(["Dashboard"]);
  await sketch.getByRole("link", { name: "Back to orders" }).click();
  await expect.poll(() => shownTitle(sketch)).toEqual(["Orders"]);
  expect(await sketch.getByRole("dialog", { name: "New order" }).isVisible()).toBe(false);
  await page.context().close();
});
