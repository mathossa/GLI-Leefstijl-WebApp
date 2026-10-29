import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { exportPersonalData } from "@/lib/export-personal-data";
import { createPersonalPdf } from "@/lib/pdf-personal-report";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Niet ingelogd", {
    status: 401, headers: { "Cache-Control": "no-store" },
  });
  const data = await exportPersonalData(session.user.id);
  const pdf = await createPersonalPdf(data, session.user.name);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="mijn-leefstijl-overzicht.pdf"',
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
