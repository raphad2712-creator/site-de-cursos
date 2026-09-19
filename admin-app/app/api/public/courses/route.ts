import { defaultCourseRows, listStoredCourses, toPublicCourse } from "@/app/course-store";

const allowedOrigin = "https://raphad2712-creator.github.io";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  Vary: "Origin",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  try {
    const stored = await listStoredCourses();
    const rows = stored.length ? stored.filter((course) => course.active) : defaultCourseRows();
    return Response.json({ courses: rows.map(toPublicCourse) }, {
      headers: { ...corsHeaders, "Cache-Control": "public, max-age=30, stale-while-revalidate=120" },
    });
  } catch {
    return Response.json({ courses: defaultCourseRows().map(toPublicCourse) }, {
      headers: { ...corsHeaders, "Cache-Control": "public, max-age=30" },
    });
  }
}
