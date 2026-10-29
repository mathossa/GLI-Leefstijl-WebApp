"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { saveSmtpSettings, sendSmtpTest, type SmtpActionState } from "@/app/admin/actions";

type Props = { settings: {
  enabled: boolean; host: string; port: number; security: string; username: string;
  hasPassword: boolean; fromName: string; fromEmail: string; lastTestAt: string | null;
} | null };
const initial: SmtpActionState = { status: "idle", message: "" };
const field = "h-11 w-full min-w-0 rounded-xl border border-border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Bezig…" : children}</Button>;
}
export function AdminSmtpForm({ settings }: Props) {
  const [saved, saveAction] = useActionState(saveSmtpSettings, initial);
  const [tested, testAction] = useActionState(sendSmtpTest, initial);
  const password = useRef<HTMLInputElement>(null);
  useEffect(() => { if (saved.status === "success" && password.current) password.current.value = ""; }, [saved]);
  return (
    <section aria-labelledby="smtp-heading" className="space-y-4">
      <div><h2 id="smtp-heading" className="text-xl font-semibold">SMTP-relay</h2><p className="mt-1 text-sm text-muted-foreground">Alleen via een ingestelde SMTP-server; geen eigen MX-verzending of poort 25.</p></div>
      <form action={saveAction} className="space-y-4">
        <label className="flex items-center gap-3 text-sm font-medium"><input name="enabled" type="checkbox" defaultChecked={settings?.enabled ?? false} className="size-4 accent-primary"/>Relay inschakelen</label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium">SMTP-host<input className={field} name="host" defaultValue={settings?.host ?? ""} maxLength={253} placeholder="smtp.voorbeeld.nl" autoComplete="off"/></label>
          <label className="space-y-1 text-sm font-medium">Poort<input className={field} name="port" type="number" min="1" max="65535" defaultValue={settings?.port ?? 587} required/></label>
          <label className="space-y-1 text-sm font-medium">Verbinding
            <select className={field} name="security" defaultValue={settings?.security ?? "STARTTLS"}><option value="STARTTLS">STARTTLS (meestal 587)</option><option value="TLS">TLS direct (meestal 465)</option></select>
          </label>
          <label className="space-y-1 text-sm font-medium">SMTP-gebruikersnaam (optioneel)<input className={field} name="username" maxLength={254} defaultValue={settings?.username ?? ""} autoComplete="off"/></label>
          <label className="space-y-1 text-sm font-medium">SMTP-wachtwoord<input className={field} name="password" ref={password} type="password" maxLength={1024} autoComplete="new-password" placeholder={settings?.hasPassword ? "Leeg = wachtwoord behouden" : "Alleen bij authenticatie"}/></label>
          <label className="space-y-1 text-sm font-medium">Afzendernaam<input className={field} name="fromName" maxLength={120} defaultValue={settings?.fromName ?? "Mijn Leefstijl"}/></label>
          <label className="space-y-1 text-sm font-medium">Afzenderadres<input className={field} name="fromEmail" type="email" maxLength={254} defaultValue={settings?.fromEmail ?? ""} placeholder="noreply@voorbeeld.nl"/></label>
        </div>
        <p className="text-xs text-muted-foreground">Leeg wachtwoord behoudt het bestaande geheim. Haal de gebruikersnaam weg om SMTP-authenticatie uit te zetten. TLS-certificaatcontrole staat aan.</p>
        {saved.message && <p role="status" className={saved.status === "error" ? "text-sm text-red-800" : "text-sm text-primary"}>{saved.message}</p>}
        <Submit>Instellingen opslaan</Submit>
      </form>
      <form action={testAction} className="flex flex-wrap items-center gap-3 border-t pt-4">
        <Submit>Stuur testmail naar mij</Submit>
        <p className="text-xs text-muted-foreground">Alleen naar het eigen adminaccount, maximaal eens per vijf minuten.</p>
        {tested.message && <p role="status" className={"w-full text-sm " + (tested.status === "error" ? "text-red-800" : "text-primary")}>{tested.message}</p>}
        {settings?.lastTestAt && <p className="w-full text-xs text-muted-foreground">Laatste test aangevraagd: {new Date(settings.lastTestAt).toLocaleString("nl-NL")}</p>}
      </form>
    </section>
  );
}
