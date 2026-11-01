/**
 * The Preview's JS: one click handler per built-in interaction or Behavior, inlined in one <script>.
 * An emitter asks for its handler with `ctx.script(name)`; a page carries only the handlers it uses, in this order.
 * Handlers toggle attributes (aria-selected, hidden) or classes that appear literally in src/, so Tailwind builds them.
 */
export const SCRIPTS = {
  tabs: `// Tabs: a click on a Tab selects it and shows the panel at the same position.
document.addEventListener("click", (event) => {
  const tab = event.target instanceof Element && event.target.closest('[role="tab"]');
  if (!tab) return;
  const panels = tab.parentElement.parentElement.querySelectorAll(':scope > [role="tabpanel"]');
  [...tab.parentElement.children].forEach((t, i) => {
    t.setAttribute("aria-selected", String(t === tab));
    panels[i].hidden = t !== tab;
  });
});`,
  dropdown: `// Dropdowns (Select, Menu): a [data-dropdown] holds a [data-dropdown-trigger] and a [data-dropdown-content].
// A click on a trigger toggles its dropdown; any other click closes every open dropdown.
// Picking a [role="option"] in a dropdown also shows it on the trigger.
// An open dropdown that would cross the window's right edge shifts left to fit, like shadcn's.
const fitDropdown = (content) => {
  content.style.translate = "";
  const overflow = content.getBoundingClientRect().right + 8 - document.documentElement.clientWidth;
  if (overflow > 0) content.style.translate = -overflow + "px";
};
document.querySelectorAll("[data-dropdown-content]:not([hidden])").forEach(fitDropdown);
document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const dropdown = target && target.closest("[data-dropdown]");
  const toggled = dropdown && target.closest("[data-dropdown-trigger]") ? dropdown : null;
  const option = dropdown && target.closest('[role="option"]');
  if (option) {
    const shown = dropdown.querySelector("[data-dropdown-trigger] > span");
    shown.textContent = option.textContent;
    shown.removeAttribute("class");
    for (const o of dropdown.querySelectorAll('[role="option"]')) o.setAttribute("aria-selected", String(o === option));
  }
  for (const p of document.querySelectorAll("[data-dropdown]")) {
    const content = p.querySelector("[data-dropdown-content]");
    const open = p === toggled && content.hidden;
    content.hidden = !open;
    if (open) fitDropdown(content);
    p.querySelector("[data-dropdown-trigger]").setAttribute("aria-expanded", String(open));
  }
});
// Escape closes the open dropdowns, and only them: a Dialog under a dropdown stays open.
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const open = [...document.querySelectorAll("[data-dropdown-content]")].filter((c) => c.checkVisibility());
  for (const content of open) {
    content.hidden = true;
    content.closest("[data-dropdown]").querySelector("[data-dropdown-trigger]").setAttribute("aria-expanded", "false");
  }
  if (open.length) event.stopImmediatePropagation();
});`,
  dialog: `// Dialogs and Sheets: a [data-opens] Button shows the [data-dialog] with that id;
// a click on a [data-dialog-close] (close button, backdrop, footer Button without Behavior) or on a link (a Link,
// a Button with to=) hides its Dialog or Sheet, also a link to the Screen already shown.
document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const opener = target && target.closest("[data-opens]");
  if (opener) {
    for (const o of document.querySelectorAll("[data-dialog]")) if (o.dataset.dialog === opener.dataset.opens) o.hidden = false;
    return;
  }
  const closer = target && target.closest("[data-dialog-close], [data-dialog] a");
  if (closer) closer.closest("[data-dialog]").hidden = true;
});
// Escape closes the topmost shown Dialog or Sheet (the last in the page).
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const top = [...document.querySelectorAll("[data-dialog]")].filter((o) => o.checkVisibility()).pop();
  if (top) top.hidden = true;
});`,
  to: `// Screens (to=): one shows at a time. A to= is a link to #<screen id>; the hash picks the Screen,
// so the back button works and a preview --watch reload stays on it. No hash: the first Screen.
const showScreen = () => {
  const screens = [...document.querySelectorAll("[data-screen]")];
  const id = decodeURIComponent(location.hash.slice(1));
  const shown = screens.find((s) => s.dataset.screen === id) || screens[0];
  for (const s of screens) s.hidden = s !== shown;
};
// A Screen shows as it loads, like a remounted page: Dialogs and Sheets opened since close, those flagged open show again.
const dialogs = [...document.querySelectorAll("[data-dialog]")].map((o) => [o, o.hidden]);
addEventListener("hashchange", () => {
  for (const [o, hidden] of dialogs) o.hidden = hidden;
  showScreen();
  scrollTo(0, 0);
});
showScreen();`,
};

export type Script = keyof typeof SCRIPTS;

/**
 * The page around the sketch, not a handler: it runs the <template id="sketch"> (Screens plus SCRIPTS) in the iframe.
 * Never write a literal </body> or </script> here: watch.ts splices before the first </body>, and this is inline.
 */
export const FRAME = `
// Viewport toolbar: the frame is as wide as the pressed button says, so the breakpoint classes respond as on a device.
// A narrower window scales the frame down to fit, like a browser's device mode.
// history.state keeps the picked width and this page's hash keeps the shown Screen, so a reload keeps both.
// The picked width is saved with the width the page was written at (--viewport): a page written at another one opens at it.
const frame = document.querySelector("iframe");
const buttons = [...document.querySelectorAll("button[data-width]")];
const written = buttons.find((b) => b.ariaPressed === "true");
let width;
const fit = () => {
  const stage = frame.parentElement;
  const scale = Math.min(1, stage.clientWidth / width);
  frame.style.width = width + "px";
  frame.style.height = stage.clientHeight / scale + "px";
  frame.style.scale = String(scale);
};
const pick = (button) => {
  for (const b of buttons) b.setAttribute("aria-pressed", String(b === button));
  width = Number(button.dataset.width);
  history.replaceState({ viewport: button.value, written: written.value }, "");
  fit();
};
for (const b of buttons) b.addEventListener("click", () => pick(b));
addEventListener("resize", fit);
const saved = history.state?.written === written.value && buttons.find((b) => b.value === history.state.viewport);
pick(saved || written);
// The base keeps the sketch's #screen links inside the frame. The frame starts on this page's hash and copies its own back.
frame.addEventListener("load", () => {
  const sketch = frame.contentWindow;
  sketch.addEventListener("hashchange", () => history.replaceState(history.state, "", location.href.split("#")[0] + sketch.location.hash));
});
frame.srcdoc = '<!doctype html><html lang="en"><head><meta charset="utf-8"><base href="about:srcdoc">' +
  '<script>history.replaceState(null, "", parent.location.hash)<\\/script>' +
  "<style>" + document.querySelector("style").textContent + "</style></head><body>" +
  document.getElementById("sketch").innerHTML;
`;
