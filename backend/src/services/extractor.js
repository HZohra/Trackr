/**
 * Extract structured course + activity data from a syllabus PDF.
 *
 * Two Claude calls are made against the same natively-uploaded PDF: one for
 * course details, one for the graded activities. Each call forces a tool call so
 * Claude returns schema-constrained JSON. Relative due dates ("end of Week 3")
 * are returned as a week number and resolved to concrete datetimes here in JS,
 * using term_start as Week 1 Day 1.
 */

import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-5";
const DEFAULT_DUE_TIME = "23:59:00";

const log = (...args) => console.error(...args); // stderr, never a return value

// --------------------------------------------------------------------------- //
// Tool schemas (NOT the final output shape)                        //
// --------------------------------------------------------------------------- //
const nullableStr = { type: ["string", "null"] };

const COURSE_TOOL = {
    name: "emit_course",
    description: "Return the extracted course details.",
    input_schema: {
        type: "object",
        additionalProperties: false,
        required: [
            "course_code", "course_name", "professor_name", "office_hours",
            "meeting_times", "room", "textbook_link",
        ],
        properties: {
            course_code: { ...nullableStr, description: "Course code, e.g. 'CP476'. Null if absent." },
            course_name: { ...nullableStr, description: "Course title, e.g. 'Internet Computing'. Null if absent." },
            professor_name: { ...nullableStr, description: "Primary instructor's name. Null if absent." },
            office_hours: { ...nullableStr, description: "Office hours as written, e.g. 'Tue 1-3pm'. Null if absent." },
            meeting_times: { ...nullableStr, description: "Lecture/meeting times, e.g. 'Mon/Wed 2:00-4:00pm'. Null if absent." },
            room: { ...nullableStr, description: "Room / location, e.g. 'N1002'. Null if absent." },
            textbook_link: { ...nullableStr, description: "URL to the textbook if one is given, else null." },
        },
    },
};

const ACTIVITIES_TOOL = {
    name: "emit_activities",
    description: "Return every graded activity extracted from the syllabus.",
    input_schema: {
        type: "object",
        additionalProperties: false,
        required: ["activities", "warnings"],
        properties: {
            activities: {
                type: "array",
                items: {
                    type: "object",
                    additionalProperties: false,
                    required: [
                        "activity_category", "activity_name", "grading_weight", "due_date_iso",
                        "due_time", "due_week", "due_week_anchor", "is_tbd",
                    ],
                    properties: {
                        activity_category: {
                            type: "string",
                            enum: ["Assignment", "Quiz", "Exam", "Project"],
                            description: "One of: Assignment, Quiz, Exam, Project. Map labs/participation/other to the closest fit.",
                        },
                        activity_name: { type: "string", description: "Activity name as written, e.g. 'Milestone 01'." },
                        grading_weight: {
                            type: ["number", "null"],
                            description: "Percent of final grade as a number (e.g. 5.0), or null if not stated.",
                        },
                        due_date_iso: {
                            ...nullableStr,
                            description: "Concrete calendar date as 'YYYY-MM-DD' if the syllabus gives one; else null.",
                        },
                        due_time: {
                            ...nullableStr,
                            description: "Time of day as 'HH:MM:SS' if a specific time is stated; else null.",
                        },
                        due_week: {
                            type: ["integer", "null"],
                            description: "Course week number when the due date is week-relative ('end of Week 3' -> 3). Null otherwise.",
                        },
                        due_week_anchor: {
                            type: ["string", "null"],
                            enum: ["start", "end", null],
                            description: "For a week-relative date: 'start' (Day 1) or 'end' (Day 7). Default 'end' when a week is given without a clear day.",
                        },
                        is_tbd: {
                            type: "boolean",
                            description: "True if the due date is explicitly to-be-determined / announced later.",
                        },
                    },
                },
            },
            warnings: {
                type: "array",
                items: { type: "string" },
                description: "Contradictions, weights not summing to 100, unreadable sections.",
            },
        },
    },
};

// --------------------------------------------------------------------------- //
// Prompts                                                                      //
// --------------------------------------------------------------------------- //
const COURSE_PROMPT =
    "Extract the course details from this syllabus: course_code, course_name, " +
    "professor_name, office_hours, meeting_times, room, and textbook_link. " +
    "Use exactly what the document states. Set any field to null if it is not " +
    "present. Do NOT guess or invent values.";

