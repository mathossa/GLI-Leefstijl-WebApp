"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
type AdminUser = { id: string; name: string; email: string; role?: string | null; banned?: boolean | null };
const field = "h-11 w-full min-w-0 rounded-xl border border-border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const PAGE_SIZE = 20;

export function AdminUsers({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0), [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [name, setName] = useState(""), [email, setEmail] = useState(""), [password, setPassword] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await authClient.admin.listUsers({ query: { limit: PAGE_SIZE, offset } });
      if (response.error || !response.data) throw new Error();
      setUsers(response.data.users);
      setTotal(response.data.total);
    } catch { setError("Gebruikers konden niet worden opgehaald."); }
    finally { setLoading(false); }
  }, [offset]);
  useEffect(() => { void refresh(); }, [refresh]);

  async function createUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await authClient.admin.createUser({ name: name.trim(), email: email.trim(), password, role: "user" });
      if (response.error) throw new Error();
      setName(""); setEmail(""); setPassword("");
      setNotice("Gebruiker toegevoegd. Deel het wachtwoord alleen via een veilig kanaal.");
      setOffset(0); await refresh();
    } catch { setError("Aanmaken mislukt. Controleer e-mailadres en wachtwoord (minimaal 12 tekens)."); }
    finally { setBusy(false); }
  }

  async function changeUser(user: AdminUser, action: "role" | "ban") {
    if (busy || user.id === currentUserId) return;
    const isAdmin = user.role?.split(",").includes("admin") ?? false;
    const question = action === "role"
      ? (isAdmin ? "Beheerdersrechten intrekken?" : "Dit account beheerder maken?")
      : (user.banned ? "Account deblokkeren?" : "Account blokkeren en sessies beëindigen?");
    if (!window.confirm(question)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = action === "role"
        ? await authClient.admin.setRole({ userId: user.id, role: isAdmin ? "user" : "admin" })
        : user.banned
          ? await authClient.admin.unbanUser({ userId: user.id })
          : await authClient.admin.banUser({ userId: user.id });
      if (result.error) throw new Error();
      setNotice("Account bijgewerkt."); await refresh();
    } catch { setError("Wijziging mislukt. Controleer je beheerdersrechten."); }
    finally { setBusy(false); }
  }

  return (
    <section aria-labelledby="users-heading" className="space-y-4">
      <div><h2 id="users-heading" className="text-xl font-semibold">Gebruikersbeheer</h2><p className="mt-1 text-sm text-muted-foreground">Accounts en rechten via de officiële Better Auth Admin-plugin. Publieke registratie is uitgeschakeld.</p></div>
      <form onSubmit={createUser} className="grid gap-3 rounded-xl border bg-[#f8faf6] p-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">Naam<input className={field} value={name} onChange={e=>setName(e.target.value)} maxLength={120} required autoComplete="off"/></label>
        <label className="space-y-1 text-sm font-medium">E-mailadres<input className={field} value={email} onChange={e=>setEmail(e.target.value)} type="email" required autoComplete="off"/></label>
        <label className="space-y-1 text-sm font-medium sm:col-span-2">Tijdelijk wachtwoord (minimaal 12 tekens)<input className={field} value={password} onChange={e=>setPassword(e.target.value)} type="password" minLength={12} required autoComplete="new-password"/></label>
        <div className="sm:col-span-2"><Button type="submit" disabled={busy}>{busy ? "Bezig…" : "Gebruiker toevoegen"}</Button></div>
      </form>
      {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      <div className="divide-y overflow-hidden rounded-xl border bg-white">
        {loading && <p className="p-4 text-sm text-muted-foreground">Gebruikers laden…</p>}
        {!loading && users.length === 0 && <p className="p-4 text-sm text-muted-foreground">Geen gebruikers gevonden.</p>}
        {!loading && users.map(user => {
          const isAdmin = user.role?.split(",").includes("admin") ?? false;
          const isSelf = user.id === currentUserId;
          return (
            <div key={user.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0"><p className="break-words text-sm font-semibold">{user.name}{isSelf ? " (jij)" : ""}</p>
                <p className="break-all text-xs text-muted-foreground">{user.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">{isAdmin ? "Beheerder" : "Gebruiker"}{user.banned ? " · Geblokkeerd" : ""}</p></div>
              {!isSelf && <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled={busy} onClick={() => void changeUser(user,"role")}>{isAdmin ? "Admin intrekken" : "Maak admin"}</Button>
                <Button type="button" variant="outline" disabled={busy} onClick={() => void changeUser(user,"ban")}>{user.banned ? "Deblokkeren" : "Blokkeren"}</Button></div>}
            </div>
          );
        })}
      </div>
      {total > PAGE_SIZE && <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{offset + 1}–{Math.min(offset + PAGE_SIZE,total)} van {total}</span>
        <div className="flex gap-2"><Button type="button" variant="outline" disabled={loading || offset === 0} onClick={()=>{ setLoading(true); setOffset(o=>Math.max(0,o-PAGE_SIZE)); }}>Vorige</Button>
          <Button type="button" variant="outline" disabled={loading || offset + PAGE_SIZE >= total} onClick={()=>{ setLoading(true); setOffset(o=>o+PAGE_SIZE); }}>Volgende</Button></div></div>}
    </section>
  );
}
