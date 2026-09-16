import { getProfile, updateProfile } from "./api.js";
import { requireAuth } from "./auth.js";

let loaded = null;

// The <option> values below are the only ones the dropdown offers. Anything else
// in the DB (the syllabus importer can write arbitrary days) would leave the
// select blank, so fall back to the column default instead.
let reminderDayOptions = ["1", "2", "3", "7"];

function fillForm(p) {
    document.getElementById("full-name").value = (p.firstName + " " + p.lastName).trim();
    document.getElementById("email").value = p.email;
    document.getElementById("gpa-scale").value = String(p.gpaScale === 12 ? 12 : 4);

    let days = String(p.reminderDays);
    document.getElementById("reminder-time").value =
        reminderDayOptions.indexOf(days) === -1 ? "3" : days;

    // Option values are lowercase to match the DB enum ('email','whatsapp').
    document.getElementById("reminder-method").value =
        p.reminderMethod === "whatsapp" ? "whatsapp" : "email";
}

async function saveProfile() {
    let name = document.getElementById("full-name").value.trim();
    let msg = document.getElementById("profile-msg");

    msg.classList.remove("hide");

    if (name === "") {
        msg.className = "result-box bad";
        msg.innerHTML = "Full name cannot be empty.";
        return;
    }

    let parts = name.split(" ");
    let firstName = parts.shift();
    let lastName = parts.join(" ");

    let scale = Number(document.getElementById("gpa-scale").value);
    let method = document.getElementById("reminder-method").value;
    let days = Number(document.getElementById("reminder-time").value);

    let patch = {
        first_name: firstName,
        last_name: lastName,
        // No longer editable on this page, but the UPDATE writes all seven
        // columns — resend what's stored so the save doesn't null it out.
        institution: loaded ? loaded.institution : null,
        theme_mode: document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light",
        preferred_gpa_scale: scale,
        default_reminder_days: days,
        default_reminder_method: method
    };

    msg.className = "result-box";
    msg.innerHTML = "Saving...";

    try {
        await updateProfile(patch);
        const storage = localStorage.getItem("trackr-user") ? localStorage : sessionStorage;
        let stored = {};
        try { stored = JSON.parse(storage.getItem("trackr-user")) || {}; } catch { /* ignore invalid old data */ }
        stored = { ...stored, ...patch };
        storage.setItem("trackr-user", JSON.stringify(stored));
        document.body.dispatchEvent(new CustomEvent("profile:updated", { detail: stored }));

        // Keep the snapshot Reset restores from in step with what was just saved.
        loaded = {
            ...loaded,
            firstName: firstName,
            lastName: lastName,
            institution: patch.institution,
            themeMode: patch.theme_mode,
            gpaScale: patch.preferred_gpa_scale,
            reminderDays: patch.default_reminder_days,
            reminderMethod: patch.default_reminder_method
        };
        msg.className = "result-box good";
        msg.innerHTML = "Your changes have been saved.";
    } catch (e) {
        msg.className = "result-box bad";
        msg.innerHTML = "Could not save your changes. Please try again.";
    }
}

function resetProfile() {
    if (loaded) fillForm(loaded);
    document.getElementById("profile-msg").classList.add("hide");
}

function setTheme(mode) {
    document.documentElement.setAttribute("data-theme", mode);
    try {
        localStorage.setItem("trackr-theme", mode);
    } catch (e) {}

    if (mode === "dark") {
        document.getElementById("dark-btn").classList.add("active");
        document.getElementById("light-btn").classList.remove("active");
    } else {
        document.getElementById("light-btn").classList.add("active");
        document.getElementById("dark-btn").classList.remove("active");
    }
}

function logout() {
    localStorage.removeItem("trackr-token");
    sessionStorage.removeItem("trackr-token");
    localStorage.removeItem("trackr-user");
    sessionStorage.removeItem("trackr-user");
    window.location.replace("login.html");
}

async function deleteAccount() {
    const ok = confirm(
        "Are you sure you want to permanently delete your account? This cannot be undone."
    );

    if (!ok) return;

    const secondCheck = confirm(
        "Final confirmation: your account, courses, and assignments may be permanently removed. Continue?"
    );

    if (!secondCheck) return;

    try {
        await deleteAccountApi();

        localStorage.removeItem("trackr-token");
        sessionStorage.removeItem("trackr-token");
        localStorage.removeItem("trackr-user");
        sessionStorage.removeItem("trackr-user");

        alert("Your account was deleted successfully.");
        window.location.replace("login.html");
    } catch (error) {
        console.error("Delete account failed:", error);
        alert(error.message || "Could not delete your account. Please try again.");
    }
}

async function init() {
    if (!requireAuth()) return;
    try {
        loaded = await getProfile();
        fillForm(loaded);
        let current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
        setTheme(current);
    } catch (e) {
        let msg = document.getElementById("profile-msg");
        msg.classList.remove("hide");
        msg.className = "result-box bad";
        msg.innerHTML = "Couldn't load your profile. Please refresh.";
    }
}

window.saveProfile = saveProfile;
window.resetProfile = resetProfile;
window.setTheme = setTheme;
window.logout = logout;
window.deleteAccount = deleteAccount;

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
