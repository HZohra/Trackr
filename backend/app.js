import express from "express";
import cors from "./src/config/cors.js";
import { requireAdmin, verifyToken } from "./src/middleware/auth.js";
import adminRouter from "./src/routes/adminRoute.js";
import authRouter from "./src/routes/authRoute.js";
import userRouter from "./src/routes/userRoute.js";

// The Express app with all middleware and routes, but NO side effects
// (no DB connect, no cron, no listen). server.js boots it; tests import it.
export const app = express();

app.use(express.json());
app.use(cors);

// Cheap liveness probe — handy for tests and, later, deployment health checks.
app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/user", verifyToken, userRouter);
app.use("/admin", verifyToken, requireAdmin, adminRouter);

export default app;