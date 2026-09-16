let enrolled = [
    { id: 1, code: "CS 301", name: "Introduction to Algorithms", credits: 3 },
    { id: 2, code: "MATH 201", name: "Linear Algebra", credits: 4 },
    { id: 3, code: "ECON 201", name: "Microeconomics", credits: 3 },
    { id: 4, code: "PSY 101", name: "Introduction to Psychology", credits: 3 },
    { id: 5, code: "ENG 250", name: "Technical Writing", credits: 2 },
];

let catalog = {
    CS402: { code: "CS 402", name: "Computer Networks", credits: 3 },
    MATH301: { code: "MATH 301", name: "Calculus III", credits: 3 },
    BUS210: { code: "BUS 210", name: "Marketing Principles", credits: 3 },
    PHY101: { code: "PHY 101", name: "Intro to Physics", credits: 3 },
};

let nextId = 6;
let maxCredits = 18;

function avatarText(code) {
    return code.replace(" ", "");
}

function totalCredits() {
    let total = 0;
    for (let c of enrolled) {
        total = total + c.credits;
    }
    return total;
}

function render() {
    let list = document.getElementById("enrolled-list");
    list.innerHTML = "";

    for (let c of enrolled) {
        let item = document.createElement("div");
        item.className = "enrolled-item";
        item.innerHTML =
            '<div class="course-avatar">' +
            avatarText(c.code) +
            "</div>" +
            '<div class="enrolled-info">' +
            "<strong>" +
            c.name +
            "</strong>" +
            "<p>" +
            c.code +
            " &middot; " +
            c.credits +
            " credits</p>" +
            "</div>" +
            '<span class="drop-link" onclick="dropCourse(' +
            c.id +
            ')">Drop</span>';
        list.appendChild(item);
    }

    document.getElementById("enrolled-count").innerHTML = enrolled.length;

    let total = totalCredits();
    let remaining = maxCredits - total;
    document.getElementById("total-credits").innerHTML = total;
    document.getElementById("credit-bar").style.width =
        (total / maxCredits) * 100 + "%";
    document.getElementById("credit-note").innerHTML =
        remaining + " more credits available this semester";
}

function joinCourse() {
    let input = document.getElementById("join-code");
    let code = input.value.toUpperCase().replace(" ", "");
    let msg = document.getElementById("join-msg");

    msg.classList.remove("hide");

    if (code === "") {
        msg.className = "join-msg bad";
        msg.innerHTML = "Please enter a join code.";
        return;
    }

    let course = catalog[code];

    if (!course) {
        msg.className = "join-msg bad";
        msg.innerHTML = "Invalid join code. Please check and try again.";
        return;
    }

    for (let c of enrolled) {
        if (c.code === course.code) {
            msg.className = "join-msg bad";
            msg.innerHTML = "You are already enrolled in " + course.code + ".";
            return;
        }
    }

    if (totalCredits() + course.credits > maxCredits) {
        msg.className = "join-msg bad";
        msg.innerHTML = "Not enough credits left to join " + course.code + ".";
        return;
    }

    enrolled.push({
        id: nextId,
        code: course.code,
        name: course.name,
        credits: course.credits,
    });
    nextId++;
    input.value = "";

    msg.className = "join-msg good";
    msg.innerHTML = "You joined " + course.name + ".";
    render();
}

function dropCourse(id) {
    enrolled = enrolled.filter(function (c) {
        return c.id !== id;
    });
    render();
}

render();
