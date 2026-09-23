import express from "express";
import helmet from "helmet";
import cors from "./src/config/cors.js";
import { requireAdmin, verifyToken } from "./src/middleware/auth.js";
import adminRouter from "./src/routes/adminRoute.js";
import authRouter from "./src/routes/authRoute.js";
import userRouter from "./src/routes/userRoute.js";

// The Express app with all middleware and routes, but NO side effects
// (no DB connect, no cron, no listen). server.js boots it; tests import it.
export const app = express();

// Security headers first: nosniff, frame-ancestors, HSTS, and it strips the
// x-powered-by: Express banner. Defaults suit a JSON API behind CORS.
app.use(helmet());

app.use(express.json());
app.use(cors);

// Cheap liveness probe — handy for tests and, later, deployment health checks.
app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/user", verifyToken, userRouter);
app.use("/admin", verifyToken, requireAdmin, adminRouter);

export default app;