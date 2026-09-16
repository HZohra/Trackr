import crypto from "crypto";
import fs from "fs";
import jwt from "jsonwebtoken";

let JWT_SECRET = "";

export const initJWTSecret = () => {
    let envContent = "";

    if (fs.existsSync(".env")) {
        envContent = fs.readFileSync(".env", "utf8");
    }

    const newSecret = crypto.randomBytes(64).toString("hex");

    // Replace existing JWT_SECRET
    if (/^JWT_SECRET=/m.test(envContent)) {
        JWT_SECRET = envContent.match(/^JWT_SECRET=(.*)$/m)[1];
        if (
            !JWT_SECRET ||
            JWT_SECRET === "GENERATE_A_SECRET_KEY_FOR_JWT" ||
            JWT_SECRET.length < 128
        ) {
            envContent = envContent.replace(
                /^JWT_SECRET=.*$/m,
                `JWT_SECRET=${newSecret}`,
            );
            JWT_SECRET = newSecret;
        }
    } else {
        // Add it if it does not exist
        envContent += `\nJWT_SECRET=${newSecret}\n`;
        JWT_SECRET = newSecret;
    }

    fs.writeFileSync(".env", envContent);
};

export const getJWTSecret = () => {
    return JWT_SECRET;
};

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
