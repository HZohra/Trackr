import { AbstractControl, ValidationErrors } from '@angular/forms';

// Keep this in sync with the backend copy (backend/src/utils/passwordPolicy.js).
export const PASSWORD_SPECIAL_CHARS = "!@#$%^&*()_+-=[]{};:,.?";

export interface PasswordRule {
  key: string;
  label: string;
  test: (v: string) => boolean;
}

export const passwordRequirements: PasswordRule[] = [
  { key: 'length', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { key: 'upperStart', label: 'Starts with an uppercase letter', test: (v) => /^[A-Z]/.test(v) },
  { key: 'lower', label: 'Has a lowercase letter', test: (v) => /[a-z]/.test(v) },
  { key: 'number', label: 'Has a number', test: (v) => /[0-9]/.test(v) },
  { key: 'special', label: 'Has a special character', test: (v) => [...v].some((c) => PASSWORD_SPECIAL_CHARS.includes(c)) },
];

export function isStrongPassword(value: string): boolean {
  const v = String(value ?? '');
  return passwordRequirements.every((r) => r.test(v));
}

export function strongPasswordValidator(control: AbstractControl): ValidationErrors | null {
  return isStrongPassword(String(control.value ?? '')) ? null : { weak: true };
}