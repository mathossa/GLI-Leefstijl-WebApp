import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const headers = {
    "Cache-Control": "no-store, max-age=0",
    "X-Robots-Tag": "noindex",
    "Content-Type": "text/plain; charset=utf-8",
  };
  try {
    // Readiness includes a real database query, with no disclosure of user data.
    await prisma.$queryRaw`SELECT 1`;
    return new NextResponse("ok\n", { status: 200, headers });
  } catch {
    return new NextResponse("unavailable\n", { status: 503, headers });
  }
}
