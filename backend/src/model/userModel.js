import pool from "../config/db.js";

export const getAllUsers = (callback) => {
    pool.getConnection((err, db) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return callback(err, null);
        }

        const query = "SELECT * FROM users";
        db.query(query, (err, results) => {
            if (err) {
                console.error("Error fetching users:", err);
                return callback(err, null);
            }
            callback(null, results);
        });
    });
};

export const getUserByEmail = (email, callback) => {
    pool.getConnection((err, db) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return callback(err, null);
        }

        const query = "SELECT * FROM users WHERE email = ?";
        db.query(query, [email], (err, results) => {
            if (err) {
                console.error("Error fetching user by email:", err);
                return callback(err, null);
            }
            callback(null, results[0]);
        });
    });
};

export const getUserById = (userId, callback) => {
    pool.getConnection((err, db) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return callback(err, null);
        }

        const query = "SELECT * FROM users WHERE user_id = ?";
        db.query(query, [userId], (err, results) => {
            if (err) {
                console.error("Error fetching user by ID:", err);
                return callback(err, null);
            }
            callback(null, results[0]);
        });
    });
};

export const createUser = (userData, callback) => {
    pool.getConnection((err, db) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return callback(err, null);
        }

        const { first_name, last_name, email, password_hash, role } = userData;
        const query = `
            INSERT INTO users (first_name, last_name, email, password_hash, role)
            VALUES (?, ?, ?, ?, ?)
        `;
        db.query(
            query,
            [first_name, last_name, email, password_hash, role || "student"],
            (err, results) => {
                if (err) {
                    console.error("Error creating user:", err);
                    return callback(err, null);
                }
                callback(null, {
                    user_id: results.insertId,
                    first_name,
                    last_name,
                    email,
                    role: role || "student",
                });
            },
        );
    });
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

export const updateUserProfile = (userId, profileData, callback) => {
    // Build the UPDATE from only the fields the client actually sent
    const columns = UPDATABLE_PROFILE_COLUMNS.filter(
        (col) =>
            Object.prototype.hasOwnProperty.call(profileData, col) &&
            profileData[col] !== undefined,
    );

    // Nothing to update — treat as a successful no-op rather than issuing an invalid "SET" with no assignments.
    if (columns.length === 0) {
        return callback(null, { user_id: userId });
    }

    pool.getConnection((err, db) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return callback(err, null);
        }

        const setClause = columns.map((col) => `${col} = ?`).join(", ");
        const values = columns.map((col) => profileData[col]);
        const query = `UPDATE users SET ${setClause} WHERE user_id = ?`;

        db.query(query, [...values, userId], (err, results) => {
            if (err) {
                console.error("Error updating user:", err);
                return callback(err, null);
            }
            callback(null, { user_id: userId, ...profileData });
        });
    });
};

export const updateUserPassword = (userId, newPasswordHash, callback) => {
    pool.getConnection((err, db) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return callback(err, null);
        }

        const query = `
            UPDATE users
            SET password_hash = ?
            WHERE user_id = ? `;
        db.query(query, [newPasswordHash, userId], (err, results) => {
            if (err) {
                console.error("Error updating user password:", err);
                return callback(err, null);
            }
            callback(null, { user_id: userId });
        });
    });
};

export const getPasswordResetWithToken = (token, callback) => {
    pool.getConnection((err, db) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return callback(err, null);
        }
        db.query(
            "SELECT * FROM password_reset_tokens WHERE token = ?",
            [token],
            (err, results) => {
                if (err) {
                    console.error("Error fetching password reset token:", err);
                    return callback(err, null);
                }
                callback(null, results[0]);
            },
        );
    });
};

export const getPasswordResetWithUserID = (userID, callback) => {
    pool.getConnection((err, db) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return callback(err, null);
        }
        db.query(
            "SELECT * FROM password_reset_tokens WHERE user_id = ?",
            [userID],
            (err, results) => {
                if (err) {
                    console.error("Error fetching password reset token:", err);
                    return callback(err, null);
                }
                callback(null, results[0]);
            },
        );
    });
};

export const deletePasswordResetToken = (token, callback) => {
    pool.getConnection((err, db) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return callback(err, null);
        }

        db.query(
            "DELETE FROM password_reset_tokens WHERE token = ?",
            [token],
            (err, results) => {
                if (err) {
                    console.error("Error deleting password reset token:", err);
                    return callback(err, null);
                }
                callback(null, results);
            },
        );
    });
};

export const createPasswordResetToken = (userID, token, expiresAt, callback) => {
    pool.getConnection((err, db) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return callback(err, null);
        }
        db.query(
            "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
            [userID, token, expiresAt],
            (err, results) => {
                if (err) {
                    console.error("Error creating password reset token:", err);
                    return callback(err, null);
                }
                callback(null, results);
            },
        );
    });
};

export const deleteUserById = (userId, callback) => {
    pool.getConnection((err, db) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return callback(err, null);
        }

        const query = `
            DELETE FROM users
            WHERE user_id = ?
        `;

        db.query(query, [userId], (err, results) => {
            db.release();

            if (err) {
                console.error("Error deleting user account:", err);
                return callback(err, null);
            }

            callback(null, {
                affectedRows: results.affectedRows,
            });
        });
    });
};
