import pool from "../config/db.js";

// All courses belonging to one user (dashboard, courses page)
export const getCoursesByUserId = (userId, callback) => {
    pool.getConnection((err, db) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return callback(err, null);
        }
        const query = "SELECT * FROM courses WHERE user_id = ?";
        db.query(query, [userId], (err, results) => {
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
