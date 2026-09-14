// JWT 认证（无状态，适配 Vercel Serverless）
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { getDB, safeUser, type User } from './_db';

const JWT_SECRET = process.env.JWT_SECRET || 'qingke-secret-2026';

export function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

async function getUserFromRequest(req: Request): Promise<User | undefined> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  if (!token) return undefined;
  const payload = verifyToken(token);
  if (!payload) return undefined;
  const db = await getDB();
  return db.users.find((u) => u.id === payload.userId);
}

// 必须登录
export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ message: '请先登录' });
  }
  (req as any).user = user;
  next();
}

// 必须是管理员
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ message: '请先登录' });
  }
  if (user.role !== 'admin') {
    return res.status(403).json({ message: '需要管理员权限' });
  }
  (req as any).user = user;
  next();
}

// 可选鉴权：登录了就挂上 user，没登录也放行
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const user = await getUserFromRequest(req);
  if (user) (req as any).user = user;
  next();
}

export function getUserId(req: Request): string | undefined {
  return (req as any).user?.id || (req.body && req.body.user_id) || (req.query.user_id as string);
}

export { safeUser };
