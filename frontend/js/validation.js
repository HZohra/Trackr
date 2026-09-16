// frontend/js/validation.js
// Shared validation + field-error helpers used by every auth page.
// Lives at js/ root alongside gpa.js, api.js, etc.

/** Basic email shape check. Not RFC-perfect, but right for form UX. */
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());

/** Password rules — single source of truth (checklist + submit both use this). */
export const passwordRules = {
  length:    (v) => v.length >= 8,
  uppercase: (v) => /[A-Z]/.test(v),
  number:    (v) => /[0-9]/.test(v),
  special:   (v) => /[^A-Za-z0-9]/.test(v),
};

export const isStrongPassword = (v) =>
  Object.values(passwordRules).every((test) => test(v));

/** Show an error on a field: red border, aria-invalid, message in its slot. */
export function setFieldError(input, message) {
  if (!input) return;
  input.setAttribute("aria-invalid", "true");
  const field = input.closest(".field");
  if (field) {
    field.classList.add("has-error");
    const slot = field.querySelector("[data-error-for]");
    if (slot) slot.textContent = message;
  }
}

/** Clear a field's error state. */
export function clearFieldError(input) {
  if (!input) return;
  input.setAttribute("aria-invalid", "false");
  const field = input.closest(".field");
  if (field) {
    field.classList.remove("has-error");
    const slot = field.querySelector("[data-error-for]");
    if (slot) slot.textContent = "";
  }
}