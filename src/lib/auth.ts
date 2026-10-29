import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { prisma } from "./prisma";
import { deleteAllUserPhotoFiles } from "./user-photo-cleanup";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // Enforced at the API; hiding sign-up UI is not sufficient.
    requireEmailVerification: false, // SMTP will be configured in issue #6.
    minPasswordLength: 12,
  },
  plugins: [admin()],
  databaseHooks: {
    user: {
      delete: {
        // Protect administrator accounts for *all* Better Auth deletion routes,
        // including direct calls to the plugin endpoint that bypass our UI.
        before: async (user) => {
          const target = await prisma.user.findUnique({
            where: { id: user.id }, select: { role: true },
          });
          return !(target?.role?.split(",").includes("admin"));
        },
        after: async (user) => {
          try {
            await deleteAllUserPhotoFiles(user.id);
          } catch {
            // A file-system failure must not resurrect a deleted account.
            // Warn operators without disclosing user identity or path.
            console.error("[user-deletion] private file cleanup failed; operator review required");
          }
        },
      },
    },
  },
});
