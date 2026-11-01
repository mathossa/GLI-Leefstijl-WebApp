import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exportQuotesCsv } from "@/lib/admin-quote-domain.mjs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  if (!session.user.role?.split(",").includes("admin")) {
    return NextResponse.json({ error: "Geen toegang." }, { status: 403 });
  }
  const format = new URL(request.url).searchParams.get("format");
  if (format !== "json" && format !== "csv") {
    return NextResponse.json({ error: "Gebruik format=json of format=csv." }, { status: 400 });
  }
  // Do not expose deleted quotes or any private per-user custom text.
  const quotes = await prisma.motivationQuote.findMany({
    where: { deletedAt: null },
    orderBy: { id: "asc" },
    select: { id: true, text: true, category: true, isActive: true, origin: true },
  });
  const headersForDownload = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": `attachment; filename="mijn-leefstijl-quotes.${format}"`,
  };
  if (format === "csv") {
    return new Response(exportQuotesCsv(quotes), {
      headers: { ...headersForDownload, "Content-Type": "text/csv; charset=utf-8" },
    });
  }
  return new Response(JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), quotes }, null, 2), {
    headers: { ...headersForDownload, "Content-Type": "application/json; charset=utf-8" },
  });
}
