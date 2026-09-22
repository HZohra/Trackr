import express from "express";
import {
    userForgotPassword,
    userLogin,
    userLoginOAuth,
    userRegister,
    userRegisterOAuth,
    userResetPassword,
} from "../controllers/authController.js";
import { authLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

// Every auth endpoint is a brute-force / abuse target — apply the strict limiter
// to the whole router.
router.use(authLimiter);

router.post("/register", userRegister);
router.post("/register/oauth", userRegisterOAuth);
router.post("/login", userLogin);
router.post("/login/oauth", userLoginOAuth);
router.post("/forgot-password", userForgotPassword);
router.post("/reset-password/:token", userResetPassword);

export default router;