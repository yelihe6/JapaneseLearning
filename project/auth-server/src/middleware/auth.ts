import { NextFunction, Request, Response } from 'express';
import { ACCESS_COOKIE } from '../auth/cookies';
import { verifyAccessToken } from '../auth/jwt';

export type AuthedRequest = Request & {
  user?: {
    id: string;
    email: string;
  };
};

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[ACCESS_COOKIE];
    if (!token) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
}
