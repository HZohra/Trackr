import express from "express";
import {
    resendVerification,
    userForgotPassword,
    userLogin,
    userRegister,
    userResetPassword,
    verifyEmail,
} from "../controllers/authController.js";
import { authLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

// Every auth endpoint is a brute-force / abuse target — apply the strict limiter
// to the whole router.
router.use(authLimiter);

router.post("/register", userRegister);
router.post("/login", userLogin);
router.post("/forgot-password", userForgotPassword);
router.post("/reset-password/:token", userResetPassword);
router.post("/verify-email/:token", verifyEmail);
router.post("/resend-verification", resendVerification);

// Google OAuth endpoints intentionally NOT mounted (unvalidated audience =
// account-takeover vector). Controllers remain in authController.js for when
// "Sign in with Google" is built properly. See the note there.

export default router;