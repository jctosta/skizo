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
// a click on a [data-dialog-close] (close button, backdrop, footer Button without Behavior) hides its Dialog or Sheet.
document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const opener = target && target.closest("[data-opens]");
  if (opener) {
    for (const o of document.querySelectorAll("[data-dialog]")) if (o.dataset.dialog === opener.dataset.opens) o.hidden = false;
    return;
  }
  const closer = target && target.closest("[data-dialog-close]");
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
