require('dotenv').config(); // loads User_service/.env (CWD when running npm scripts)

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const userRoutes = require('./routes/user.routes');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // allow REST clients / server-to-server (no Origin header)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json());

connectDB();

app.use('/api/users', userRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'user-service' }));
app.get('/', (_req, res) => res.send('User service running'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`User service listening on port ${PORT}`));
