import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { certificates } from "@/db/schema";
import { getAdminSession } from "@/app/admin-auth";

const clean = (value: unknown, max = 160) => typeof value === "string" ? value.trim().slice(0, max) : "";

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Erro inesperado";
  return message.includes("no such table") ? "O banco de certificados ainda não está disponível." : "Não foi possível acessar os certificados agora.";
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Acesso não autorizado." }, { status: 401 });
  try {
    const rows = await getDb().select().from(certificates).orderBy(desc(certificates.createdAt)).limit(100);
    return Response.json({ certificates: rows });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Acesso não autorizado." }, { status: 401 });
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const studentName = clean(body.studentName), cpf = clean(body.cpf, 20), course = clean(body.course);
    const workload = clean(body.workload, 30), completionDate = clean(body.completionDate, 10);
    const instructor = clean(body.instructor) || "Gambeti Engenharia e Treinamentos";
    if (!studentName || !cpf || !course || !workload || !completionDate) return Response.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 });
    const code = `GAM-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const [created] = await getDb().insert(certificates).values({ id: crypto.randomUUID(), ownerId: session.username, studentName, cpf, course, workload, completionDate, instructor, certificateCode: code }).returning();
    return Response.json({ certificate: created }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Acesso não autorizado." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return Response.json({ error: "Certificado inválido." }, { status: 400 });
  await getDb().delete(certificates).where(eq(certificates.id, id));
  return Response.json({ ok: true });
}
