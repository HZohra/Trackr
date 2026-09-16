import cors from "cors";

const allowedOrigins = ["http://localhost:3000", "https://yourfrontend.com"];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
};

export default cors(corsOptions);
