// backend/src/scripts/make-admin.js
//
// Developer-only. Grants (or revokes) admin on an account that ALREADY exists.
// Admin is never obtainable through the public API — running this script with
// database access is the only way to create one.
//
//   node src/scripts/make-admin.js someone@example.com
//   node src/scripts/make-admin.js someone@example.com --revoke

import dotenv from "dotenv";
import { pgPool, query } from "../config/db.js";

dotenv.config();

const email = process.argv[2];
const revoke =
    process.argv.includes("--revoke") || process.argv.includes("--demote");
const role = revoke ? "student" : "admin";

async function main() {
    if (!email || email.startsWith("--")) {
        console.error("Usage: node src/scripts/make-admin.js <email> [--revoke]");
        process.exitCode = 1;
        return;
    }

    const { rows } = await query(
        `UPDATE users SET role = $1
          WHERE lower(email) = lower($2)
      RETURNING user_id, email, role`,
        [role, email],
    );

    if (rows.length === 0) {
        console.error(
            `No account found for "${email}". Have them register first, then run this again.`,
        );
        process.exitCode = 1;
        return;
    }

    const u = rows[0];
    console.log(`OK — ${u.email} (user_id ${u.user_id}) is now role="${u.role}".`);
}

main()
    .catch((err) => {
        console.error("Failed:", err.message);
        process.exitCode = 1;
    })
    .finally(() => pgPool.end());