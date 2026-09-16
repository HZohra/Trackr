import express from "express";
import {
    userForgotPassword,
    userLogin,
    userLoginOAuth,
    userRegister,
    userRegisterOAuth,
    userResetPassword,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", userRegister);
router.post("/register/oauth", userRegisterOAuth);
router.post("/login", userLogin);
router.post("/login/oauth", userLoginOAuth);
router.post("/forgot-password", userForgotPassword);
router.post("/reset-password/:token", userResetPassword);

export default router;
