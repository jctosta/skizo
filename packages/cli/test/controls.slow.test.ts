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

const SKETCH = `Screen "New order"
  Button "More actions" icon=ellipsis icon-only variant=ghost
  Select "Status" options="Open,Paid" value=Open
  Select "Plan" options="Free,Pro" placeholder="Pick a plan" open
  Card "Order #1042"
    actions
      Menu "Row actions" icon=ellipsis icon-only variant=ghost
        Item "Edit"
        Item "Duplicate"
        Item "Delete" destructive
`;

test("a Select opens on click and shows its options, without network requests", async () => {
  const { sketch, external } = await openPreview(browser, SKETCH);
  const paid = sketch.getByRole("option", { name: "Paid" });
  const hiddenBefore = await paid.isHidden();
  await sketch.getByRole("combobox", { name: "Status" }).click();
  expect({ hiddenBefore, visibleAfter: await paid.isVisible(), external }).toEqual({
    hiddenBefore: true,
    visibleAfter: true,
    external: [],
  });
});

test("a Select flagged open shows its options on load", async () => {
  const { sketch } = await openPreview(browser, SKETCH);
  expect(await sketch.getByRole("option", { name: "Pro" }).isVisible()).toBe(true);
});

test("a Menu opens on click, unclipped by its Card and inside the window, and closes on an outside click", async () => {
  const { sketch } = await openPreview(browser, SKETCH);
  const deleteItem = sketch.getByRole("menuitem", { name: "Delete" });
  const hiddenBefore = await deleteItem.isHidden();
  await sketch.getByRole("button", { name: "Row actions" }).click();
  // The last item hangs below its short Card: the pointer hits it only if the Card's overflow-hidden does not clip it.
  const unclipped = await deleteItem.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === el;
  });
  const insideWindow = await sketch.getByRole("menu", { name: "Row actions" }).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.left >= 0 && r.right <= innerWidth;
  });
  await sketch.getByRole("heading", { name: "New order" }).click();
  expect({ hiddenBefore, unclipped, insideWindow, hiddenAfter: await deleteItem.isHidden() }).toEqual({
    hiddenBefore: true,
    unclipped: true,
    insideWindow: true,
    hiddenAfter: true,
  });
});

test("a Select in a Card opens unclipped by the Card", async () => {
  const { sketch } = await openPreview(browser, `Screen "Billing"\n  Card "Payment"\n    Select "Currency" options="EUR,USD,BRL"\n`);
  await sketch.getByRole("combobox", { name: "Currency" }).click();
  // The last option hangs below the short Card: the pointer hits it only if the Card's overflow-hidden does not clip it.
  const unclipped = await sketch.getByRole("option", { name: "BRL" }).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === el;
  });
  expect(unclipped).toBe(true);
});

test("an icon-only Button shows only its icon and keeps its Label as the accessible name", async () => {
  const { sketch } = await openPreview(browser, SKETCH);
  const button = sketch.getByRole("button", { name: "More actions" });
  const box = await button.boundingBox();
  // The visible content is the icon alone: a square icon button (shadcn size="icon", 36px).
  expect({ icons: await button.locator("svg").count(), width: box?.width, height: box?.height }).toEqual({
    icons: 1,
    width: 36,
    height: 36,
  });
});
