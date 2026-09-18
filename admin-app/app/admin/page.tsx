import { chatGPTSignOutPath, requireChatGPTUser } from "@/app/chatgpt-auth";
import { AdminPanel } from "./admin-panel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");
  return <AdminPanel userName={user.displayName} signOutHref={chatGPTSignOutPath("/")} />;
}
