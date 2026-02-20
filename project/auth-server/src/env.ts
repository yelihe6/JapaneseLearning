import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // 逗号分隔的多个前端地址，例如 http://localhost:5173,http://localhost:5174
  FRONTEND_ORIGIN: z
    .string()
    .min(1)
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),

  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => v === 'true')
    .default('false' as const),
  COOKIE_DOMAIN: z.string().optional().default(''),

  DATABASE_URL: z.string().min(1),
});

export const env = envSchema.parse(process.env);
