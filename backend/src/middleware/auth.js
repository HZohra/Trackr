import jwt from "jsonwebtoken";
import { query } from "../config/db.js";

const MIN_SECRET_LENGTH = 32;

let JWT_SECRET = "";

export const initJWTSecret = () => {
    const secret = process.env.JWT_SECRET;

    if (!secret || secret === "GENERATE_A_SECRET_KEY_FOR_JWT") {
        console.error(
            "JWT_SECRET is not set. Add it to backend/.env — generate one with:\n" +
                "  node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"",
        );
        JWT_SECRET = "";
        return;
    }

    if (secret.length < MIN_SECRET_LENGTH) {
        console.error(
            `JWT_SECRET is too short (${secret.length} chars). Use at least ${MIN_SECRET_LENGTH}.`,
        );
        JWT_SECRET = "";
        return;
    }

    JWT_SECRET = secret;
};

export const getJWTSecret = () => JWT_SECRET;

export const createToken = (user) => {
    return jwt.sign(
        {
            user_id: user.user_id,
            role: user.role,
            // Stamped so a password change/reset (which bumps token_version)
            // instantly invalidates every token minted before it.
            token_version: user.token_version ?? 0,
        },
        JWT_SECRET,
        { expiresIn: "1h" },
    );
};

export const verifyToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // "Bearer <token>"

    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) {
            return res
                .status(401)
                .json({ message: "Invalid or expired token" });
        }

        try {
            // Freshness check: the token's version must still match the user's.
            // A password change/reset bumps token_version, stranding old tokens.
            const { rows } = await query(
                "SELECT token_version FROM users WHERE user_id = $1",
                [decoded.user_id],
            );
            const user = rows[0];
            if (!user) {
                return res
                    .status(401)
                    .json({ message: "Invalid or expired token" });
            }
            if ((user.token_version ?? 0) !== (decoded.token_version ?? 0)) {
                return res
                    .status(401)
                    .json({ message: "Session expired. Please sign in again." });
            }

            req.user = decoded;
            next();
        } catch {
            return res.status(500).json({ message: "Server error" });
        }
    });
};

export const requireAdmin = (req, res, next) => {
    if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
    }
    next();
};