require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const animalRoutes = require("./routes/animal.routes");
const requestRoutes = require("./routes/request.routes");
const notificationRoutes = require("./routes/notification.routes");

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

app.use("/api/animal", animalRoutes);
app.use("/api/request", requestRoutes);
app.use("/api/notification", notificationRoutes);

app.get("/", (req, res) => res.send("Animal service is running"));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Animal service listening on port ${PORT}`));