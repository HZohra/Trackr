import dotenv from "dotenv";
import express from "express";
import cors from "./src/config/cors.js";
import { initDB } from "./src/config/db.js";

import {
    getJWTSecret,
    initJWTSecret,
    requireAdmin,
    verifyToken,
} from "./src/middleware/auth.js";
import adminRouter from "./src/routes/adminRoute.js";
import authRouter from "./src/routes/authRoute.js";
import userRouter from "./src/routes/userRoute.js";
// import activityRouter from "./src/routes/activityRoute.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Check database connection before starting the server
let dbConnected = await initDB();
if (dbConnected) {
    console.log("Database connection successful.");
} else {
    process.exit(1);
}

// Check JWT secret before starting the server
initJWTSecret();
const jwtSecret = getJWTSecret();
if (jwtSecret) {
    console.log("JWT secret is set.");
} else {
    console.error("JWT secret is not set.");
    process.exit(1);
}

// Setting
app.use(express.json());
app.use(cors);

// Routes
app.use("/auth", authRouter);
// Apply verifyToken to user and admin routes
app.use("/user", verifyToken, userRouter);
app.use("/admin", verifyToken, requireAdmin, adminRouter);

// Port — listen only after everything above is ready
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
