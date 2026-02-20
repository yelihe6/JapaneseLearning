import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './env';
import authRoutes from './routes/auth';

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: (origin, cb) => {
      // 无 origin 时多为同源或代理请求（如 Postman、Vite 代理），允许
      if (!origin) return cb(null, true);
      if (env.FRONTEND_ORIGIN.includes(origin)) return cb(null, true);
      cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);

app.listen(env.PORT, () => {
  console.log(`Auth server listening on http://localhost:${env.PORT}`);
});
