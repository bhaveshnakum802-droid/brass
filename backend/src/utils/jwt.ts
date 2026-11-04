import jwt from 'jsonwebtoken';

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET)) {
  throw new Error('FATAL SECURITY ERROR: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be configured in production!');
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'local_development_only_secret_key_983749823749823';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'local_development_only_refresh_secret_key_8372648234';
const ACCESS_EXPIRES = (process.env.JWT_ACCESS_EXPIRES || '1h') as jwt.SignOptions['expiresIn'];
const REFRESH_EXPIRES = (process.env.JWT_REFRESH_EXPIRES || '7d') as jwt.SignOptions['expiresIn'];

export interface JwtPayload {
  id: string;
  username: string;
  role: string;
}

export function getAccessSecret(): string {
  return ACCESS_SECRET;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}
