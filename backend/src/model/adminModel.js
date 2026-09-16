import pool from "../config/db.js";

// update SQL queries to extract the data we need for the admin dashboard
export const getAllUsers = (role, callback) => {
    const query = `
        SELECT
            u.user_id,
            u.first_name,
            u.last_name,
            u.email,
            u.role,
            u.institution,
            u.created_at,
            (
                SELECT COUNT(*)
                FROM courses c
                WHERE c.user_id = u.user_id
            ) AS course_count,
            (
                SELECT COUNT(*)
                FROM activities a
                JOIN courses c2 ON c2.course_id = a.course_id
                WHERE c2.user_id = u.user_id
            ) AS activity_count
        FROM users u
        ${role ? "WHERE u.role = ?" : ""}
        ORDER BY u.created_at DESC
    `;
    pool.query(query, role ? [role] : [], callback);
};

export const getUserById = (userId, callback) => {
    const query = `
        SELECT user_id, first_name, last_name, email, role
        FROM users
        WHERE user_id = ?
    `;
    pool.query(query, [userId], callback);
};

export const getAllCourses = (callback) => {
    const query = `
        SELECT
            c.*,
            u.first_name AS owner_first_name,
            u.last_name AS owner_last_name,
            (
                SELECT COUNT(*)
                FROM activities a
                WHERE a.course_id = c.course_id
            ) AS activity_count
        FROM courses c
        JOIN users u ON u.user_id = c.user_id
        ORDER BY c.created_at DESC
    `;
    pool.query(query, callback);
};

export const getCourseById = (courseId, callback) => {
    pool.query(
        "SELECT * FROM courses WHERE course_id = ?",
        [courseId],
        callback,
    );
};

export const getStatistics = (callback) => {
    const query = `
        SELECT
            (SELECT COUNT(*) FROM users WHERE role = 'student') AS total_students,
            (SELECT COUNT(*) FROM courses) AS total_courses,
            (SELECT COUNT(*) FROM activities) AS total_activities,
            (
                SELECT COUNT(*) FROM activities WHERE grade IS NOT NULL
            ) AS graded_activities
    `;
    pool.query(query, callback);
};

// Recent evcents that have occured on teh platform (student registration, course creation, activity creation)
export const getRecentActivity = (limit, callback) => {
    const query = `
        (
            SELECT
                'register' AS type,
                CONCAT(first_name, ' ', last_name) AS subject,
                NULL AS context,
                created_at AS at
            FROM users
            WHERE role = 'student'
            ORDER BY created_at DESC
            LIMIT ?
        )
        UNION ALL
        (
            SELECT
                'course' AS type,
                c.course_code AS subject,
                CONCAT(u.first_name, ' ', u.last_name) AS context,
                c.created_at AS at
            FROM courses c
            JOIN users u ON u.user_id = c.user_id
            ORDER BY c.created_at DESC
            LIMIT ?
        )
        UNION ALL
        (
            SELECT
                'assignment' AS type,
                a.activity_name AS subject,
                c.course_code AS context,
                a.created_at AS at
            FROM activities a
            JOIN courses c ON c.course_id = a.course_id
            ORDER BY a.created_at DESC
            LIMIT ?
        )
        ORDER BY at DESC
        LIMIT ?
    `;
    pool.query(query, [limit, limit, limit, limit], callback);
};

export const getAllActivities = (callback) => {
    pool.query("SELECT * FROM activities", callback);
};
