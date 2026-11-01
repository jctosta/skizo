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
`;

test("a 3-column Grid shows 1 column on a phone, 2 on a tablet and 3 on desktop, and nothing overflows the page", async () => {
  const cwd = withFiles({ "orders.skz": SKETCH });
  await runCli(["preview", "orders.skz"], cwd);
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(pathToFileURL(join(cwd, "orders.html")).href);

  const layout = () =>
    page.evaluate(() => {
      const grid = document.querySelector<HTMLElement>(".grid.gap-4")!;
      const table = document.querySelector<HTMLElement>("table")!.parentElement!;
      return {
        columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
        pageOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        tableScrolls: table.scrollWidth > table.clientWidth,
      };
    });
  const phone = await layout();
  await page.setViewportSize({ width: 768, height: 1024 });
  const tablet = await layout();
  await page.setViewportSize({ width: 1280, height: 800 });
  const desktop = await layout();

  expect({ phone, tablet: tablet.columns, desktop: desktop.columns }).toEqual({
    phone: { columns: 1, pageOverflows: false, tableScrolls: true },
    tablet: 2,
    desktop: 3,
  });
  await page.close();
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
  await runCli(["preview", "app.skz"], cwd);
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(pathToFileURL(join(cwd, "app.html")).href);
  const shown = (role: "navigation" | "dialog" | "heading") => page.getByRole(role).filter({ visible: true });
  const menu = page.getByRole("button", { name: "Menu" }).filter({ visible: true });

  const column = await shown("navigation").count();
  await menu.click();
  const sheet = page.getByRole("dialog", { name: "Menu" }).filter({ visible: true });
  const left = (await sheet.boundingBox())?.x;
  await sheet.getByRole("link", { name: "Dashboard" }).click();
  // hashchange fires after the click resolves.
  await expect.poll(() => shown("heading").first().textContent()).toBe("Dashboard");
  const after = { dialogs: await shown("dialog").count(), menu: await menu.count() };
  // From md: up the column shows and the menu Button does not.
  await page.setViewportSize({ width: 768, height: 1024 });
  const tablet = { navigation: await shown("navigation").count(), menu: await menu.count() };

  expect({ column, left, after, tablet }).toEqual({
    column: 0,
    left: 0,
    after: { dialogs: 0, menu: 1 },
    tablet: { navigation: 1, menu: 0 },
  });
  await page.close();
});
