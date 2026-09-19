import { query } from "../config/db.js";

export const getAllUsers = async (role, callback) => {
  try {
    const sql = `
      SELECT
        u.user_id, u.first_name, u.last_name, u.email, u.role,
        u.institution, u.created_at,
        (SELECT COUNT(*) FROM courses c WHERE c.user_id = u.user_id)::int AS course_count,
        (SELECT COUNT(*) FROM activities a
           JOIN courses c2 ON c2.course_id = a.course_id
          WHERE c2.user_id = u.user_id)::int AS activity_count
      FROM users u
      ${role ? "WHERE u.role = $1" : ""}
      ORDER BY u.created_at DESC
    `;
    const { rows } = await query(sql, role ? [role] : []);
    callback(null, rows);
  } catch (err) {
    console.error("Error fetching users (admin):", err);
    callback(err, null);
  }
};

export const getUserById = async (userId, callback) => {
  try {
    const { rows } = await query(
      `SELECT user_id, first_name, last_name, email, role
         FROM users WHERE user_id = $1`,
      [userId]
    );
    callback(null, rows);
  } catch (err) {
    console.error("Error fetching user (admin):", err);
    callback(err, null);
  }
};

export const getAllCourses = async (callback) => {
  try {
    const { rows } = await query(
      `SELECT c.*,
              u.first_name AS owner_first_name,
              u.last_name  AS owner_last_name,
              (SELECT COUNT(*) FROM activities a WHERE a.course_id = c.course_id)::int AS activity_count
         FROM courses c
         JOIN users u ON u.user_id = c.user_id
        ORDER BY c.created_at DESC`
    );
    callback(null, rows);
  } catch (err) {
    console.error("Error fetching courses (admin):", err);
    callback(err, null);
  }
};

export const getCourseById = async (courseId, callback) => {
  try {
    const { rows } = await query("SELECT * FROM courses WHERE course_id = $1", [courseId]);
    callback(null, rows);
  } catch (err) {
    console.error("Error fetching course (admin):", err);
    callback(err, null);
  }
};

export const getStatistics = async (callback) => {
  try {
    const { rows } = await query(
      `SELECT
         (SELECT COUNT(*) FROM users WHERE role = 'student')::int AS total_students,
         (SELECT COUNT(*) FROM courses)::int AS total_courses,
         (SELECT COUNT(*) FROM activities)::int AS total_activities,
         (SELECT COUNT(*) FROM activities WHERE grade IS NOT NULL)::int AS graded_activities`
    );
    callback(null, rows);
  } catch (err) {
    console.error("Error fetching statistics (admin):", err);
    callback(err, null);
  }
};

// A "recent events" feed: newest student signups, new courses, and new
// assignments, stacked into one list, newest first.
export const getRecentActivity = async (limit, callback) => {
  try {
    const { rows } = await query(
      `(
         SELECT 'register' AS type,
                first_name || ' ' || last_name AS subject,
                NULL::text AS context,
                created_at AS at
           FROM users WHERE role = 'student'
          ORDER BY created_at DESC LIMIT $1
       )
       UNION ALL
       (
         SELECT 'course' AS type,
                c.course_code AS subject,
                u.first_name || ' ' || u.last_name AS context,
                c.created_at AS at
           FROM courses c JOIN users u ON u.user_id = c.user_id
          ORDER BY c.created_at DESC LIMIT $2
       )
       UNION ALL
       (
         SELECT 'assignment' AS type,
                a.activity_name AS subject,
                c.course_code AS context,
                a.created_at AS at
           FROM activities a JOIN courses c ON c.course_id = a.course_id
          ORDER BY a.created_at DESC LIMIT $3
       )
       ORDER BY at DESC LIMIT $4`,
      [limit, limit, limit, limit]
    );
    callback(null, rows);
  } catch (err) {
    console.error("Error fetching recent activity (admin):", err);
    callback(err, null);
  }
};

export const getAllActivities = async (callback) => {
  try {
    const { rows } = await query("SELECT * FROM activities");
    callback(null, rows);
  } catch (err) {
    console.error("Error fetching activities (admin):", err);
    callback(err, null);
  }
};