/* Tiny auth helper. Login (js/pages/login.js) stores the JWT under
   "trackr-token" and the user under "trackr-user", in localStorage when
   "remember me" is checked, otherwise sessionStorage. Everything that talks to
   the protected /user/* API reads the token through here. */

export const API_BASE = "http://localhost:5000";

export function getToken() {
    return (
        localStorage.getItem("trackr-token") ||
        sessionStorage.getItem("trackr-token") ||
        null
    );
}

export function getUser() {
    const raw =
        localStorage.getItem("trackr-user") ||
        sessionStorage.getItem("trackr-user");
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

// Authorization header for fetch(). Spread into a headers object.
export function authHeaders() {
    const token = getToken();
    return token ? { Authorization: "Bearer " + token } : {};
}

// Guard a protected page: bounce to login if there's no token.
// Returns true when authenticated (so callers can early-return on false).
export function requireAuth() {
    if (!getToken()) {
        window.location.href = "login.html";
        return false;
    }
    return true;
}
