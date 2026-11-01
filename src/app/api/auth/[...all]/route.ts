import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { isIP } from "node:net";

const handlers = toNextJsHandler(auth);

function proxyIpUnavailable(request: Request) {
  // NPM sets this header. Better Auth skips throttling without a resolved IP.
  return process.env.NODE_ENV === "production" && !isIP(request.headers.get("x-real-ip") ?? "");
}

export async function GET(request: Request) {
  if (proxyIpUnavailable(request)) return unavailable();
  return handlers.GET(request);
}

export async function POST(request: Request) {
  if (proxyIpUnavailable(request)) return unavailable();
  return handlers.POST(request);
}

function unavailable() {
  return Response.json({ error: "Client IP ontbreekt; controleer de reverse proxy." }, {
    status: 503, headers: { "Cache-Control": "no-store" },
  });
}
