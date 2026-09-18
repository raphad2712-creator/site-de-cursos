import { redirect } from "next/navigation";
import { getAdminSession } from "@/app/admin-auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getAdminSession()) redirect("/admin");
  return <LoginForm />;
}
