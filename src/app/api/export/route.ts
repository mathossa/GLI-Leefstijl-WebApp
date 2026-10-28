import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { exportPersonalData } from "@/lib/export-personal-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response(JSON.stringify({ error: "Niet ingelogd" }), {
    status: 401, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
  const data = await exportPersonalData(session.user.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mijn-leefstijl-export.json"',
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
