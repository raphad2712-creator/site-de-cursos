import { clearLoginFailures, createAdminSession, isRateLimited, loginAttemptKey, recordLoginFailure, verifyAdminPassword } from "@/app/admin-auth";

export async function POST(request: Request) {
  const key = await loginAttemptKey(request);
  if (await isRateLimited(key)) return Response.json({ error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." }, { status: 429 });
  const body = (await request.json()) as { username?: string; password?: string };
  const username = body.username?.trim().slice(0, 80) ?? "";
  const password = body.password?.slice(0, 200) ?? "";
  if (!username || !password || !(await verifyAdminPassword(username, password))) {
    await recordLoginFailure(key);
    return Response.json({ error: "Usuário ou senha incorretos." }, { status: 401 });
  }
  await clearLoginFailures(key);
  await createAdminSession(username);
  return Response.json({ ok: true });
}
