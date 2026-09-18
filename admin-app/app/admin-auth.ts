import { cookies } from "next/headers";
import { env } from "cloudflare:workers";
import { and, eq, gt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { adminCredentials, adminSessions, loginAttempts } from "@/db/schema";

const COOKIE_NAME = "gambeti_admin_session";
const SESSION_SECONDS = 60 * 60 * 12;
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MINUTES = 15;

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string) {
  if (!/^[a-f0-9]+$/i.test(value) || value.length % 2) return new Uint8Array();
  return new Uint8Array(value.match(/.{2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? []);
}

async function sha256(value: string) {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}

async function passwordHash(password: string, saltHex: string, iterations: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(saltHex), iterations }, key, 256);
  return bytesToHex(new Uint8Array(bits));
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

async function credentialsFor(username: string) {
  const [stored] = await getDb().select().from(adminCredentials).where(eq(adminCredentials.username, username)).limit(1);
  if (stored) return stored;
  const envUsername = env.ADMIN_USERNAME ?? "";
  if (username !== envUsername || !env.ADMIN_PASSWORD_HASH || !env.ADMIN_PASSWORD_SALT) return null;
  return {
    id: 0,
    username: envUsername,
    passwordHash: env.ADMIN_PASSWORD_HASH,
    passwordSalt: env.ADMIN_PASSWORD_SALT,
    iterations: Number(env.ADMIN_PASSWORD_ITERATIONS ?? "210000"),
    updatedAt: "",
  };
}

export async function verifyAdminPassword(username: string, password: string) {
  const credentials = await credentialsFor(username);
  if (!credentials) return false;
  const actual = await passwordHash(password, credentials.passwordSalt, credentials.iterations);
  return safeEqual(actual, credentials.passwordHash);
}

export async function createAdminSession(username: string) {
  const token = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  await getDb().insert(adminSessions).values({ tokenHash, username, expiresAt });
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: SESSION_SECONDS });
}

export async function getAdminSession() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const tokenHash = await sha256(token);
  const [session] = await getDb().select().from(adminSessions).where(and(eq(adminSessions.tokenHash, tokenHash), gt(adminSessions.expiresAt, new Date().toISOString()))).limit(1);
  return session ?? null;
}

export async function destroyAdminSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) await getDb().delete(adminSessions).where(eq(adminSessions.tokenHash, await sha256(token)));
  jar.set(COOKIE_NAME, "", { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 0 });
}

export async function changeAdminPassword(username: string, password: string) {
  const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(18)));
  const iterations = 210000;
  const hash = await passwordHash(password, salt, iterations);
  await getDb().insert(adminCredentials).values({ id: 1, username, passwordHash: hash, passwordSalt: salt, iterations })
    .onConflictDoUpdate({ target: adminCredentials.id, set: { username, passwordHash: hash, passwordSalt: salt, iterations, updatedAt: new Date().toISOString() } });
}

export async function loginAttemptKey(request: Request) {
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return sha256(ip);
}

export async function isRateLimited(key: string) {
  const since = new Date(Date.now() - ATTEMPT_WINDOW_MINUTES * 60 * 1000).toISOString();
  const [row] = await getDb().select({ count: sql<number>`count(*)` }).from(loginAttempts).where(and(eq(loginAttempts.attemptKey, key), gt(loginAttempts.failedAt, since)));
  return Number(row?.count ?? 0) >= MAX_ATTEMPTS;
}

export async function recordLoginFailure(key: string) {
  await getDb().insert(loginAttempts).values({ attemptKey: key });
}

export async function clearLoginFailures(key: string) {
  await getDb().delete(loginAttempts).where(eq(loginAttempts.attemptKey, key));
}
