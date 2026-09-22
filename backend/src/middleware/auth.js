import jwt from "jsonwebtoken";

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
    const token = jwt.sign(
        { user_id: user.user_id, role: user.role },
        JWT_SECRET,
        { expiresIn: "1h" },
    );
    return token;
};

export const verifyToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // "Bearer <token>"

    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res
                .status(403)
                .json({ message: "Invalid or expired token" });
        }
        req.user = decoded;
        next();
    });
};

export const requireAdmin = (req, res, next) => {
    if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
    }
    next();
};