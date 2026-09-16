// frontend/js/pages/forgot-password.js
import { isEmail, setFieldError, clearFieldError } from "../validation.js";

const form  = document.querySelector(".auth-form");
const email = document.getElementById("email");

email.addEventListener("input", () => clearFieldError(email));

form.addEventListener("submit", (e) => {
  e.preventDefault();

  if (!email.value.trim())   return setFieldError(email, "Email is required.");
  if (!isEmail(email.value)) return setFieldError(email, "Enter a valid email address.");

  // valid — no backend yet, so swap the card for an inline confirmation.
  // (textContent, not innerHTML, so a typed-in value can't inject markup)
  const card = form.closest(".auth-card");
  card.replaceChildren();

  const title = document.createElement("h1");
  title.className = "auth-title";
  title.textContent = "Check your email";

  const sub = document.createElement("p");
  sub.className = "auth-subtitle";
  sub.textContent = `If an account exists for ${email.value.trim()}, we've sent a link to reset your password.`;

  const back = document.createElement("a");
  back.className = "btn btn-secondary btn-block";
  back.href = "login.html";
  back.textContent = "Back to sign in";

  card.append(title, sub, back);
});