function activityPrompt(numWeeks) {
    const weeksLine = numWeeks
        ? `This term runs for ${numWeeks} weeks (Week 1 through Week ${numWeeks}). ` +
          "Use this to bound recurring items when the syllabus does not state a count.\n"
        : "The term's week count is unknown; only expand recurring items when the " +
          "syllabus itself states how many occurrences there are.\n";
    return (
        "Extract EVERY graded activity (assignments, exams, quizzes, labs, projects, " +
        "participation, etc.) from this syllabus.\n" +
        weeksLine +
        "For each activity:\n" +
        "- Set grading_weight to its percent of the final grade as a number, or null.\n" +
        "- If the syllabus gives a concrete calendar date, put it in due_date_iso as " +
        "'YYYY-MM-DD' (and due_time as 'HH:MM:SS' only if a specific time is stated).\n" +
        "- If the due date is expressed relative to a course week (e.g. 'due end of " +
        "Week 3'), set due_week to that week number and due_week_anchor to 'start' or " +
        "'end', and leave due_date_iso null.\n" +
        "- Set is_tbd true when the date is explicitly to be announced later.\n" +
        "\n" +
        "RECURRING ITEMS: If an activity recurs (it is described as 'weekly', " +
        "'bi-weekly', 'every week', 'each week', etc.), do NOT emit it as a single " +
        "row. Instead split it into ONE separate activity per occurrence:\n" +
        "- Determine the number of occurrences: use the count stated in the syllabus " +
        "if given (e.g. '5@5%' means 5 occurrences; '10 discussion posts' means 10). " +
        "If no count is stated, use the number of weeks in the term (weekly) or half " +
        "that, rounded down (bi-weekly).\n" +
        "- Give each occurrence its own activity_name suffixed with its number, e.g. " +
        "'Weekly Quiz (Week 2)' or 'Discussion Post 3'.\n" +
        "- Set due_week to the course week that occurrence is due and set " +
        "due_week_anchor to 'end' (due on the last day of that week). For weekly items " +
        "assign consecutive weeks; for bi-weekly assign every other week.\n" +
        "- Divide the total grading_weight evenly across the occurrences (e.g. a " +
        "'Weekly Quizzes 25%' block over 5 occurrences becomes five activities of 5.0 " +
        "each). If the total weight is not stated, set grading_weight to null on each.\n" +
        "Do not invent dates that are not supported by the document."
    );
}

// --------------------------------------------------------------------------- //
// Claude calls                                                                 //
// --------------------------------------------------------------------------- //
function pdfBlock(pdfBuffer) {
    const data = Buffer.from(pdfBuffer).toString("base64");
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data } };
}

async function callClaude(client, doc, prompt, tool) {
    const resp = await client.messages.create({
        model: MODEL,
        max_tokens: 8000,
        tools: [tool],
        tool_choice: { type: "tool", name: tool.name },
        messages: [{ role: "user", content: [doc, { type: "text", text: prompt }] }],
    });
    log(`  ${tool.name}: ${resp.usage.input_tokens} in / ${resp.usage.output_tokens} out`);
    const block = resp.content.find((b) => b.type === "tool_use" && b.name === tool.name);
    if (!block) throw new Error(`Claude did not call ${tool.name}`);
    return block.input;
}

// --------------------------------------------------------------------------- //
// Date resolution (term_start is Week 1 Day 1)                                //
// --------------------------------------------------------------------------- //
function parseDate(value) {
    if (!value) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).trim());
    if (!m) return null;
    const [, y, mo, d] = m.map(Number);
    const dt = new Date(Date.UTC(y, mo - 1, d));
    // Reject overflow like 2026-02-31.
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return dt;
}

const addDays = (dt, n) => new Date(dt.getTime() + n * 86400000);

