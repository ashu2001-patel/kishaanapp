require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const connectDB  = require("./config/db");
const { seedDefaults } = require("./controllers/config.controller");

const paymentRoutes = require("./routes/payment.routes");
const usageRoutes   = require("./routes/usage.routes");
const configRoutes  = require("./routes/config.routes");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",").map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json());

connectDB().then(() => {
  // Seed default feature configs once DB is ready
  seedDefaults().catch(console.error);
});

app.use("/api/payment", paymentRoutes);
app.use("/api/usage",   usageRoutes);
app.use("/api/config",  configRoutes);

app.get("/health", (_req, res) => res.json({ status: "ok", service: "payment-service" }));
app.get("/",       (_req, res) => res.send("Payment service running"));

const PORT = process.env.PORT || 5004;
app.listen(PORT, () => console.log(`Payment service on port ${PORT}`));
