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
  popup: `// Popups (Select, Menu): a [data-popup] holds a [data-popup-trigger] and a [data-popup-content].
// A click on a trigger toggles its popup; any other click closes every open popup.
// Picking a [role="option"] in a popup also shows it on the trigger.
// An open popup that would cross the window's right edge shifts left to fit, like shadcn's.
const fitPopup = (content) => {
  content.style.translate = "";
  const overflow = content.getBoundingClientRect().right + 8 - document.documentElement.clientWidth;
  if (overflow > 0) content.style.translate = -overflow + "px";
};
document.querySelectorAll("[data-popup-content]:not([hidden])").forEach(fitPopup);
document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const popup = target && target.closest("[data-popup]");
  const toggled = popup && target.closest("[data-popup-trigger]") ? popup : null;
  const option = popup && target.closest('[role="option"]');
  if (option) {
    const shown = popup.querySelector("[data-popup-trigger] > span");
    shown.textContent = option.textContent;
    shown.removeAttribute("class");
    for (const o of popup.querySelectorAll('[role="option"]')) o.setAttribute("aria-selected", String(o === option));
  }
  for (const p of document.querySelectorAll("[data-popup]")) {
    const content = p.querySelector("[data-popup-content]");
    const open = p === toggled && content.hidden;
    content.hidden = !open;
    if (open) fitPopup(content);
    p.querySelector("[data-popup-trigger]").setAttribute("aria-expanded", String(open));
  }
});`,
  overlay: `// Overlays (Dialog, Sheet): a [data-opens] Button shows the [data-overlay] with that id;
// a click on a [data-overlay-close] (close button, backdrop, footer Button without Behavior) hides its overlay.
document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const opener = target && target.closest("[data-opens]");
  if (opener) {
    for (const o of document.querySelectorAll("[data-overlay]")) if (o.dataset.overlay === opener.dataset.opens) o.hidden = false;
    return;
  }
  const closer = target && target.closest("[data-overlay-close]");
  if (closer) closer.closest("[data-overlay]").hidden = true;
});`,
};

export type Script = keyof typeof SCRIPTS;