function fmtDue(dt, timeStr) {
    let hh = 23, mm = 59, ss = 0;
    const t = timeStr || DEFAULT_DUE_TIME;
    const parts = String(t).split(":");
    if (parts.length === 3 && parts.every((p) => /^\d+$/.test(p))) {
        [hh, mm, ss] = parts.map(Number);
        if (hh > 23 || mm > 59 || ss > 59) [hh, mm, ss] = [23, 59, 0];
    }
    const p2 = (n) => String(n).padStart(2, "0");
    const day = `${dt.getUTCFullYear()}-${p2(dt.getUTCMonth() + 1)}-${p2(dt.getUTCDate())}`;
    return `${day} ${p2(hh)}:${p2(mm)}:${p2(ss)}`;
}

function resolveDueDate(raw, termStart, termEnd) {
    // 1) Concrete calendar date wins.
    const iso = parseDate(raw.due_date_iso);
    if (iso) return fmtDue(iso, raw.due_time);

    // 2) Week-relative date.
    if (raw.due_week != null && termStart) {
        const anchor = raw.due_week_anchor || "end";
        const dayOffset = anchor === "end" ? 6 : 0;
        let due = addDays(termStart, (raw.due_week - 1) * 7 + dayOffset);
        if (due < termStart) due = termStart;
        if (termEnd && due > termEnd) due = termEnd;
        return fmtDue(due, raw.due_time);
    }

    // 3) TBD, or week-relative with no term_start -> unknown.
    return null;
}

// --------------------------------------------------------------------------- //
// Public entry point                                                          //
// --------------------------------------------------------------------------- //
/**
 * Run the two-call extraction against a syllabus PDF held in memory.
 *
 * @param {Object}  args
 * @param {Buffer}  args.pdfBuffer  Raw PDF bytes (e.g. req.file.buffer).
 * @param {string=} args.term       Human term label (e.g. "Winter 2026"). Not sent
 *                                   to Claude for extraction — collected from the
 *                                   student and injected downstream — but logged.
 * @param {string=} args.term_start Term start as 'YYYY-MM-DD' (Week 1 Day 1).
 * @param {string=} args.term_end   Term end as 'YYYY-MM-DD'.
 * @returns {Promise<{course: Object, activities: Array}>}
 * @throws  If CLAUDE_API is missing, the PDF is empty, or a Claude call fails.
 */
export async function extractSyllabus({ pdfBuffer, term, term_start, term_end } = {}) {
    if (!pdfBuffer || !pdfBuffer.length) {
        throw new Error("extractSyllabus: pdfBuffer is empty");
    }

    const apiKey = process.env.CLAUDE_API;
    if (!apiKey) {
        throw new Error("CLAUDE_API not set in environment");
    }

    const termStart = parseDate(term_start);
    const termEnd = parseDate(term_end);
    const isoOf = (d) => (d ? d.toISOString().slice(0, 10) : null);
    log(`Context: term=${JSON.stringify(term)} term_start=${isoOf(termStart)} term_end=${isoOf(termEnd)}`);

    const client = new Anthropic({ apiKey });
    const doc = pdfBlock(pdfBuffer);

    // Number of weeks in the term (for bounding recurring-item expansion).
    let numWeeks = null;
    if (termStart && termEnd && termEnd >= termStart) {
        numWeeks = Math.floor((termEnd - termStart) / 86400000 / 7) + 1;
    }
    log(numWeeks ? `Term spans ${numWeeks} weeks.` : "Term week count unknown.");

    // Call A: course details. Call B: activities.
    const course = await callClaude(client, doc, COURSE_PROMPT, COURSE_TOOL);
    const activityData = await callClaude(client, doc, activityPrompt(numWeeks), ACTIVITIES_TOOL);

    for (const w of activityData.warnings || []) log(`  warning: ${w}`);

    const activities = (activityData.activities || []).map((raw) => ({
        activity_category: raw.activity_category,
        activity_name: raw.activity_name,
        due_date: resolveDueDate(raw, termStart, termEnd),
        grading_weight: raw.grading_weight != null ? Math.round(raw.grading_weight * 100) / 100 : null,
    }));

    log(`Done: ${activities.length} activities.`);

    return {
        course: {
            course_code: course.course_code,
            course_name: course.course_name,
            professor_name: course.professor_name,
            office_hours: course.office_hours,
            meeting_times: course.meeting_times,
            room: course.room,
            textbook_link: course.textbook_link,
            gpa_goal: null, // student-supplied downstream, never extracted here.
        },
        activities,
    };
}
