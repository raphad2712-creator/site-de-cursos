import { asc, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { managedCourses } from "@/db/schema";
import { DEFAULT_COURSES } from "@/app/course-data";

export type PublicCourse = { id: string; name: string; category: string; image: string };

export const defaultCourseRows = () => DEFAULT_COURSES.map(([name, category, image], index) => ({
  id: `default-${String(index + 1).padStart(3, "0")}`,
  name,
  category,
  imageUrl: image,
  sortOrder: index,
  active: true,
  updatedAt: "",
}));

export async function listStoredCourses() {
  return getDb().select().from(managedCourses).orderBy(asc(managedCourses.sortOrder));
}

export async function ensureDefaultCourses() {
  const [result] = await getDb().select({ count: sql<number>`count(*)` }).from(managedCourses);
  if (Number(result?.count ?? 0) === 0) {
    await getDb().insert(managedCourses).values(defaultCourseRows()).onConflictDoNothing();
  }
}

export function toPublicCourse(course: { id: string; name: string; category: string; imageUrl: string }): PublicCourse {
  return { id: course.id, name: course.name, category: course.category, image: course.imageUrl };
}
