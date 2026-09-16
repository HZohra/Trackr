/* Upload Syllabus — Steps 1–3.
   1) pick a PDF  2) enter term + start/end dates  3) POST to the AI extractor,
   then hand the result to the review page via sessionStorage. */

import { API_BASE, authHeaders, requireAuth } from "./auth.js";
import { setFieldError, clearFieldError } from "./validation.js";

if (requireAuth()) {
  const MAX_BYTES = 20 * 1024 * 1024;

  const pdfFile = document.getElementById("pdfFile");
  const fileMessage = document.getElementById("fileMessage");
  const detailsSection = document.getElementById("detailsSection");
  const loadingSection = document.getElementById("loadingSection");
  const extractBtn = document.getElementById("extractBtn");
  const formError = document.getElementById("formError");

  const season = document.getElementById("term-season");
  const startInput = document.getElementById("term-start");
  const endInput = document.getElementById("term-end");

  const stepUpload = document.getElementById("stepUpload");
  const stepDetails = document.getElementById("stepDetails");
  const stepExtract = document.getElementById("stepExtract");

  const clearFormError = () => (formError.textContent = "");

  // Enable "Extract" only when a file + all three term fields are present.
  function updateExtractEnabled() {
    const ready =
      pdfFile.files.length > 0 &&
      season.value &&
      startInput.value &&
      endInput.value;
    extractBtn.disabled = !ready;
  }

  pdfFile.addEventListener("change", function () {
    clearFormError();
    if (pdfFile.files.length === 0) return;

    const file = pdfFile.files[0];
    if (file.type !== "application/pdf") {
      fileMessage.textContent = "Please choose a PDF file.";
      pdfFile.value = "";
      detailsSection.classList.add("hide");
      updateExtractEnabled();
      return;
    }
    if (file.size > MAX_BYTES) {
      fileMessage.textContent = "That file is larger than 20 MB.";
      pdfFile.value = "";
      detailsSection.classList.add("hide");
      updateExtractEnabled();
      return;
    }

    fileMessage.textContent = "Selected file: " + file.name;
    detailsSection.classList.remove("hide");
    stepUpload.className = "done-step";
    stepDetails.className = "active-step";
    updateExtractEnabled();
  });

  [season, startInput, endInput].forEach((el) => {
    el.addEventListener("input", function () {
      clearFieldError(el);
      clearFormError();
      updateExtractEnabled();
    });
  });

  function validate() {
    let ok = true;
    if (!season.value) {
      setFieldError(season, "Select a term.");
      ok = false;
    }
    if (!startInput.value) {
      setFieldError(startInput, "Enter the term start date.");
      ok = false;
    }
    if (!endInput.value) {
      setFieldError(endInput, "Enter the term end date.");
      ok = false;
    }
    if (startInput.value && endInput.value && endInput.value <= startInput.value) {
      setFieldError(endInput, "End date must be after the start date.");
      ok = false;
    }
    return ok;
  }

  extractBtn.addEventListener("click", async function () {
    clearFormError();
    if (pdfFile.files.length === 0) {
      fileMessage.textContent = "Please choose a PDF file first.";
      return;
    }
    if (!validate()) return;

    // term string = "<Season> <year-from-start-date>", e.g. "Summer 2026".
    const term = season.value + " " + startInput.value.slice(0, 4);

    const body = new FormData();
    body.append("file", pdfFile.files[0]);
    body.append("term", term);
    body.append("term_start", startInput.value);
    body.append("term_end", endInput.value);

    // Enter loading state.
    detailsSection.classList.add("hide");
    loadingSection.classList.remove("hide");
    stepDetails.className = "done-step";
    stepExtract.className = "active-step";
    extractBtn.disabled = true;
    extractBtn.textContent = "Extracting…";

    try {
      // Do not set Content-Type — the browser adds the multipart boundary.
      const res = await fetch(API_BASE + "/user/upload-syllabus", {
        method: "POST",
        headers: authHeaders(),
        body,
      });

      if (!res.ok) {
        let message = "Extraction failed. Please try again.";
        try {
          const data = await res.json();
          if (data && data.message) message = data.message;
        } catch (_) {}
        throw new Error(message);
      }

      const data = await res.json();
      sessionStorage.setItem(
        "trackr-extraction",
        JSON.stringify({ ...data, term, term_start: startInput.value, term_end: endInput.value }),
      );
      window.location.href = "extraction-review.html";
    } catch (err) {
      loadingSection.classList.add("hide");
      detailsSection.classList.remove("hide");
      stepExtract.className = "";
      stepDetails.className = "active-step";
      extractBtn.disabled = false;
      extractBtn.textContent = "Extract with AI";
      formError.textContent =
        err.message === "Failed to fetch"
          ? "Could not reach the server. Is the backend running on port 5000?"
          : err.message;
    }
  });
}
