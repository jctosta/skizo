import { chromium, type Browser, type FrameLocator, type Page } from "playwright";
import { afterAll, beforeAll, expect, test } from "vitest";
import { openPreview } from "./helpers/preview-page";

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

/** Opens the Overlay named `name` from its Button and reports whether it was hidden before and shown after. */
async function open(sketch: FrameLocator, name: string) {
  const overlay = sketch.getByRole("dialog", { name });
  const hiddenBefore = await overlay.isHidden();
  await sketch.getByRole("button", { name }).click();
  return { overlay, hiddenBefore, visibleAfter: await overlay.isVisible() };
}

/** Clicks near the top-left corner of the sketch, where an open Overlay shows its backdrop. */
async function clickBackdrop(page: Page) {
  const frame = (await page.locator("iframe").boundingBox())!;
  await page.mouse.click(frame.x + 5, frame.y + 5);
}

test("opens= shows the Dialog and its close button hides it, without network requests", async () => {
  const { sketch, external } = await openPreview(browser, SKETCH);
  const { overlay, hiddenBefore, visibleAfter } = await open(sketch, "New order");
  await overlay.getByRole("button", { name: "Close" }).click();
  expect({ hiddenBefore, visibleAfter, hiddenAfterClose: await overlay.isHidden(), external }).toEqual({
    hiddenBefore: true,
    visibleAfter: true,
    hiddenAfterClose: true,
    external: [],
  });
});

test("a backdrop click closes the Dialog", async () => {
  const { page, sketch } = await openPreview(browser, SKETCH);
  const { overlay, visibleAfter } = await open(sketch, "New order");
  await clickBackdrop(page);
  expect({ visibleAfter, hiddenAfterClose: await overlay.isHidden() }).toEqual({ visibleAfter: true, hiddenAfterClose: true });
});

test("a footer Button without Behavior closes the Dialog", async () => {
  const { sketch } = await openPreview(browser, SKETCH);
  const { overlay, visibleAfter } = await open(sketch, "New order");
  await overlay.getByRole("button", { name: "Cancel" }).click();
  expect({ visibleAfter, hiddenAfterClose: await overlay.isHidden() }).toEqual({ visibleAfter: true, hiddenAfterClose: true });
});

test("opens= shows the Sheet at its side and a backdrop click closes it", async () => {
  const { page, sketch } = await openPreview(browser, SKETCH);
  const { overlay, visibleAfter } = await open(sketch, "Filters");
  const box = await overlay.boundingBox();
  await clickBackdrop(page);
  // side=right is the default: the Sheet's right edge is the viewport's.
  expect({ visibleAfter, right: box && box.x + box.width, hiddenAfterClose: await overlay.isHidden() }).toEqual({
    visibleAfter: true,
    right: 1280,
    hiddenAfterClose: true,
  });
});

test("Escape closes an open Select first, then the Dialog under it", async () => {
  const { page, sketch } = await openPreview(
    browser,
    `Screen "Orders"\n  Button "New order" opens=new-order\n  Dialog "New order" id=new-order\n    Select "Status" options="Open,Paid"\n`,
  );
  const { overlay, visibleAfter } = await open(sketch, "New order");
  await sketch.getByRole("combobox", { name: "Status" }).click();
  const option = sketch.getByRole("option", { name: "Paid" });
  const optionShown = await option.isVisible();
  await page.keyboard.press("Escape");
  const afterFirst = { option: await option.isVisible(), dialog: await overlay.isVisible() };
  await page.keyboard.press("Escape");
  expect({ visibleAfter, optionShown, afterFirst, dialogAfterSecond: await overlay.isVisible() }).toEqual({
    visibleAfter: true,
    optionShown: true,
    afterFirst: { option: false, dialog: true },
    dialogAfterSecond: false,
  });
});

test("an Overlay flagged open shows on load", async () => {
  const { sketch } = await openPreview(browser, `Screen "Orders"\n  Dialog "Welcome back" open\n    "Here is what changed."\n`);
  expect(await sketch.getByRole("dialog", { name: "Welcome back" }).isVisible()).toBe(true);
});
