import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { createToken, getJWTSecret } from "../middleware/auth.js";
import { sendMail } from "../services/mailer.js";
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from "../utils/passwordPolicy.js";
import {
    createPasswordResetToken,
    createUser,
    deletePasswordResetToken,
    getPasswordResetWithToken,
    getPasswordResetWithUserID,
    getUserByEmail,
    setEmailVerified,
    updateUserPassword,
} from "../model/userModel.js";

const hashToken = (token) =>
    crypto.createHash("sha256").update(String(token)).digest("hex");

const getUserByEmailAsync = (email) =>
    new Promise((resolve, reject) => {
        getUserByEmail(email, (err, user) => {
            if (err) return reject(err);
            resolve(user);
        });
    });

const createUserAsync = (userData) =>
    new Promise((resolve, reject) => {
        createUser(userData, (err, user) => {
            if (err) return reject(err);
            resolve(user);
        });
    });

const updateUserPasswordAsync = (userId, passwordHash) =>
    new Promise((resolve, reject) => {
        updateUserPassword(userId, passwordHash, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });

const getPasswordResetWithTokenAsync = (tokenHash) =>
    new Promise((resolve, reject) => {
        getPasswordResetWithToken(tokenHash, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });

const getPasswordResetWithUserIDAsync = (userId) =>
    new Promise((resolve, reject) => {
        getPasswordResetWithUserID(userId, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });

const createPasswordResetTokenAsync = (userId, tokenHash, expiresAt) =>
    new Promise((resolve, reject) => {
        createPasswordResetToken(userId, tokenHash, expiresAt, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });

const deletePasswordResetTokenAsync = (tokenHash) =>
    new Promise((resolve, reject) => {
        deletePasswordResetToken(tokenHash, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });

// --- Email verification --------------------------------------------------- //
// Verification links carry a short-lived signed JWT (no DB token table needed).
const VERIFY_TTL = "24h";

const makeVerifyToken = (userId) =>
    jwt.sign({ user_id: userId, purpose: "email_verify" }, getJWTSecret(), {
        expiresIn: VERIFY_TTL,
    });

export const sendVerificationEmail = async (userId, email) => {
    const token = makeVerifyToken(userId);
    const link = `${process.env.FRONTEND_URL || "http://localhost:4200"}/verify-email?token=${encodeURIComponent(token)}`;
    await sendMail(
        email,
        "Verify your email",
        `Welcome to Trackr! Please verify your email by opening this link:\n\n${link}\n\nThis link expires in 24 hours.`,
    );
};

// Handles POST /auth/register
// Public registration must always create a student account.
// Admin role is never accepted from the client. New accounts start unverified.
export const userRegister = async (req, res) => {
    try {
        const first_name = String(req.body?.first_name ?? "").trim();
        const last_name = String(req.body?.last_name ?? "").trim();
        const email = String(req.body?.email ?? "").trim().toLowerCase();
        const password = String(req.body?.password ?? "");

        if (!first_name || !last_name || !email || !password) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        if (!isStrongPassword(password)) {
            return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
        }

        const existingUser = await getUserByEmailAsync(email);
        if (existingUser) {
            return res.status(409).json({ message: "Email already registered" });
        }

        const password_hash = await bcrypt.hash(password, 10);
        const newUser = await createUserAsync({
            first_name,
            last_name,
            email,
            password_hash,
            role: "student",
        });

        // Account starts unverified. Email a verification link; login is blocked
        // until the user clicks it. We do NOT return an auth token here.
        try {
            await sendVerificationEmail(newUser.user_id, email);
        } catch (mailErr) {
            console.error("Verification email failed to send:", mailErr.message);
            // The account exists; they can request a fresh link via resend.
        }

        return res.status(201).json({
            message: "Account created. Check your email to verify it before signing in.",
        });
    } catch (err) {
        console.error("Register failed:", err.message);
        return res.status(500).json({ message: "Server error" });
    }
};

async function getGoogleUserInfo(accessToken) {
    const client = new OAuth2Client();
    client.setCredentials({ access_token: accessToken });

    const response = await client.request({
        url: "https://www.googleapis.com/oauth2/v3/userinfo",
    });

    return response.data;
}

// NOTE: OAuth controllers are dormant — their routes are not mounted (see
// authRoute.js). Kept for when "Sign in with Google" is built properly.
export const userRegisterOAuth = async (req, res) => {
    try {
        const accessToken = req.body?.access_token;

        if (!accessToken) {
            return res.status(400).json({ message: "Missing Google access token" });
        }

        const googleUser = await getGoogleUserInfo(accessToken);

        if (!googleUser || !googleUser.email || !googleUser.email_verified) {
            throw new Error("Invalid Google credentials");
        }

        const email = String(googleUser.email).trim().toLowerCase();

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        const existingUser = await getUserByEmailAsync(email);
        if (existingUser) {
            return res.status(409).json({ message: "Email already registered" });
        }

        const randomPassword = crypto.randomBytes(32).toString("hex");
        const password_hash = await bcrypt.hash(randomPassword, 10);

        const newUser = await createUserAsync({
            first_name: googleUser.given_name || "Google",
            last_name: googleUser.family_name || "User",
            email,
            password_hash,
            role: "student",
        });

        const token = createToken(newUser);

        return res.status(201).json({
            message: "User registered successfully",
            user: {
                ...newUser,
                password_hash: undefined,
            },
            token,
        });
    } catch (error) {
        console.error("OAuth register failed:", error.message);
        return res.status(401).json({ message: "Invalid Google credentials" });
    }
};

export const userLogin = async (req, res) => {
    try {
        const email = String(req.body?.email ?? "").trim().toLowerCase();
        const password = String(req.body?.password ?? "");

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password required" });
        }

        const user = await getUserByEmailAsync(email);

        // Always respond the same for invalid login attempts.
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        if (!user.email_verified) {
            return res.status(403).json({
                message:
                    "Please verify your email before signing in. Check your inbox for the verification link.",
                needsVerification: true,
            });
        }

        const token = createToken(user);
        const { password_hash, ...safeUser } = user;

        return res.status(200).json({
            user: safeUser,
            token,
        });
    } catch (err) {
        console.error("Login failed:", err.message);
        return res.status(500).json({ message: "Server error" });
    }
};

export const userLoginOAuth = async (req, res) => {
    try {
        const accessToken = req.body?.access_token;

        if (!accessToken) {
            return res.status(400).json({ message: "Missing Google access token" });
        }

        const googleUser = await getGoogleUserInfo(accessToken);

        if (!googleUser || !googleUser.email || !googleUser.email_verified) {
            throw new Error("Invalid Google credentials");
        }

        const email = String(googleUser.email).trim().toLowerCase();

        const user = await getUserByEmailAsync(email);

        if (!user) {
            return res.status(401).json({ message: "Invalid Google credentials" });
        }

        const token = createToken(user);
        const { password_hash, ...safeUser } = user;

        return res.status(200).json({
            user: safeUser,
            token,
        });
    } catch (error) {
        console.error("OAuth login failed:", error.message);
        return res.status(401).json({ message: "Invalid Google credentials" });
    }
};

// Handles POST /auth/verify-email/:token
export const verifyEmail = (req, res) => {
    const token = String(req.params?.token ?? "");
    if (!token) {
        return res.status(400).json({ message: "Invalid or expired verification link" });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, getJWTSecret());
    } catch {
        return res.status(400).json({ message: "Invalid or expired verification link" });
    }
    if (decoded?.purpose !== "email_verify" || !decoded?.user_id) {
        return res.status(400).json({ message: "Invalid or expired verification link" });
    }

    setEmailVerified(decoded.user_id, (err, result) => {
        if (err) return res.status(500).json({ message: "Server error" });
        if (!result || result.affected === 0) {
            return res
                .status(400)
                .json({ message: "Invalid or expired verification link" });
        }
        return res.status(200).json({ message: "Email verified. You can sign in now." });
    });
};

// Handles POST /auth/resend-verification
export const resendVerification = async (req, res) => {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const generic = {
        message: "If that account exists and isn't verified, a new link has been sent.",
    };
    if (!email) return res.status(202).json(generic);

    try {
        const user = await getUserByEmailAsync(email);
        if (user && !user.email_verified) {
            await sendVerificationEmail(user.user_id, email);
        }
        return res.status(202).json(generic);
    } catch (err) {
        console.error("Resend verification failed:", err.message);
        return res.status(202).json(generic);
    }
};

export const userResetPassword = async (req, res) => {
    try {
        const token = String(req.params?.token ?? "");
        const password = String(req.body?.password ?? "");

        if (!token) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }

        if (!password || !isStrongPassword(password)) {
            return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
        }

        const tokenHash = hashToken(token);
        const tokenRecord = await getPasswordResetWithTokenAsync(tokenHash);

        if (!tokenRecord) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }

        if (!tokenRecord.expires_at) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }

        const expiresAt = new Date(tokenRecord.expires_at);
        if (Number.isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await updateUserPasswordAsync(tokenRecord.user_id, passwordHash);
        await deletePasswordResetTokenAsync(tokenHash);

        return res.status(200).json({ message: "Password reset successful" });
    } catch (err) {
        console.error("Reset password failed:", err.message);
        return res.status(500).json({ message: "Failed to reset password" });
    }
};

export const userForgotPassword = async (req, res) => {
    const email = String(req.body?.email ?? "").trim().toLowerCase();

    const genericResponse = {
        message: "If an account exists for this email, a reset link will be sent.",
    };

    if (!email) {
        return res.status(202).json(genericResponse);
    }

    try {
        const user = await getUserByEmailAsync(email);

        if (!user) {
            return res.status(202).json(genericResponse);
        }

        const existing = await getPasswordResetWithUserIDAsync(user.user_id);

        if (existing && existing.expires_at) {
            const expiresAt = new Date(existing.expires_at);

            if (!Number.isNaN(expiresAt.getTime()) && expiresAt > new Date()) {
                return res.status(202).json(genericResponse);
            }
        }

        if (existing) {
            // existing.token is ALREADY the stored SHA-256 hash — delete by it
            // directly. Hashing it again would match nothing and leave a stale
            // row that blocks the new INSERT (UNIQUE user_id) and locks the
            // user out of password reset.
            await deletePasswordResetTokenAsync(existing.token);
        }

        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = hashToken(rawToken);

        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await createPasswordResetTokenAsync(user.user_id, tokenHash, expiresAt);
        await sendResetPasswordMail(rawToken, email);

        return res.status(202).json(genericResponse);
    } catch (err) {
        console.error("Forgot password failed:", err.message);
        return res.status(202).json(genericResponse);
    }
};

export const sendResetPasswordMail = async (token, email) => {
    const resetLink = `${process.env.FRONTEND_URL || "http://localhost:4200"}/reset-password?token=${encodeURIComponent(token)}`;

    await sendMail(
        email,
        "Password Reset Request",
        `You requested a password reset. Use the following link to reset your password:\n\n${resetLink}\n\nThis token will expire in 10 minutes.`,
    );
};