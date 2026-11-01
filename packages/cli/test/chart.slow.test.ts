// The Chart Preview is an SVG computed at build time: a real browser shows it draws, offline, in the theme's chart colors.
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

test("a Chart previews offline as an SVG in the chart colors, named by its Label, with x labels and a legend", async () => {
  const source = [
    'Screen "Dashboard"',
    '  Chart "Revenue" type=bar cols="Month,Revenue,Costs"',
    "    | Jan | 120 | 80",
    "    | Feb | 160 | 90",
    '  Chart "Visits" cols="Day,Visits" rows=5',
    "",
  ].join("\n");
  const cwd = withFiles({ "dashboard.skz": source });
  await runCli(["preview", "dashboard.skz"], cwd);

  const context = await browser.newContext({ viewport: { width: 640, height: 800 } });
  const external: string[] = [];
  await context.route("**/*", (route) => {
    if (route.request().url().startsWith("file:")) return route.continue();
    external.push(route.request().url());
    return route.abort();
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(join(cwd, "dashboard.html")).href);

  const bars = page.getByRole("img", { name: "Revenue" }).locator("rect");
  const line = page.getByRole("img", { name: "Visits" }).locator("polyline");
  const revenue = page.getByRole("img", { name: "Revenue" });
  expect({
    bars: await bars.count(),
    fills: await bars.evaluateAll((els) => [...new Set(els.map((el) => getComputedStyle(el).fill))]),
    drawn: await bars.evaluateAll((els) => els.every((el) => el.getBoundingClientRect().height > 10)),
    stroke: await line.evaluate((el) => getComputedStyle(el).stroke),
    lineSpansThePlot: (await line.boundingBox())!.width > 400,
    xLabels: await revenue.getByText(/^(Jan|Feb)$/).allTextContents(),
    legend: await revenue.getByText(/^(Revenue|Costs)$/).allTextContents(),
    external,
  }).toEqual({
    bars: 4,
    fills: ["oklch(0.87 0 0)", "oklch(0.556 0 0)"],
    drawn: true,
    stroke: "oklch(0.87 0 0)",
    lineSpansThePlot: true,
    xLabels: ["Jan", "Feb"],
    legend: ["Revenue", "Costs"],
    external: [],
  });
  await context.close();
});
