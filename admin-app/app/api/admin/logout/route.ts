import { destroyAdminSession } from "@/app/admin-auth";

export async function POST() {
  await destroyAdminSession();
  return Response.json({ ok: true });
}
