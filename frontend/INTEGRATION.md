# Authentication — Integration Notes

This section documents what the auth frontend does today (presentational only)
and what the backend team needs to wire up. Merge into the main `INTEGRATION.md`.

## Current state (frontend milestone)

All auth screens are **UI + client-side validation only**. There is no real
authentication, session, token, or email sending. Every "success" currently
routes with `window.location.href`. Client-side validation is for UX — the
**backend must re-validate everything**.

Pages: `login.html`, `signup.html`, `forgot-password.html`, `reset-password.html`.
Shared logic: `js/validation.js`, `js/components/passwordChecklist.js`.

## Endpoints to wire up

Each page's submit handler should be swapped from a `window.location` redirect
to a call against `js/api.js`. Suggested contract:

| Page / action | Function to add in `api.js` | Request | Response |
|---|---|---|---|
| login.html (submit + Google) | `login(email, password)` / `loginWithGoogle()` | `{ email, password }` | `{ user, token }` — `user.role` decides redirect |
| signup.html (submit + Google) | `register(email, password, role)` / `registerWithGoogle(role)` | `{ email, password, role }` | `{ user, token }` or `409` on duplicate |
| forgot-password.html | `requestPasswordReset(email)` | `{ email }` | `200` always (don't reveal if email exists) |
| reset-password.html | `resetPassword(token, newPassword)` | `{ token, newPassword }` | `200` / `400` on bad/expired token |

Token from the reset email should arrive as a URL param (e.g.
`reset-password.html?token=...`); `reset-password.js` reads it and passes it on.

## Stubs the backend must replace

1. **Role-based routing on login.** `login.js` currently always routes to
   `dashboard.html` because the role isn't known without a backend. Once
   `login()` returns `user.role`, route `admin` -> `admin-dashboard.html`,
   `student` -> `dashboard.html`. (Signup already routes by the selected role.)

2. **Duplicate email.** US-01 requires "duplicate email accounts are not
   allowed." This cannot be enforced on the frontend. `register()` should return
   409 on a taken email; `signup.js` then shows the error on the email field via
   the existing `setFieldError(email, "...")` hook.

3. **Password strength.** The rules in `js/validation.js` (`passwordRules`) are
   enforced client-side for UX. Re-enforce them server-side on register/reset.

4. **"Remember me"** (login) is collected but unused — wire to session/token
   duration on the backend.

5. **Google SSO buttons** (`[data-action="google-login"]`,
   `[data-action="google-signup"]`) currently just redirect. Replace with the
   real OAuth flow. The signup button must still capture the selected role.

## Deviation from Milestone 1

The **email-verification ("Check your inbox") screen was removed.** Verification
is entirely a backend concern (issuing and confirming a token), so a static
frontend page added no functional value. Signup routes directly to the role's
dashboard. If server-side email verification is added later, insert the verify
step between `register()` success and the dashboard redirect — no other auth
screens are affected.