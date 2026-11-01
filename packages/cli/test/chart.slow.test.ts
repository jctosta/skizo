// The Chart Preview is an SVG computed at build time: a real browser shows it draws, offline, in the theme's chart colors.
import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, expect, test } from "vitest";
import { openPreview } from "./helpers/preview-page";

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
  const { sketch, external } = await openPreview(browser, source, { window: 640 });
  const bars = sketch.getByRole("img", { name: "Revenue" }).locator("rect");
  const line = sketch.getByRole("img", { name: "Visits" }).locator("polyline");
  const revenue = sketch.getByRole("img", { name: "Revenue" });
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
    fills: ["oklch(0.646 0.222 41.116)", "oklch(0.6 0.118 184.704)"],
    drawn: true,
    stroke: "oklch(0.646 0.222 41.116)",
    lineSpansThePlot: true,
    xLabels: ["Jan", "Feb"],
    legend: ["Revenue", "Costs"],
    external: [],
  });
});
