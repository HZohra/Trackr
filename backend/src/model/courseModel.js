import pool from "../config/db.js";
import { defaultReminder } from "./activityModel.js";

// All courses belonging to one user (dashboard, courses page)
export const getCoursesByUserId = (userId, callback) => {
    pool.getConnection((err, db) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return callback(err, null);
        }
        const query = "SELECT * FROM courses WHERE user_id = ?";
        db.query(query, [userId], (err, results) => {
            db.release();
            if (err) {
                console.error("Error fetching courses:", err);
                return callback(err, null);
            }
            callback(null, results);
        });
    });
};

// One course, but scoped to the requesting user — this is the ownership
// check. If someone else's course_id is passed in, this returns nothing
// rather than leaking another student's course.
export const getCourseById = (courseId, userId, callback) => {
    pool.getConnection((err, db) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return callback(err, null);
        }
        const query =
            "SELECT * FROM courses WHERE course_id = ? AND user_id = ?";
        db.query(query, [courseId, userId], (err, results) => {
            db.release();
            if (err) {
                console.error("Error fetching course:", err);
                return callback(err, null);
            }
            callback(null, results[0]);
        });
    });
};

// Creates a course for a given user (called after syllabus review/confirm,
// or a manual "add course" action)
export const createCourse = (userId, courseData, callback) => {
    pool.getConnection((err, db) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return callback(err, null);
        }
        const {
            course_code,
            course_name,
            professor_name,
            term,
            office_hours,
            meeting_times,
            room,
            textbook_link,
            gpa_goal,
        } = courseData;

        const query = `
            INSERT INTO courses
                (user_id, course_code, course_name, professor_name, term,
                office_hours, meeting_times, room, textbook_link, gpa_goal)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(
            query,
            [
                userId,
                course_code,
                course_name,
                professor_name || null,
                term,
                office_hours || null,
                meeting_times || null,
                room || null,
                textbook_link || null,
                gpa_goal || null,
            ],
            (err, results) => {
                db.release();
                if (err) {
                    console.error("Error creating course:", err);
                    return callback(err, null);
                }
                callback(null, { course_id: results.insertId, ...courseData });
            },
        );
    });
};

// Deletes one course only when it belongs to the logged-in user.
// Related activities are removed by the database through ON DELETE CASCADE.
export const deleteCourseById = (courseId, userId, callback) => {
    pool.getConnection((err, db) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return callback(err, null);
        }

        const query = `
            DELETE FROM courses
            WHERE course_id = ? AND user_id = ?
        `;

        db.query(query, [courseId, userId], (err, results) => {
            db.release();

            if (err) {
                console.error("Error deleting course:", err);
                return callback(err, null);
            }

            callback(null, {
                affectedRows: results.affectedRows,
            });
        });
    });
};


// Flips a course's archived flag, scoped to the owner. Returns affectedRows so
// the controller can 404 on a wrong or someone-else's course_id — same
// ownership pattern as deleteCourseById.
export const setCourseArchived = (courseId, userId, archived, callback) => {
    pool.getConnection((err, db) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return callback(err, null);
        }
        const query = `
            UPDATE courses
            SET archived = ?
            WHERE course_id = ? AND user_id = ?
        `;
        db.query(query, [archived ? 1 : 0, courseId, userId], (err, results) => {
            db.release();
            if (err) {
                console.error("Error updating course archive state:", err);
                return callback(err, null);
            }
            callback(null, { affectedRows: results.affectedRows });
        });
    });
};

// Sets or clears a course's manual final-grade override (a percentage, or null
// to fall back to the computed weighted average). Scoped to the owner.
export const setCourseFinalGrade = (courseId, userId, finalGrade, callback) => {
    pool.getConnection((err, db) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return callback(err, null);
        }
        const query = `
            UPDATE courses
            SET final_grade = ?
            WHERE course_id = ? AND user_id = ?
        `;
        db.query(query, [finalGrade, courseId, userId], (err, results) => {
            db.release();
            if (err) {
                console.error("Error updating final grade:", err);
                return callback(err, null);
            }
            callback(null, { affectedRows: results.affectedRows });
        });
    });
};

// Creates a course and all of its activities in a single transaction. Either
// everything commits, or nothing does — no orphaned course, no half-inserted
// activity list. Replaces the old "create course, then loop inserts on
// separate connections" flow that could leave partial data on failure.
export const createCourseWithActivities = (
    userId,
    courseData,
    activities,
    callback,
) => {
    pool.getConnection((err, db) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return callback(err, null);
        }

        db.beginTransaction((err) => {
            if (err) {
                db.release();
                return callback(err, null);
            }

            const {
                course_code,
                course_name,
                professor_name,
                term,
                term_end,
                office_hours,
                meeting_times,
                room,
                textbook_link,
                gpa_goal,
            } = courseData;

            const courseQuery = `
                INSERT INTO courses
                    (user_id, course_code, course_name, professor_name, term,
                    term_end, office_hours, meeting_times, room, textbook_link, gpa_goal)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            db.query(
                courseQuery,
                [
                    userId,
                    course_code,
                    course_name,
                    professor_name || null,
                    term,
                    term_end || null,
                    office_hours || null,
                    meeting_times || null,
                    room || null,
                    textbook_link || null,
                    gpa_goal || null,
                ],
                (err, courseResult) => {
                    if (err) return rollback(db, callback, err);

                    const courseId = courseResult.insertId;
                    const newCourse = { course_id: courseId, ...courseData };

                    // No activities: commit just the course.
                    if (!activities || activities.length === 0) {
                        return db.commit((err) => {
                            if (err) return rollback(db, callback, err);
                            db.release();
                            callback(null, { course: newCourse, activities: [] });
                        });
                    }

                    // One bulk INSERT for every activity.
                    const values = activities.map((a) => [
                        courseId,
                        a.activity_category_id,
                        a.activity_name,
                        a.due_date,
                        a.grading_weight || 0,
                        a.reminder_date || defaultReminder(a.due_date),
                        a.reminder_method || "email",
                        a.priority_level || "medium",
                    ]);

                    const activityQuery = `
                        INSERT INTO activities
                            (course_id, activity_category_id, activity_name, due_date,
                            grading_weight, reminder_date, reminder_method, priority_level)
                        VALUES ?
                    `;

                    db.query(activityQuery, [values], (err, actResult) => {
                        if (err) return rollback(db, callback, err);

                        db.commit((err) => {
                            if (err) return rollback(db, callback, err);
                            db.release();

                            // A single multi-row INSERT assigns consecutive
                            // auto-increment ids from insertId, so we can
                            // reconstruct each activity_id for the response.
                            const firstId = actResult.insertId;
                            const createdActivities = activities.map((a, i) => ({
                                activity_id: firstId + i,
                                course_id: courseId,
                                ...a,
                            }));
                            callback(null, {
                                course: newCourse,
                                activities: createdActivities,
                            });
                        });
                    });
                },
            );
        });
    });
};

// Rolls back the transaction and releases the connection on any failure.
function rollback(db, callback, err) {
    console.error("Transaction failed, rolling back:", err.message);
    return db.rollback(() => {
        db.release();
        callback(err, null);
    });
}
