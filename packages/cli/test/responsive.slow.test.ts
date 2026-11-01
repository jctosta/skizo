// Responsive layout at real widths: the breakpoint classes only respond in a browser.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, expect, test } from "vitest";
import { runCli, withFiles } from "./helpers/run-cli";

let browser: Browser;
beforeAll(async () => {
  browser = await chromium.launch();
});
afterAll(async () => {
  await browser?.close();
});

const SKETCH = `Screen "Orders" subtitle="Track customer orders"
  actions
    Button "New order" icon=plus
  Grid cols=3
    Card "Revenue"
      Stat "$12,450"
    Card "Orders"
      Stat "318"
    Card "Refunds" span=3
      Stat "4"
  Row gap=sm
    Button "Export as CSV" variant=outline
    Button "Print invoices" variant=outline
    Button "Archive" variant=outline
    Button "Share" variant=outline
    Button "Delete" variant=destructive
  Table cols="Order,Customer,Email,Status,Amount,Date,Notes" rows=3
  Tabs
    Tab "All"
      "Every order"
    Tab "Open"
      "Open orders"
`;

/** Opens the Preview at `window` px with the network blocked; `external` collects any request that left the file. */
async function openPreview(args: string[], window: number) {
  const cwd = withFiles({ "orders.skz": SKETCH });
  await runCli(["preview", "orders.skz", ...args], cwd);
  const context = await browser.newContext({ viewport: { width: window, height: 800 } });
  const external: string[] = [];
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith("file:")) return route.continue();
    external.push(url);
    return route.abort();
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(join(cwd, "orders.html")).href);
  return { page, sketch: page.frameLocator("iframe"), external };
}

test("--viewport phone opens at phone width and the toolbar switches to tablet and desktop: a 3-column Grid shows 1, 2 and 3 columns, and nothing overflows", async () => {
  const { page, sketch, external } = await openPreview(["--viewport", "phone"], 1440);
  const layout = () =>
    sketch.locator("html").evaluate(() => {
      const grid = document.querySelector<HTMLElement>(".grid.gap-4")!;
      const table = document.querySelector<HTMLElement>("table")!.parentElement!;
      return {
        width: innerWidth,
        columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
        pageOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        tableScrolls: table.scrollWidth > table.clientWidth,
      };
    });
  const phone = await layout();
  await page.getByRole("button", { name: "Tablet" }).click();
  const tablet = await layout();
  await page.getByRole("button", { name: "Desktop" }).click();
  const desktop = await layout();

  expect({
    phone,
    tablet: { width: tablet.width, columns: tablet.columns },
    desktop: { width: desktop.width, columns: desktop.columns },
    pressed: await page.getByRole("button", { pressed: true }).allTextContents(),
    external,
  }).toEqual({
    phone: { width: 390, columns: 1, pageOverflows: false, tableScrolls: true },
    tablet: { width: 768, columns: 2 },
    desktop: { width: 1280, columns: 3 },
    pressed: ["Desktop"],
    external: [],
  });
  await page.context().close();
});

test("a window narrower than the picked width shows the whole sketch scaled down to fit, and it still takes clicks", async () => {
  const { page, sketch } = await openPreview([], 640);
  const frame = (await page.locator("iframe").boundingBox())!;
  // A real click at the scaled spot: Playwright's own click checks miss in a scaled frame.
  const tab = (await sketch.getByRole("tab", { name: "Open" }).boundingBox())!;
  await page.mouse.click(tab.x + tab.width / 2, tab.y + tab.height / 2);
  expect({
    width: await sketch.locator("html").evaluate(() => innerWidth),
    shown: { left: frame.x, right: frame.x + frame.width },
    pageOverflows: await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth),
    selected: await sketch.getByRole("tab", { selected: true }).textContent(),
  }).toEqual({ width: 1280, shown: { left: 0, right: 640 }, pageOverflows: false, selected: "Open" });
  await page.context().close();
});

const SHARED_SIDEBAR = `Sidebar
  Link "Orders" to=orders
  Link "Dashboard" to=dashboard

Screen "Orders"
  "Recent orders"

Screen "Dashboard"
  "Welcome back"
`;

test("on a phone the Sidebar hides behind a menu Button that opens it in a left Sheet, where a Link shows its Screen", async () => {
  const cwd = withFiles({ "app.skz": SHARED_SIDEBAR });
  await runCli(["preview", "app.skz", "--viewport", "phone"], cwd);
  // 1280 px shows the phone sketch unscaled: Playwright's click checks miss in a scaled frame.
  const page = await browser.newPage({ viewport: { width: 1280, height: 844 } });
  await page.goto(pathToFileURL(join(cwd, "app.html")).href);
  const sketch = page.frameLocator("iframe");
  const shown = (role: "navigation" | "dialog" | "heading") => sketch.getByRole(role).filter({ visible: true });
  const menu = sketch.getByRole("button", { name: "Menu" }).filter({ visible: true });

  const column = await shown("navigation").count();
  await menu.click();
  const sheet = sketch.getByRole("dialog", { name: "Menu" }).filter({ visible: true });
  const left = await sheet.evaluate((el) => el.getBoundingClientRect().left);
  await sheet.getByRole("link", { name: "Dashboard" }).click();
  // hashchange fires after the click resolves.
  await expect.poll(() => shown("heading").first().textContent()).toBe("Dashboard");
  const after = { dialogs: await shown("dialog").count(), menu: await menu.count() };
  // From md: up the column shows and the menu Button does not.
  await page.getByRole("button", { name: "Tablet" }).click();
  const tablet = { navigation: await shown("navigation").count(), menu: await menu.count() };

  expect({ column, left, after, tablet }).toEqual({
    column: 0,
    left: 0,
    after: { dialogs: 0, menu: 1 },
    tablet: { navigation: 1, menu: 0 },
  });
  await page.close();
});
