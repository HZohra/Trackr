import { query, withTransaction } from "../config/db.js";
import { defaultReminder } from "./activityModel.js";

// All courses belonging to one user (dashboard, courses page)
export const getCoursesByUserId = async (userId, callback) => {
  try {
    const { rows } = await query("SELECT * FROM courses WHERE user_id = $1", [userId]);
    callback(null, rows);
  } catch (err) {
    console.error("Error fetching courses:", err);
    callback(err, null);
  }
};

// One course, scoped to the requesting user — this is the ownership check.
// A wrong/other-user course_id simply returns nothing rather than leaking it.
export const getCourseById = async (courseId, userId, callback) => {
  try {
    const { rows } = await query(
      "SELECT * FROM courses WHERE course_id = $1 AND user_id = $2",
      [courseId, userId]
    );
    callback(null, rows[0]);
  } catch (err) {
    console.error("Error fetching course:", err);
    callback(err, null);
  }
};

// Creates a course (manual "add course", or after syllabus confirm)
export const createCourse = async (userId, courseData, callback) => {
  try {
    const {
      course_code, course_name, professor_name, term,
      office_hours, meeting_times, room, textbook_link, gpa_goal,
    } = courseData;

    const { rows } = await query(
      `INSERT INTO courses
         (user_id, course_code, course_name, professor_name, term,
          office_hours, meeting_times, room, textbook_link, gpa_goal)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING course_id`,
      [
        userId, course_code, course_name, professor_name || null, term,
        office_hours || null, meeting_times || null, room || null,
        textbook_link || null, gpa_goal || null,
      ]
    );
    callback(null, { course_id: rows[0].course_id, ...courseData });
  } catch (err) {
    console.error("Error creating course:", err);
    callback(err, null);
  }
};

// Deletes one course only when it belongs to the user. Related activities are
// removed by the database via ON DELETE CASCADE.
export const deleteCourseById = async (courseId, userId, callback) => {
  try {
    const result = await query(
      "DELETE FROM courses WHERE course_id = $1 AND user_id = $2",
      [courseId, userId]
    );
    callback(null, { affectedRows: result.rowCount });
  } catch (err) {
    console.error("Error deleting course:", err);
    callback(err, null);
  }
};

// Flips a course's archived flag, scoped to the owner. rowCount lets the
// controller 404 on a wrong/other-user course_id.
export const setCourseArchived = async (courseId, userId, archived, callback) => {
  try {
    const result = await query(
      "UPDATE courses SET archived = $1 WHERE course_id = $2 AND user_id = $3",
      [archived, courseId, userId]
    );
    callback(null, { affectedRows: result.rowCount });
  } catch (err) {
    console.error("Error updating course archive state:", err);
    callback(err, null);
  }
};

// Sets or clears a course's manual final-grade override (percentage, or null to
// fall back to the computed weighted average). Scoped to the owner.
export const setCourseFinalGrade = async (courseId, userId, finalGrade, callback) => {
  try {
    const result = await query(
      "UPDATE courses SET final_grade = $1 WHERE course_id = $2 AND user_id = $3",
      [finalGrade, courseId, userId]
    );
    callback(null, { affectedRows: result.rowCount });
  } catch (err) {
    console.error("Error updating final grade:", err);
    callback(err, null);
  }
};

// Archives the user's courses whose term has already ended (term_end in the
// past) and that aren't archived yet. Runs on the courses read path so finished
// semesters clear out on their own. Courses with no term_end are left alone.
export const autoArchivePastCourses = async (userId, callback) => {
  try {
    const result = await query(
      `UPDATE courses
          SET archived = TRUE
        WHERE user_id = $1
          AND archived = FALSE
          AND term_end IS NOT NULL
          AND term_end < CURRENT_DATE`,
      [userId]
    );
    callback(null, result.rowCount);
  } catch (err) {
    console.error("Error auto-archiving past courses:", err);
    callback(err);
  }
};

// Creates a course and all of its activities in ONE transaction: either
// everything commits, or nothing does — no orphaned course, no half-inserted
// activity list.
export const createCourseWithActivities = (userId, courseData, activities, callback) => {
  const {
    course_code, course_name, professor_name, term, term_end,
    office_hours, meeting_times, room, textbook_link, gpa_goal,
  } = courseData;

  withTransaction(async (client) => {
    // 1. Insert the course; RETURNING gives us its new id.
    const courseResult = await client.query(
      `INSERT INTO courses
         (user_id, course_code, course_name, professor_name, term,
          term_end, office_hours, meeting_times, room, textbook_link, gpa_goal)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING course_id`,
      [
        userId, course_code, course_name, professor_name || null, term,
        term_end || null, office_hours || null, meeting_times || null,
        room || null, textbook_link || null, gpa_goal || null,
      ]
    );
    const courseId = courseResult.rows[0].course_id;
    const newCourse = { course_id: courseId, ...courseData };

    // No activities: commit just the course.
    if (!activities || activities.length === 0) {
      return { course: newCourse, activities: [] };
    }

    // 2. One multi-row INSERT for all activities. Build the placeholders
    //    ($1,$2,…),($9,…) and a matching flat params array.
    const COLS = 8;
    const params = [];
    const rowsSql = activities.map((a, i) => {
      const b = i * COLS;
      params.push(
        courseId,
        a.activity_category_id,
        a.activity_name,
        a.due_date,
        a.grading_weight || 0,
        a.reminder_date || defaultReminder(a.due_date),
        a.reminder_method || "email",
        a.priority_level || "medium"
      );
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8})`;
    });

    const actResult = await client.query(
      `INSERT INTO activities
         (course_id, activity_category_id, activity_name, due_date,
          grading_weight, reminder_date, reminder_method, priority_level)
       VALUES ${rowsSql.join(", ")}
       RETURNING *`,
      params
    );

    // RETURNING gives us the real inserted rows (real activity_ids and all).
    return { course: newCourse, activities: actResult.rows };
  })
    .then((result) => callback(null, result))
    .catch((err) => {
      console.error("Transaction failed, rolling back:", err.message);
      callback(err, null);
    });
};