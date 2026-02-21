import { randomUUID } from 'crypto';
import { Router } from 'express';
import svgCaptcha from 'svg-captcha';
import { z } from 'zod';
import { prisma } from '../prisma';
import { hashPassword, randomToken, sha256, verifyPassword } from '../auth/crypto';
import { ACCESS_COOKIE, REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from '../auth/cookies';
import { signAccessToken, verifyAccessToken } from '../auth/jwt';

const router = Router();

// 验证码内存存储，captchaId -> { text, expiresAt }
const captchaStore = new Map<string, { text: string; expiresAt: number }>();
const CAPTCHA_TTL_MS = 5 * 60 * 1000; // 5 分钟

function cleanupExpiredCaptcha() {
  const now = Date.now();
  for (const [id, entry] of captchaStore.entries()) {
    if (entry.expiresAt < now) captchaStore.delete(id);
  }
}

router.get('/check-email', async (req, res) => {
  const email = typeof req.query.email === 'string' ? req.query.email.trim() : '';
  if (!email) {
    return res.status(400).json({ taken: false });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  return res.json({ taken: !!existing });
});

router.get('/captcha', (req, res) => {
  cleanupExpiredCaptcha();
  const captcha = svgCaptcha.create({
    size: 4,
    ignoreChars: '0oO1ilI',
    noise: 2,
  });
  const id = randomUUID();
  captchaStore.set(id, {
    text: captcha.text.toLowerCase(),
    expiresAt: Date.now() + CAPTCHA_TTL_MS,
  });
  res.json({ captchaId: id, image: captcha.data });
});

// 8-16 位，必须包含数字、英文字母、特殊字符
function isPasswordStrong(p: string): boolean {
  if (p.length < 8 || p.length > 16) return false;
  if (!/\d/.test(p)) return false;
  if (!/[a-zA-Z]/.test(p)) return false;
  if (!/[^a-zA-Z0-9]/.test(p)) return false;
  return true;
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(16),
  captchaId: z.string().uuid(),
  captchaAnswer: z.string().min(1).max(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  }

  const { email, password, captchaId, captchaAnswer } = parsed.data;

  const captchaEntry = captchaStore.get(captchaId);
  captchaStore.delete(captchaId);
  if (!captchaEntry || captchaEntry.expiresAt < Date.now()) {
    return res.status(400).json({ error: 'invalid_captcha' });
  }
  if (captchaEntry.text !== captchaAnswer.trim().toLowerCase()) {
    return res.status(400).json({ error: 'invalid_captcha' });
  }

  if (!isPasswordStrong(password)) {
    return res.status(400).json({ error: 'weak_password' });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'email_taken' });
  }

  const passwordHash = await hashPassword(password);
  // 新用户默认昵称：用户 + 用户 id 前 8 位
  const tempUser = await prisma.user.create({
    data: { email, passwordHash, displayName: null },
    select: { id: true },
  });
  const defaultDisplayName = `用户${tempUser.id.slice(0, 8)}`;
  const user = await prisma.user.update({
    where: { id: tempUser.id },
    data: { displayName: defaultDisplayName },
    select: { id: true, email: true, displayName: true, createdAt: true },
  });

  return res.json({ user });
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'user_not_found' });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: 'wrong_password' });
  }

  const payload = { sub: user.id, email: user.email };
  const accessToken = signAccessToken(payload);

  const refreshRaw = randomToken();
  const refreshHash = sha256(refreshRaw);
  await prisma.refreshToken.create({
    data: {
      tokenHash: refreshHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  setAuthCookies(res, accessToken, refreshRaw);
  return res.json({
    user: { id: user.id, email: user.email, displayName: user.displayName, createdAt: user.createdAt },
  });
});

router.post('/refresh', async (req, res) => {
  const refreshRaw = req.cookies?.[REFRESH_COOKIE];
  if (!refreshRaw) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const refreshHash = sha256(refreshRaw);
  const tokenRow = await prisma.refreshToken.findUnique({ where: { tokenHash: refreshHash } });
  if (!tokenRow || tokenRow.revokedAt || tokenRow.expiresAt.getTime() < Date.now()) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const user = await prisma.user.findUnique({ where: { id: tokenRow.userId } });
  if (!user) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // rotate refresh token
  await prisma.refreshToken.update({
    where: { tokenHash: refreshHash },
    data: { revokedAt: new Date() },
  });

  const payload = { sub: user.id, email: user.email };
  const accessToken = signAccessToken(payload);

  const newRefreshRaw = randomToken();
  const newRefreshHash = sha256(newRefreshRaw);
  await prisma.refreshToken.create({
    data: {
      tokenHash: newRefreshHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  setAuthCookies(res, accessToken, newRefreshRaw);
  return res.json({ ok: true });
});

router.post('/logout', async (req, res) => {
  const refreshRaw = req.cookies?.[REFRESH_COOKIE];
  if (refreshRaw) {
    const refreshHash = sha256(refreshRaw);
    await prisma.refreshToken.updateMany({
      where: { tokenHash: refreshHash },
      data: { revokedAt: new Date() },
    });
  }

  clearAuthCookies(res);
  return res.json({ ok: true });
});

// 昵称：1-20 字符，仅允许字母、数字、空格及 - _ .
const DISPLAY_NAME_REGEX = /^[\p{L}\p{N}\s\-_\.]+$/u;
const updateMeSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'invalid_display_name')
    .max(20, 'invalid_display_name')
    .regex(DISPLAY_NAME_REGEX, 'invalid_display_name'),
});

// 未登录时也返回 200 + { user: null }，避免前端出现 401（用于首屏鉴权检查）
router.get('/me', async (req, res) => {
  const access = req.cookies?.[ACCESS_COOKIE];
  if (!access) return res.status(200).json({ user: null });

  try {
    const payload = verifyAccessToken(access);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, displayName: true, createdAt: true },
    });
    return res.json({ user: user ?? null });
  } catch {
    return res.status(200).json({ user: null });
  }
});

router.patch('/me', async (req, res) => {
  const access = req.cookies?.[ACCESS_COOKIE];
  if (!access) return res.status(401).json({ error: 'unauthorized' });

  const parsed = updateMeSchema.safeParse(req.body);
  if (!parsed.success) {
    const err = parsed.error.flatten();
    const displayNameErr = err.fieldErrors.displayName?.[0];
    const code = typeof displayNameErr === 'string' && displayNameErr === 'invalid_display_name' ? 'invalid_display_name' : 'invalid_input';
    return res.status(400).json({ error: code, details: err });
  }

  try {
    const payload = verifyAccessToken(access);
    const user = await prisma.user.update({
      where: { id: payload.sub },
      data: { displayName: parsed.data.displayName },
      select: { id: true, email: true, displayName: true, createdAt: true },
    });
    return res.json({ user });
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
});

export default router;
