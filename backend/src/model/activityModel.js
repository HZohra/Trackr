import pool from "../config/db.js";

// All activities for a user, across all their courses. activities has no
// user_id column — ownership only exists through activities -> courses ->
// user_id, so this has to join through courses.
export const getAllActivities = (userId, callback) => {
    pool.getConnection((err, db) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return callback(err, null);
        }
        const query = `
            SELECT a.*
            FROM activities a
            JOIN courses c ON a.course_id = c.course_id
            WHERE c.user_id = ?
            ORDER BY a.due_date ASC
        `;
        db.query(query, [userId], (err, results) => {
            if (err) {
                console.error("Error fetching activities:", err);
                return callback(err, null);
            }
            callback(null, results);
        });
    });
};

// Activities for one course — still joins on courses to confirm the
// requesting user actually owns that course, not just any course_id.
export const getActivitiesByCourseId = (courseId, userId, callback) => {
    pool.getConnection((err, db) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return callback(err, null);
        }
        const query = `
            SELECT a.*
            FROM activities a
            JOIN courses c ON a.course_id = c.course_id
            WHERE a.course_id = ? AND c.user_id = ?
            ORDER BY a.due_date ASC
        `;
        db.query(query, [courseId, userId], (err, results) => {
            if (err) {
                console.error("Error fetching activities for course:", err);
                return callback(err, null);
            }
            callback(null, results);
        });
    });
};

// Creates one activity under a course (used when confirming syllabus
// extraction, or adding an assignment manually)
export const createActivity = (courseId, activityData, callback) => {
    pool.getConnection((err, db) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return callback(err, null);
        }
        const {
            activity_category_id,
            activity_name,
            due_date,
            grading_weight,
            reminder_date,
            reminder_method,
            priority_level,
        } = activityData;

        const query = `
            INSERT INTO activities
                (course_id, activity_category_id, activity_name, due_date,
                grading_weight, reminder_date, reminder_method, priority_level)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(
            query,
            [
                courseId,
                activity_category_id,
                activity_name,
                due_date,
                grading_weight || 0,
                reminder_date || null,
                reminder_method || "email",
                priority_level || "medium",
            ],
            (err, results) => {
                db.release();
                if (err) {
                    console.error("Error creating activity:", err);
                    return callback(err, null);
                }
                callback(null, {
                    activity_id: results.insertId,
                    ...activityData,
                });
            },
        );
    });
};

// Records the grade / status on one activity. grade is a number 0-100, or
// null to clear it.
export const updateActivity = (activityId, userId, activityData, callback) => {
    pool.getConnection((err, db) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return callback(err, null);
        }

        const ownsQuery = `
            SELECT a.activity_id
            FROM activities a
            JOIN courses c ON a.course_id = c.course_id
            WHERE a.activity_id = ? AND c.user_id = ?
        `;
        db.query(ownsQuery, [activityId, userId], (err, rows) => {
            if (err) {
                db.release();
                console.error("Error checking activity ownership:", err);
                return callback(err, null);
            }
            if (rows.length === 0) {
                db.release();
                return callback(null, null); // missing, or not this user's
            }

            const { grade, status } = activityData;
            const updateQuery = `UPDATE activities SET grade = ?, status = ? WHERE activity_id = ?`;
            db.query(updateQuery, [grade, status, activityId], (err) => {
                if (err) {
                    db.release();
                    console.error("Error updating activity:", err);
                    return callback(err, null);
                }

                db.query(
                    `SELECT * FROM activities WHERE activity_id = ?`,
                    [activityId],
                    (err, updated) => {
                        db.release();
                        if (err) {
                            console.error("Error reloading activity:", err);
                            return callback(err, null);
                        }
                        callback(null, updated[0]);
                    },
                );
            });
        });
    });
};

// Removes one activity, from the delete button on an assignment card. Hard
// delete — the schema has no soft-delete column, and nothing references
// activities, so there's nothing to cascade. Calls back `true` when a row was
// removed, `false` when there was nothing to remove.
export const deleteActivity = (activityId, userId, callback) => {
    pool.getConnection((err, db) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return callback(err, null);
        }

        // Same join as updateActivity — activities has no user_id, so this is
        // the only way to prove the row is the caller's before touching it.
        const ownsQuery = `
            SELECT a.activity_id
            FROM activities a
            JOIN courses c ON a.course_id = c.course_id
            WHERE a.activity_id = ? AND c.user_id = ?
        `;
        db.query(ownsQuery, [activityId, userId], (err, rows) => {
            if (err) {
                db.release();
                console.error("Error checking activity ownership:", err);
                return callback(err, null);
            }
            if (rows.length === 0) {
                db.release();
                return callback(null, false); // missing, or not this user's
            }

            db.query(
                `DELETE FROM activities WHERE activity_id = ?`,
                [activityId],
                (err) => {
                    db.release();
                    if (err) {
                        console.error("Error deleting activity:", err);
                        return callback(err, null);
                    }
                    callback(null, true);
                },
            );
        });
    });
};

// Aggregate counts for the dashboard's stat tiles — total courses,
// total activities, how many are done vs pending (based on grade being
// recorded), and how many are due soon.
export const getStatisticsByUserId = (userId, callback) => {
    pool.getConnection((err, db) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return callback(err, null);
        }
        const query = `
            SELECT
                (SELECT COUNT(*) FROM courses WHERE user_id = ?) AS total_courses,
                COUNT(a.activity_id) AS total_activities,
                SUM(CASE WHEN a.grade IS NOT NULL THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN a.grade IS NULL AND a.due_date >= NOW() THEN 1 ELSE 0 END) AS upcoming,
                SUM(CASE WHEN a.grade IS NULL AND a.due_date < NOW() THEN 1 ELSE 0 END) AS overdue
            FROM activities a
            JOIN courses c ON a.course_id = c.course_id
            WHERE c.user_id = ?
        `;
        db.query(query, [userId, userId], (err, results) => {
            if (err) {
                console.error("Error fetching statistics:", err);
                return callback(err, null);
            }
            callback(null, results[0]);
        });
    });
};
