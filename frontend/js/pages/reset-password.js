// frontend/js/pages/reset-password.js
import { initPasswordChecklist } from "../components/passwordChecklist.js";
import {
    clearFieldError,
    isStrongPassword,
    setFieldError,
} from "../validation.js";

const form = document.querySelector(".auth-form");
const password = document.getElementById("new-password");
const confirm = document.getElementById("confirm-password");
const panel = document.querySelector(".password-rules");

initPasswordChecklist({ password, confirm, panel });

password.addEventListener("input", () => clearFieldError(password));

form.addEventListener("submit", (e) => {
    e.preventDefault();
    let firstBad = null;
    const fail = (el, msg) => {
        setFieldError(el, msg);
        firstBad = firstBad || el;
    };

    if (!password.value) fail(password, "Password is required.");
    else if (!isStrongPassword(password.value)) {
        fail(password, "Password doesn't meet the requirements below.");
        panel.classList.add("show");
    }

    if (!confirm.value) fail(confirm, "Please confirm your password.");
    else if (confirm.value !== password.value)
        fail(confirm, "Passwords don't match.");

    if (firstBad) {
        firstBad.focus();
        return;
    }

    // valid — no backend yet, so send them back to sign in
    window.location.href = "login.html";
});

const show = document.getElementById("showPassword");

show.addEventListener("change", function () {
    if (this.checked) {
        password.type = "text";
        confirm.type = "text";
    } else {
        password.type = "password";
        confirm.type = "password";
    }
});
