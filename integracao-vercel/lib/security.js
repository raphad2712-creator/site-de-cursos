import { createHmac, timingSafeEqual, scryptSync } from 'node:crypto';
export const COOKIE = '__Host-gambeti_integracao';
const AGE = 3600;
export function configured(env) {
  try {
    const origin = new URL(env.APP_ORIGIN);
    return origin.origin === env.APP_ORIGIN && origin.protocol === 'https:' &&
      /^[a-f0-9]{32}:[a-f0-9]{64}$/.test(env.PANEL_KEY_HASH || '') &&
      /^[a-f0-9]{64}$/.test(env.SESSION_SECRET || '');
  } catch { return false; }
}
export function equal(a, b) {
  const left = Buffer.from(String(a)), right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}
export function validKey(key, env) {
  if (typeof key !== 'string' || !/^[\w-]{32}$/.test(key)) return false;
  const [salt, hash] = env.PANEL_KEY_HASH.split(':');
  return equal(scryptSync(key, salt, 32).toString('hex'), hash);
}
export function sign(data, env, purpose, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ data, purpose, exp: Math.floor(now / 1000) + AGE })).toString('base64url');
  const mac = createHmac('sha256', env.SESSION_SECRET).update(payload + env.PANEL_KEY_HASH).digest('base64url');
  return `${payload}.${mac}`;
}
export function verify(token, env, purpose, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 4096) return null;
  const [payload, mac, extra] = token.split('.');
  if (!payload || !mac || extra) return null;
  const expected = createHmac('sha256', env.SESSION_SECRET).update(payload + env.PANEL_KEY_HASH).digest('base64url');
  if (!equal(mac, expected)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return value.purpose === purpose && Number.isFinite(value.exp) && value.exp > now / 1000 ? value.data : null;
  } catch { return null; }
}
export function session(req, env) {
  const cookie = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(COOKIE + '='));
  return cookie ? verify(cookie.slice(COOKIE.length + 1), env, 'session') : null;
}
export function sessionCookie(value, age = AGE) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
}
