/**
 * The Preview's built-in interactions, inlined in a <script> at the end of every page. Keep it small and URL-free
 * (the Preview makes no requests). Classes it toggles must also appear literally in classes.ts for Tailwind.
 *
 * Popups (Select): a [data-popup] holds a [data-popup-trigger] and a [data-popup-content] that is `hidden` when
 * closed. Clicking a trigger toggles its popup; any other click closes every open popup. Clicking a
 * [role=option] inside a popup also makes it the trigger's shown value.
 */
export const SCRIPT = `document.addEventListener("click", (event) => {
  const popup = event.target.closest("[data-popup]");
  const trigger = event.target.closest("[data-popup-trigger]");
  const option = event.target.closest("[role=option]");
  if (popup && option) {
    const shown = popup.querySelector("[data-popup-trigger] > span");
    shown.textContent = option.textContent;
    shown.removeAttribute("class");
    for (const o of popup.querySelectorAll("[role=option]")) o.setAttribute("aria-selected", String(o === option));
  }
  for (const p of document.querySelectorAll("[data-popup]")) {
    const content = p.querySelector("[data-popup-content]");
    const open = p === popup && trigger !== null && content.classList.contains("hidden");
    content.classList.toggle("hidden", !open);
    p.querySelector("[data-popup-trigger]").setAttribute("aria-expanded", String(open));
  }
});`;
