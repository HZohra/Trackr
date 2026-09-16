import { clearFieldError, isEmail, setFieldError } from "../validation.js";

const API_URL = "http://localhost:5000";
const form = document.querySelector(".auth-form");
const email = document.getElementById("email");
const password = document.getElementById("password");
const remember = document.getElementById("remember");
const submitButton = form.querySelector('button[type="submit"]');

const show = document.getElementById("showPassword");
show.addEventListener("change", function () {
    if (this.checked) {
        password.type = "text";
    } else {
        password.type = "password";
    }
});

email.addEventListener("input", function () {
    clearFieldError(email);
});

password.addEventListener("input", function () {
    clearFieldError(password);
});

form.addEventListener("submit", async function (event) {
    event.preventDefault();

    let firstBadField = null;

    function showError(input, message) {
        setFieldError(input, message);

        if (firstBadField === null) {
            firstBadField = input;
        }
    }

    if (email.value.trim() === "") {
        showError(email, "Email is required.");
    } else if (!isEmail(email.value.trim())) {
        showError(email, "Enter a valid email address.");
    }

    if (password.value === "") {
        showError(password, "Password is required.");
    }

    if (firstBadField !== null) {
        firstBadField.focus();
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Signing in...";

    try {
        const response = await fetch(API_URL + "/auth/login", {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
            },

            body: JSON.stringify({
                email: email.value.trim(),
                password: password.value,
            }),
        });

        const data = await response.json();

        if (response.ok === false) {
            throw new Error(data.message || "Login failed.");
        }

        if (remember.checked) {
            localStorage.setItem("trackr-token", data.token);

            localStorage.setItem("trackr-user", JSON.stringify(data.user));
        } else {
            sessionStorage.setItem("trackr-token", data.token);

            sessionStorage.setItem("trackr-user", JSON.stringify(data.user));
        }

        if (data.user.role === "admin") {
            window.location.href = "admin-dashboard.html";
        } else {
            window.location.href = "dashboard.html";
        }
    } catch (error) {
        setFieldError(password, error.message);
        password.focus();
    }

    submitButton.disabled = false;
    submitButton.textContent = "Log in";
});

const oauthError = document.querySelector('[data-error-for="oauth"]');
document.addEventListener("input", () => {
    oauthError.textContent = "";
});

const clientId = document.getElementById("google-config").dataset.clientId;
const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: "openid email profile",
    callback: handleCredentialResponse,
});

const googleButton = document.querySelector('[data-action="google-login"]');
googleButton.addEventListener("click", function () {
    tokenClient.requestAccessToken({
        prompt: "consent",
    });
});

async function handleCredentialResponse(response) {
    const idToken = response.access_token;
    try {
        // throw new Error("Google login. is not available. yet.");
        const response = await fetch(API_URL + "/auth/login/oauth", {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
            },

            body: JSON.stringify({
                access_token: idToken,
            }),
        });

        const data = await response.json();

        if (response.ok === false) {
            throw new Error(data.message || "Google login failed.");
        }

        if (remember.checked) {
            localStorage.setItem("trackr-token", data.token);

            localStorage.setItem("trackr-user", JSON.stringify(data.user));
        } else {
            sessionStorage.setItem("trackr-token", data.token);

            sessionStorage.setItem("trackr-user", JSON.stringify(data.user));
        }

        if (data.user.role === "admin") {
            window.location.href = "admin-dashboard.html";
        } else {
            window.location.href = "dashboard.html";
        }
    } catch (error) {
        oauthError.textContent = error.message;
    }
}


