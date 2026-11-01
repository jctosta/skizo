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
  popup: `// Popups (Select): a [data-popup] holds a [data-popup-trigger] and a [data-popup-content].
// A click on a trigger toggles its popup; any other click closes every open popup.
// Picking a [role="option"] in a popup also shows it on the trigger.
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
    p.querySelector("[data-popup-trigger]").setAttribute("aria-expanded", String(open));
  }
});`,
  to: `// Screens (to=): one shows at a time. A to= is a link to #<screen id>; the hash picks the Screen,
// so the back button works and a preview --watch reload stays on it. No hash: the first Screen.
const showScreen = () => {
  const screens = [...document.querySelectorAll("[data-screen]")];
  const id = decodeURIComponent(location.hash.slice(1));
  const shown = screens.find((s) => s.dataset.screen === id) || screens[0];
  for (const s of screens) s.hidden = s !== shown;
};
addEventListener("hashchange", () => (showScreen(), scrollTo(0, 0)));
showScreen();`,
};

export type Script = keyof typeof SCRIPTS;
