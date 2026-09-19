import { asc, eq, max } from "drizzle-orm";
import { getAdminSession } from "@/app/admin-auth";
import { defaultCourseRows, ensureDefaultCourses } from "@/app/course-store";
import { getDb } from "@/db";
import { managedCourses } from "@/db/schema";

const clean = (value: unknown, maxLength: number) => typeof value === "string" ? value.trim().slice(0, maxLength) : "";

function fields(body: Record<string, unknown>) {
  const name = clean(body.name, 220);
  const category = clean(body.category, 160);
  const imageUrl = clean(body.imageUrl, 1000);
  if (!name || !category || !imageUrl) throw new Error("Preencha nome, categoria e URL da imagem.");
  try {
    const url = new URL(imageUrl);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
  } catch {
    throw new Error("Informe uma URL de imagem válida.");
  }
  return { name, category, imageUrl };
}

async function authorized() {
  return Boolean(await getAdminSession());
}

export async function GET() {
  if (!(await authorized())) return Response.json({ error: "Acesso não autorizado." }, { status: 401 });
  try {
    const stored = await getDb().select().from(managedCourses).orderBy(asc(managedCourses.sortOrder));
    return Response.json({ courses: stored.length ? stored : defaultCourseRows() });
  } catch {
    return Response.json({ error: "Não foi possível carregar os cursos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await authorized())) return Response.json({ error: "Acesso não autorizado." }, { status: 401 });
  try {
    const values = fields(await request.json() as Record<string, unknown>);
    await ensureDefaultCourses();
    const [last] = await getDb().select({ value: max(managedCourses.sortOrder) }).from(managedCourses);
    const [course] = await getDb().insert(managedCourses).values({ id: crypto.randomUUID(), ...values, sortOrder: Number(last?.value ?? -1) + 1 }).returning();
    return Response.json({ course }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível criar o curso." }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  if (!(await authorized())) return Response.json({ error: "Acesso não autorizado." }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = clean(body.id, 80);
    if (!id) return Response.json({ error: "Curso inválido." }, { status: 400 });
    const values = fields(body);
    await ensureDefaultCourses();
    const [course] = await getDb().update(managedCourses).set({ ...values, updatedAt: new Date().toISOString() }).where(eq(managedCourses.id, id)).returning();
    if (!course) return Response.json({ error: "Curso não encontrado." }, { status: 404 });
    return Response.json({ course });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível editar o curso." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!(await authorized())) return Response.json({ error: "Acesso não autorizado." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return Response.json({ error: "Curso inválido." }, { status: 400 });
  await ensureDefaultCourses();
  await getDb().delete(managedCourses).where(eq(managedCourses.id, id));
  return Response.json({ ok: true });
}
