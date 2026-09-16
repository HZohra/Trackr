import { getActivities, getCourses } from "./api.js";
import { requireAuth } from "./auth.js";

let events = [];

let monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

let today = new Date();
let viewYear = today.getFullYear();
let viewMonth = today.getMonth();
let currentView = "month";

let typeMap = { Assignment: "assignment", Project: "assignment", Quiz: "exam", Exam: "exam" };

function activeTypes() {
    let types = [];
    if (document.getElementById("f-assignment").checked) types.push("assignment");
    if (document.getElementById("f-exam").checked) types.push("exam");
    if (document.getElementById("f-lab").checked) types.push("lab");
    if (document.getElementById("f-reminder").checked) types.push("reminder");
    return types;
}

function visibleEvents() {
    let types = activeTypes();
    return events.filter(function (e) {
        return e.date !== "" && types.indexOf(e.type) !== -1;
    });
}

function eventsOnDay(y, m, d) {
    let target = y + "-" + pad(m + 1) + "-" + pad(d);
    return visibleEvents().filter(function (e) {
        return e.date === target;
    });
}

function pad(n) {
    return n < 10 ? "0" + n : "" + n;
}

function setView(v) {
    currentView = v;
    if (v === "month") {
        document.getElementById("month-view").classList.remove("hide");
        document.getElementById("week-view").classList.add("hide");
        document.getElementById("month-btn").classList.add("active");
        document.getElementById("week-btn").classList.remove("active");
    } else {
        document.getElementById("month-view").classList.add("hide");
        document.getElementById("week-view").classList.remove("hide");
        document.getElementById("week-btn").classList.add("active");
        document.getElementById("month-btn").classList.remove("active");
    }
    render();
}

function prevMonth() {
    viewMonth--;
    if (viewMonth < 0) {
        viewMonth = 11;
        viewYear--;
    }
    render();
}

function nextMonth() {
    viewMonth++;
    if (viewMonth > 11) {
        viewMonth = 0;
        viewYear++;
    }
    render();
}

function renderMonthLabel() {
    document.getElementById("month-label").innerHTML = monthNames[viewMonth] + " " + viewYear;
}

function renderGrid() {
    let grid = document.getElementById("cal-grid");
    grid.innerHTML = "";

    let firstDay = new Date(viewYear, viewMonth, 1).getDay();
    let daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        let blank = document.createElement("div");
        blank.className = "cal-cell empty";
        grid.appendChild(blank);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        let cell = document.createElement("div");
        cell.className = "cal-cell";

        if (viewYear === today.getFullYear() && viewMonth === today.getMonth() && d === today.getDate()) {
            cell.className = "cal-cell today";
        }

        let html = '<div class="day-num">' + d + '</div>';
        let dayEvents = eventsOnDay(viewYear, viewMonth, d);
        for (let e of dayEvents) {
            html = html + '<div class="event-pill"><i class="dot ' + e.type + '"></i>' + e.title + '</div>';
        }
        cell.innerHTML = html;
        grid.appendChild(cell);
    }
}

function renderUpcoming() {
    let list = document.getElementById("upcoming-list");
    list.innerHTML = "";

    let upcoming = visibleEvents().filter(function (e) {
        return e.date >= isoToday();
    });
    upcoming.sort(function (a, b) {
        return a.date < b.date ? -1 : 1;
    });

    if (upcoming.length === 0) {
        list.innerHTML = '<p class="subtext">Nothing upcoming.</p>';
        return;
    }

    for (let e of upcoming.slice(0, 5)) {
        let item = document.createElement("div");
        item.className = "upcoming-item";
        item.innerHTML =
            '<i class="dot ' + e.type + '"></i>' +
            '<p>' + e.title + '</p>' +
            '<small>' + niceDate(e.date) + '</small>';
        list.appendChild(item);
    }
}

function renderWeekGlance() {
    let glance = document.getElementById("week-glance");
    glance.innerHTML = "";

    let monday = startOfWeek();
    let labels = ["Mon", "Tue", "Wed", "Thu", "Fri"];

    for (let i = 0; i < 5; i++) {
        let day = new Date(monday);
        day.setDate(monday.getDate() + i);
        let count = eventsOnDay(day.getFullYear(), day.getMonth(), day.getDate()).length;

        let row = document.createElement("div");
        row.className = "glance-row";
        let text = count === 0 ? "No event" : count + " event" + (count > 1 ? "s" : "");
        row.innerHTML =
            '<strong>' + labels[i] + ' ' + day.getDate() + '</strong>' +
            '<small>' + text + '</small>';
        glance.appendChild(row);
    }
}

function renderWeekView() {
    let list = document.getElementById("week-list");
    list.innerHTML = "";

    for (let i = 0; i < 7; i++) {
        let day = new Date(today);
        day.setDate(today.getDate() + i);
        let dayEvents = eventsOnDay(day.getFullYear(), day.getMonth(), day.getDate());

        let block = document.createElement("div");
        block.className = "week-day-block";
        let html = '<strong>' + dayLabel(day) + '</strong>';

        if (dayEvents.length === 0) {
            html = html + '<p class="subtext">No tasks.</p>';
        } else {
            for (let e of dayEvents) {
                html = html + '<div class="event-pill"><i class="dot ' + e.type + '"></i>' + e.title + '</div>';
            }
        }
        block.innerHTML = html;
        list.appendChild(block);
    }
}

function renderWarning() {
    let box = document.getElementById("warning-box");
    let missing = events.filter(function (e) {
        return e.date === "";
    });

    if (missing.length === 0) {
        box.classList.add("hide");
        return;
    }

    box.classList.remove("hide");
    box.innerHTML = "Warning: " + missing.length + " item" + (missing.length > 1 ? "s are" : " is") + " missing a due date.";
}

function render() {
    renderMonthLabel();
    if (currentView === "month") {
        renderGrid();
    } else {
        renderWeekView();
    }
    renderUpcoming();
    renderWeekGlance();
    renderWarning();
}

function isoToday() {
    return today.getFullYear() + "-" + pad(today.getMonth() + 1) + "-" + pad(today.getDate());
}

function startOfWeek() {
    let d = new Date(today);
    let day = d.getDay();
    let diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
}

function niceDate(iso) {
    let parts = iso.split("-");
    return monthNames[Number(parts[1]) - 1].slice(0, 3) + " " + Number(parts[2]);
}

function dayLabel(d) {
    let names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return names[d.getDay()] + " " + monthNames[d.getMonth()].slice(0, 3) + " " + d.getDate();
}

async function init() {
    if (!requireAuth()) return;
    try {
        let [activities, courses] = await Promise.all([getActivities(), getCourses()]);
        let codeById = {};
        for (let c of courses) codeById[c.id] = c.code;

        events = activities.map(function (a) {
            let code = codeById[a.courseId] || "";
            return {
                date: a.dueDate ? String(a.dueDate).slice(0, 10) : "",
                title: (code ? code + " - " : "") + a.name,
                type: typeMap[a.category] || "assignment"
            };
        });
    } catch (e) {
        let box = document.getElementById("warning-box");
        box.classList.remove("hide");
        box.innerHTML = "Couldn't load your calendar. Please refresh.";
    }
    render();
}

window.setView = setView;
window.prevMonth = prevMonth;
window.nextMonth = nextMonth;
window.render = render;

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
