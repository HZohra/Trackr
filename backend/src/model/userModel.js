import { query } from "../config/db.js";

export const getAllUsers = async (callback) => {
  try {
    const { rows } = await query("SELECT * FROM users");
    callback(null, rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    callback(err, null);
  }
};

export const getUserByEmail = async (email, callback) => {
  try {
    const { rows } = await query("SELECT * FROM users WHERE email = $1", [email]);
    callback(null, rows[0]);
  } catch (err) {
    console.error("Error fetching user by email:", err);
    callback(err, null);
  }
};

export const getUserById = async (userId, callback) => {
  try {
    const { rows } = await query("SELECT * FROM users WHERE user_id = $1", [userId]);
    callback(null, rows[0]);
  } catch (err) {
    console.error("Error fetching user by ID:", err);
    callback(err, null);
  }
};

export const createUser = async (userData, callback) => {
  try {
    const { first_name, last_name, email, password_hash, role } = userData;
    const { rows } = await query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id`,
      [first_name, last_name, email, password_hash, role || "student"]
    );
    callback(null, {
      user_id: rows[0].user_id,
      first_name,
      last_name,
      email,
      role: role || "student",
    });
  } catch (err) {
    console.error("Error creating user:", err);
    callback(err, null);
  }
};

// Updates editable profile fields only — email/password/role are
// intentionally excluded here; those need their own dedicated flows
// (password reset, email change with re-verification, admin-only role
// changes) rather than being editable through a general profile update.
const UPDATABLE_PROFILE_COLUMNS = [
  "first_name",
  "last_name",
  "institution",
  "theme_mode",
  "preferred_gpa_scale",
  "default_reminder_days",
  "default_reminder_method",
];

export const updateUserProfile = async (userId, profileData, callback) => {
  const columns = UPDATABLE_PROFILE_COLUMNS.filter(
    (col) =>
      Object.prototype.hasOwnProperty.call(profileData, col) &&
      profileData[col] !== undefined
  );

  // Nothing to update — successful no-op rather than an invalid empty SET.
  if (columns.length === 0) {
    return callback(null, { user_id: userId });
  }

  try {
    // Column names come from the fixed whitelist above (safe to interpolate);
    // values are always parameterized ($1, $2, …).
    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(", ");
    const values = columns.map((col) => profileData[col]);
    const sql = `UPDATE users SET ${setClause} WHERE user_id = $${columns.length + 1}`;
    await query(sql, [...values, userId]);
    callback(null, { user_id: userId, ...profileData });
  } catch (err) {
    console.error("Error updating user:", err);
    callback(err, null);
  }
};

export const updateUserPassword = async (userId, newPasswordHash, callback) => {
  try {
    await query("UPDATE users SET password_hash = $1 WHERE user_id = $2", [
      newPasswordHash,
      userId,
    ]);
    callback(null, { user_id: userId });
  } catch (err) {
    console.error("Error updating user password:", err);
    callback(err, null);
  }
};

export const getPasswordResetWithToken = async (token, callback) => {
  try {
    const { rows } = await query(
      "SELECT * FROM password_reset_tokens WHERE token = $1",
      [token]
    );
    callback(null, rows[0]);
  } catch (err) {
    console.error("Error fetching password reset token:", err);
    callback(err, null);
  }
};

export const getPasswordResetWithUserID = async (userID, callback) => {
  try {
    const { rows } = await query(
      "SELECT * FROM password_reset_tokens WHERE user_id = $1",
      [userID]
    );
    callback(null, rows[0]);
  } catch (err) {
    console.error("Error fetching password reset token:", err);
    callback(err, null);
  }
};

export const deletePasswordResetToken = async (token, callback) => {
  try {
    const result = await query(
      "DELETE FROM password_reset_tokens WHERE token = $1",
      [token]
    );
    callback(null, result);
  } catch (err) {
    console.error("Error deleting password reset token:", err);
    callback(err, null);
  }
};

export const createPasswordResetToken = async (userID, token, expiresAt, callback) => {
  try {
    const result = await query(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [userID, token, expiresAt]
    );
    callback(null, result);
  } catch (err) {
    console.error("Error creating password reset token:", err);
    callback(err, null);
  }
};

export const deleteUserById = async (userId, callback) => {
  try {
    const result = await query("DELETE FROM users WHERE user_id = $1", [userId]);
    // Keep the same shape the controller expects (affectedRows).
    callback(null, { affectedRows: result.rowCount });
  } catch (err) {
    console.error("Error deleting user account:", err);
    callback(err, null);
  }
};