import { redirect } from "next/navigation";
import { getAdminSession } from "@/app/admin-auth";
import { AdminPanel } from "./admin-panel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return <AdminPanel userName={session.username} />;
}
