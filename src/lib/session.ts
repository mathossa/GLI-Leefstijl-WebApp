import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  // Better Auth Admin supports comma-separated roles.
  if (!session.user.role?.split(",").includes("admin")) notFound();
  return session;
}
