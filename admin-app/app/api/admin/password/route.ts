import { changeAdminPassword, getAdminSession, verifyAdminPassword } from "@/app/admin-auth";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Acesso não autorizado." }, { status: 401 });
  const body = (await request.json()) as { currentPassword?: string; newPassword?: string };
  const currentPassword = body.currentPassword?.slice(0, 200) ?? "";
  const newPassword = body.newPassword?.slice(0, 200) ?? "";
  if (!(await verifyAdminPassword(session.username, currentPassword))) return Response.json({ error: "A senha atual está incorreta." }, { status: 400 });
  if (newPassword.length < 10) return Response.json({ error: "A nova senha precisa ter pelo menos 10 caracteres." }, { status: 400 });
  await changeAdminPassword(session.username, newPassword);
  return Response.json({ ok: true });
}
