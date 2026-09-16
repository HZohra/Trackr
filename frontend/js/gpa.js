import { getCurrentUser, getCourses, getSemester } from "./api.js";
import { computeGpa } from "./adapters.js";
import { requireAuth } from "./auth.js";

let courses = [];
let currentTerm = null;

function fmt(v) {
    return v == null ? "—" : v.toFixed(2);
}

function applyScale(scale) {
    let { termGpa, cumulativeGpa } = computeGpa(courses, { currentTerm: currentTerm, scale: scale });
    document.getElementById("current-gpa").innerHTML = fmt(termGpa);
    document.getElementById("projected-gpa").innerHTML = fmt(termGpa);
    document.getElementById("cumulative-gpa").innerHTML = fmt(cumulativeGpa);
}

function changeScale() {
    let scale = Number(document.getElementById("scale-select").value);
    applyScale(scale);
}

function renderBreakdown() {
    let list = document.getElementById("breakdown-list");
    list.innerHTML = "";

    let graded = courses.filter(function (c) {
        return c.currentGrade != null;
    });

    if (graded.length === 0) {
        list.innerHTML = '<p class="subtext">No grades recorded yet.</p>';
        return;
    }

    for (let c of graded) {
        let row = document.createElement("div");
        row.className = "breakdown-row";
        row.innerHTML =
            '<div>' +
                '<strong>' + c.code + '</strong>' +
                '<p>' + c.name + '</p>' +
            '</div>' +
            '<strong>' + c.currentGrade + '%</strong>';
        list.appendChild(row);
    }
}

function calculateNeeded() {
    let current = Number(document.getElementById("current-score").value);
    let done = Number(document.getElementById("completed-weight").value);
    let target = Number(document.getElementById("target-grade").value);
    let result = document.getElementById("result");

    result.classList.remove("hide");

    if (done < 0 || done > 100 || current < 0 || target < 0) {
        result.className = "result-box bad";
        result.innerHTML = "Please enter valid numbers (0-100).";
        return;
    }

    let remaining = 100 - done;

    if (remaining === 0) {
        result.className = "result-box";
        result.innerHTML = "All work is done. Your final grade is " + current + "%.";
        return;
    }

    let pointsSoFar = current * (done / 100);
    let needed = (target - pointsSoFar) / (remaining / 100);
    needed = Math.round(needed * 10) / 10;

    if (needed > 100) {
        result.className = "result-box bad";
        result.innerHTML = "You would need " + needed + "% on the remaining " + remaining + "% of work. That is not reachable.";
    } else if (needed < 0) {
        result.className = "result-box good";
        result.innerHTML = "You have already reached your target. Even a 0% on the rest keeps you above " + target + "%.";
    } else {
        result.className = "result-box good";
        result.innerHTML = "You need " + needed + "% on the remaining " + remaining + "% of work to hit " + target + "%.";
    }
}

async function init() {
    if (!requireAuth()) return;
    try {
        let [user, allCourses, semester] = await Promise.all([
            getCurrentUser(), getCourses(), getSemester()
        ]);
        courses = allCourses;
        currentTerm = semester.term;

        let select = document.getElementById("scale-select");
        select.value = String(user.gpaScale === 12 ? 12 : 4);

        applyScale(user.gpaScale);
        renderBreakdown();
    } catch (e) {
        document.getElementById("current-gpa").innerHTML = "—";
        document.getElementById("cumulative-gpa").innerHTML = "—";
        document.getElementById("breakdown-list").innerHTML = '<p class="subtext">Couldn\'t load your grades. Please refresh.</p>';
    }
}

window.changeScale = changeScale;
window.calculateNeeded = calculateNeeded;

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
