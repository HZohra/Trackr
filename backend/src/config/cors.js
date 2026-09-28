import cors from "cors";

const localOrigins = [
  "http://localhost:3000",
  "http://localhost:4200",
];

const corsOptions = {
  origin: function (origin, callback) {
    const frontendUrl = process.env.FRONTEND_URL;

    const allowedOrigins = [
      ...localOrigins,
      frontendUrl,
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

export default cors(corsOptions);