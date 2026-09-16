import { getActivities, getCourses } from "./api.js";
import { requireAuth } from "./auth.js";

let reminders = [];
let nextId = 1;

function priorityForDate(iso) {
    if (!iso) return "low";
    let due = new Date(iso);
    let now = new Date();
    let days = (due - now) / 86400000;
    if (days <= 2) return "high";
    if (days <= 7) return "medium";
    return "low";
}

function renderReminders() {
    let list = document.getElementById("reminder-list");
    list.innerHTML = "";

    if (reminders.length === 0) {
        list.innerHTML = '<p class="subtext">No upcoming reminders.</p>';
        return;
    }

    for (let r of reminders) {
        let card = document.createElement("div");
        card.className = "reminder-card";
        card.innerHTML =
            '<span class="reminder-bell">🔔</span>' +
            '<div class="reminder-info">' +
                '<strong>' + r.title + '</strong>' +
                '<span class="priority ' + r.priority + '">' + r.priority + '</span>' +
                '<p>' + r.type + '</p>' +
            '</div>' +
            '<div class="reminder-actions">' +
                '<a onclick="editReminder(' + r.id + ')">Edit</a>' +
                '<a onclick="deleteReminder(' + r.id + ')">Delete</a>' +
            '</div>';
        list.appendChild(card);
    }
}

function showForm() {
    document.getElementById("create-form").classList.remove("hide");
    document.getElementById("create-btn").classList.add("hide");
}

function hideForm() {
    document.getElementById("create-form").classList.add("hide");
    document.getElementById("create-btn").classList.remove("hide");
    document.getElementById("new-title").value = "";
}

function addReminder() {
    let title = document.getElementById("new-title").value;
    let type = document.getElementById("new-type").value;
    let priority = document.getElementById("new-priority").value;

    if (title === "") {
        alert("Please enter a reminder title.");
        return;
    }

    reminders.push({ id: nextId, title: title, type: type, priority: priority });
    nextId++;

    hideForm();
    renderReminders();
}

function deleteReminder(id) {
    reminders = reminders.filter(function (r) {
        return r.id !== id;
    });
    renderReminders();
}

function editReminder(id) {
    let r = reminders.find(function (x) {
        return x.id === id;
    });

    let newTitle = prompt("Edit reminder title:", r.title);
    if (newTitle !== null && newTitle !== "") {
        r.title = newTitle;
        renderReminders();
    }
}

async function init() {
    if (!requireAuth()) return;
    try {
        let [activities, courses] = await Promise.all([getActivities(), getCourses()]);
        let codeById = {};
        for (let c of courses) codeById[c.id] = c.code;

        let now = new Date();
        let upcoming = activities.filter(function (a) {
            return a.status !== "graded" && a.dueDate && new Date(a.dueDate) >= now;
        });
        upcoming.sort(function (a, b) {
            return new Date(a.dueDate) - new Date(b.dueDate);
        });

        reminders = upcoming.slice(0, 8).map(function (a) {
            let code = codeById[a.courseId] || "";
            return {
                id: nextId++,
                title: (code ? code + " - " : "") + a.name,
                type: a.category,
                priority: priorityForDate(a.dueDate)
            };
        });
    } catch (e) {
        document.getElementById("reminder-list").innerHTML =
            '<p class="subtext">Couldn\'t load your reminders. Please refresh.</p>';
        return;
    }
    renderReminders();
}

window.showForm = showForm;
window.hideForm = hideForm;
window.addReminder = addReminder;
window.deleteReminder = deleteReminder;
window.editReminder = editReminder;

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
