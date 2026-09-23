// backend/src/utils/passwordPolicy.js
// Single source of truth for the password rules. Imported by register, reset,
// and change-password so the policy can never drift between them.

// Accepted special characters. Change this one string to change the policy
// everywhere on the backend — and keep it in sync with the frontend copy in
// frontend-angular/src/app/core/password-policy.ts.
export const PASSWORD_SPECIAL_CHARS = "!@#$%^&*()_+-=[]{};:,.?";

const hasSpecial = (v) => [...v].some((c) => PASSWORD_SPECIAL_CHARS.includes(c));

// Each rule mirrors one requirement shown to the user as they type.
const rules = [
    (v) => v.length >= 8,        // at least 8 characters
    (v) => /^[A-Z]/.test(v),     // starts with an uppercase letter
    (v) => /[a-z]/.test(v),      // has a lowercase letter
    (v) => /[0-9]/.test(v),      // has a number
    hasSpecial,                  // has a special character
];

export const PASSWORD_POLICY_MESSAGE =
    "Password must be at least 8 characters, start with an uppercase letter, and include a lowercase letter, a number, and a special character.";

export const isStrongPassword = (value) => {
    const v = String(value ?? "");
    return rules.every((r) => r(v));
};