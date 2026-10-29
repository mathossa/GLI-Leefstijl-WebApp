-- Additive issue #6 migration; Better Auth identity tables remain unchanged.
CREATE TABLE "admin_mail_settings" (
    "id" TEXT NOT NULL DEFAULT 'smtp',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "host" VARCHAR(253) NOT NULL DEFAULT '',
    "port" INTEGER NOT NULL DEFAULT 587,
    "security" VARCHAR(10) NOT NULL DEFAULT 'STARTTLS',
    "username" VARCHAR(254),
    "encryptedPassword" TEXT,
    "fromName" VARCHAR(120) NOT NULL DEFAULT '',
    "fromEmail" VARCHAR(254) NOT NULL DEFAULT '',
    "lastTestAt" TIMESTAMP(3),
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "admin_mail_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "admin_mail_settings_valid_port" CHECK ("port" BETWEEN 1 AND 65535 AND "port" <> 25),
    CONSTRAINT "admin_mail_settings_tls_only" CHECK ("security" IN ('TLS','STARTTLS'))
);
CREATE TABLE "admin_audit" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_audit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "admin_audit_createdAt_idx" ON "admin_audit"("createdAt");
