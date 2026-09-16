import bcrypt from "bcrypt";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import nodemailer from "nodemailer";
import { createToken, getJWTSecret } from "../middleware/auth.js";
import {
    createPasswordResetToken,
    createUser,
    deletePasswordResetToken,
    getPasswordResetWithToken,
    getPasswordResetWithUserID,
    getUserByEmail,
    updateUserPassword,
} from "../model/userModel.js";

const JWT_SECRET = getJWTSecret();

// Handles POST /auth/register
// Creates a new user account. Note: we identify users by EMAIL, not
// username — our schema (users table) has no username column, only email
// with a UNIQUE constraint. Password is never stored as-is; bcrypt turns
// it into a one-way hash before it touches the database.

export const userRegister = async (req, res) => {
    console.log("Received registration request:", {
        email: req.body.email,
        role: req.body.role,
    });

    try {
        const { first_name, last_name, email, password } = req.body;

        const requestedRole = String(req.body.role || "student")
            .trim()
            .toLowerCase();

        if (!["student", "admin"].includes(requestedRole)) {
            return res.status(400).json({
                message: "Invalid account role",
            });
        }

        const role = requestedRole;

        if (!first_name || !last_name || !email || !password) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        getUserByEmail(email, async (err, existingUser) => {
            if (err) return res.status(500).json({ message: "Server error" });
            if (existingUser)
                return res
                    .status(409)
                    .json({ message: "Email already registered" });

            const password_hash = await bcrypt.hash(password, 10);

            createUser(
                { first_name, last_name, email, password_hash, role },
                (err, newUser) => {
                    if (err)
                        return res
                            .status(500)
                            .json({ message: "Failed to create user" });

                    const token = createToken(newUser);

                    res.status(201).json({
                        message: "User registered successfully",
                    });
                },
            );
        });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

export const userRegisterOAuth = async (req, res) => {
    const accessToken = req.body.access_token;

    try {
        const googleUser = await getGoogleUserInfo(accessToken);

        console.log("Google user info:", googleUser);

        if (!googleUser || !googleUser.email || !googleUser.email_verified) {
            throw new Error();
        }

        const first_name = googleUser.given_name;
        const last_name = googleUser.family_name;
        const email = googleUser.email;

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        getUserByEmail(email, async (err, existingUser) => {
            if (err) return res.status(500).json({ message: "Server error" });
            if (existingUser)
                return res
                    .status(409)
                    .json({ message: "Email already registered" });
        });

        res.status(200).json({ first_name, last_name, email });
    } catch (error) {
        res.status(401).json({ message: "Invalid Google credentials" });
    }
};

export const userLogin = (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
    }

    getUserByEmail(email, async (err, user) => {
        if (err) return res.status(500).json({ message: "Server error" });
        if (!user)
            return res.status(401).json({ message: "Invalid credentials" });

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match)
            return res.status(401).json({ message: "Invalid credentials" });

        const token = createToken(user);

        const { password_hash, ...safeUser } = user;
        res.status(200).json({ user: safeUser, token });
    });
};

async function getGoogleUserInfo(accessToken) {
    const client = new OAuth2Client();

    client.setCredentials({ access_token: accessToken });

    const response = await client.request({
        url: "https://www.googleapis.com/oauth2/v3/userinfo",
    });

    return response.data;
}

export const userLoginOAuth = async (req, res) => {
    const accessToken = req.body.access_token;

    try {
        const googleUser = await getGoogleUserInfo(accessToken);
        if (!googleUser || !googleUser.email || !googleUser.email_verified) {
            throw new Error();
        }

        getUserByEmail(googleUser.email, async (err, user) => {
            if (err) return res.status(500).json({ message: "Server error" });
            if (!user) {
                return res
                    .status(401)
                    .json({ message: "Invalid Google credentials" });
            }

            const token = createToken(user);
            const { password_hash, ...safeUser } = user;
            res.status(200).json({ user: safeUser, token });
        });
    } catch (error) {
        res.status(401).json({ message: "Invalid Google credentials" });
    }
};

export const userResetPassword = (req, res) => {
    const token = req.params.token;
    const password = req.body.password;
    console.log("Received token:", token);
    getPasswordResetWithToken(token, (err, tokenRecord) => {
        if (err || !tokenRecord) {
            return res
                .status(400)
                .json({ message: "Invalid or expired token" });
        }
        if (new Date(tokenRecord.expires_at) < new Date()) {
            return res
                .status(400)
                .json({ message: "Invalid or expired token" });
        }
        if (!password) {
            return res.status(400).json({ message: "Password is required" });
        }
        const passwordHash = bcrypt.hashSync(password, 10);
        updateUserPassword(tokenRecord.user_id, passwordHash, (err) => {
            if (err) {
                return res.status(500).json({
                    message: "Failed to reset password. Please try again.",
                });
            }
            deletePasswordResetToken(token, (err) => {
                if (err) {
                    console.error("Error deleting password reset token:", err);
                }
            });
            res.status(200).json({ message: "Password reset successful" });
        });
    });
};

export const userForgotPassword = (req, res) => {
    const { email } = req.body;
    getUserByEmail(email, (err, user) => {
        if (err || !user) {
            // For security reasons, we don't reveal whether the email exists or not
            return;
        }
        getPasswordResetWithUserID(user.user_id, (err, tokenRecord) => {
            if (err) {
                console.error(
                    "Error checking existing password reset token:",
                    err,
                );
                return;
            }
            if (user) {
                if (tokenRecord) {
                    if (
                        new Date(tokenRecord.expires_at) > new Date(Date.now())
                    ) {
                        console.log(
                            "Password reset token already exists and is valid.",
                        );
                        return;
                    } else {
                        deletePasswordResetToken(tokenRecord.token, (err) => {
                            if (err) {
                                console.error(
                                    "Error deleting old password reset token:",
                                    err,
                                );
                                return;
                            }
                        });
                    }
                }
                const token = crypto.randomBytes(64).toString("hex");
                const expiresAt = new Date(Date.now() + 1800000); // 0.5 hour from now
                createPasswordResetToken(
                    user.user_id,
                    token,
                    expiresAt,
                    (err) => {
                        if (err) {
                            console.error(
                                "Error inserting new password reset token:",
                                err,
                            );
                            return;
                        }
                        sendResetPasswordMail(token, email);
                    },
                );
            }
        });
    });
};

export const sendResetPasswordMail = (token, email) => {
    const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
            user: process.env.APP_EMAIL,
            pass: process.env.APP_EMAIL_PASSWORD,
        },
    });
    transporter.sendMail({
        from: process.env.APP_EMAIL,
        to: email,
        subject: "Password Reset Request",
        text: `You requested a password reset. Use the following links to reset your password: ${process.env.FRONTEND_URL}/pages/reset-password?token=${token}. This token will expire in 30 minutes.`,
    });
    console.log(`Password reset email sent to ${email} with token: ${token}`);
};

