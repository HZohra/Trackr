// frontend/js/components/passwordChecklist.js
// Reveals the requirements panel once the user types, ticks each rule green,
// shows a live "Passwords don't match" error on the confirm field, and hides
// the panel once everything is valid AND matching. Reusable by signup/reset.

import { passwordRules as RULES, setFieldError, clearFieldError } from "../validation.js";

/**
 * @param {Object} opts
 * @param {HTMLInputElement} opts.password
 * @param {HTMLInputElement} [opts.confirm]
 * @param {HTMLElement} opts.panel  the .password-rules element
 * @returns {() => boolean} call to test validity (all rules met + match)
 */
export function initPasswordChecklist({ password, confirm, panel }) {
  if (!password || !panel) return () => false;
  const items = panel.querySelectorAll(".rule");

  const evaluate = () => {
    const value = password.value;
    let allMet = true;
    items.forEach((li) => {
      const test = RULES[li.dataset.rule];
      const ok = test ? test(value) : false;
      li.classList.toggle("met", ok);
      if (!ok) allMet = false;
    });

    const matches = confirm ? confirm.value === value : true;
    if (confirm) {
      // only complain once the user has typed something into confirm
      if (confirm.value.length > 0 && !matches) {
        setFieldError(confirm, "Passwords don't match.");
      } else {
        clearFieldError(confirm);
      }
    }

    const started = value.length > 0;
    panel.classList.toggle("show", started && !(allMet && matches));
    return allMet && matches;
  };

  password.addEventListener("focus", evaluate);
  password.addEventListener("input", evaluate);
  if (confirm) confirm.addEventListener("input", evaluate);

  return evaluate;
}