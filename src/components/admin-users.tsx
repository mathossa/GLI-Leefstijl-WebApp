"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X } from "lucide-react";
import { deleteManagedUser } from "@/app/admin/actions";
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
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [mode, setMode] = useState<"edit" | "delete">("edit");
  const [newName, setNewName] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const response = await authClient.admin.listUsers({ query: { limit: PAGE_SIZE, offset } });
      if (response.error || !response.data) throw new Error();
      setUsers(response.data.users);
      setTotal(response.data.total);
    } catch { setError("Gebruikers konden niet worden opgehaald."); }
    finally { setLoading(false); }
  }, [offset]);
  useEffect(() => {
    let active = true;
    void authClient.admin.listUsers({ query: { limit: PAGE_SIZE, offset } })
      .then(response => {
        if (!active) return;
        if (response.error || !response.data) {
          setError("Gebruikers konden niet worden opgehaald.");
          return;
        }
        setUsers(response.data.users);
        setTotal(response.data.total);
      })
      .catch(() => { if (active) setError("Gebruikers konden niet worden opgehaald."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [offset]);

  function openEditor(user: AdminUser, nextMode: "edit" | "delete") {
    setError(""); setNotice("");
    setSelected(user); setMode(nextMode); setNewName(user.name);
    setConfirmEmail("");
    dialog.current?.showModal();
  }

  function closeEditor() {
    if (busy) return;
    dialog.current?.close();
    setSelected(null);
  }

  async function renameUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || busy) return;
    const value = newName.trim();
    if (!value || value.length > 120 || /[\\u0000-\\u001f\\u007f]/.test(value)) {
      setError("Vul een geldige naam van maximaal 120 tekens in."); return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await authClient.admin.updateUser({
        userId: selected.id, data: { name: value },
      });
      if (response.error) throw new Error();
      setNotice("Naam gewijzigd.");
      dialog.current?.close(); setSelected(null);
      await refresh();
      router.refresh();
    } catch { setError("De naam kon niet worden gewijzigd."); }
    finally { setBusy(false); }
  }

  async function removeUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || busy || selected.id === currentUserId || selected.role?.split(",").includes("admin")) return;
    if (confirmEmail.trim() !== selected.email) {
      setError("Het e-mailadres komt niet overeen."); return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await deleteManagedUser(selected.id, confirmEmail.trim());
      if (!result.ok) { setError(result.message); return; }
      setNotice("Account en persoonlijke gegevens verwijderd.");
      dialog.current?.close(); setSelected(null);
      if (offset > 0 && users.length === 1) {
        setLoading(true); setOffset(old => Math.max(0, old - PAGE_SIZE));
      } else {
        await refresh();
      }
      router.refresh();
    } catch { setError("Verwijderen is mislukt. Probeer het opnieuw."); }
    finally { setBusy(false); }
  }

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
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled={busy}
                  onClick={() => openEditor(user,"edit")}><Pencil size={16} aria-hidden="true"/> Naam wijzigen</Button>
                {!isSelf && <>
                  <Button type="button" variant="outline" disabled={busy} onClick={() => void changeUser(user,"role")}>{isAdmin ? "Admin intrekken" : "Maak admin"}</Button>
                  <Button type="button" variant="outline" disabled={busy} onClick={() => void changeUser(user,"ban")}>{user.banned ? "Deblokkeren" : "Blokkeren"}</Button>
                  {!isAdmin && <Button type="button" variant="outline" disabled={busy}
                    className="border-red-200 text-red-800 hover:bg-red-50"
                    onClick={() => openEditor(user,"delete")}><Trash2 size={16} aria-hidden="true"/> Verwijderen</Button>}
                </>}
              </div>
            </div>
          );
        })}
      </div>
      <dialog ref={dialog} onClose={() => setSelected(null)}
        onClick={event => { if (event.currentTarget === event.target && !busy) closeEditor(); }}
        aria-label={mode === "edit" ? "Gebruikersnaam wijzigen" : "Gebruiker definitief verwijderen"}
        className="review-dialog">
        {selected && <div className="px-5 pb-[max(env(safe-area-inset-bottom),24px)] pt-5 sm:px-7 sm:py-7">
          <header className="mb-5 flex items-center gap-3">
            <h3 className="min-w-0 flex-1 text-xl font-bold text-[#203d2e]">
              {mode === "edit" ? "Naam wijzigen" : "Gebruiker verwijderen"}
            </h3>
            <button type="button" aria-label="Sluiten" onClick={closeEditor} disabled={busy}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl hover:bg-[#edf3ed]">
              <X size={20} aria-hidden="true"/>
            </button>
          </header>
          {mode === "edit" ? (
            <form className="space-y-4" onSubmit={renameUser}>
              <p className="break-all text-sm text-muted-foreground">{selected.email}</p>
              <label className="block space-y-2 text-sm font-semibold">
                Naam
                <input autoFocus required minLength={1} maxLength={120} className={field}
                  value={newName} onChange={event => setNewName(event.target.value)}/>
              </label>
              <Button type="submit" disabled={busy || !newName.trim()} className="h-12 w-full">
                {busy ? "Opslaan…" : "Naam opslaan"}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={removeUser}>
              <p className="text-sm font-semibold text-red-800">Dit verwijdert het account definitief.</p>
              <p className="text-sm leading-relaxed text-[#5b6d5f]">
                Alle doelen, registraties, reflecties en CooL-notities van deze gebruiker worden verwijderd,
                inclusief privéfoto’s. Deze actie kun je niet ongedaan maken.
              </p>
              <label className="block space-y-2 text-sm font-semibold">
                Typ ter bevestiging het e-mailadres:
                <span className="block break-all rounded-xl bg-[#f5f7f3] p-3 font-mono text-xs font-normal">{selected.email}</span>
                <input autoFocus required autoComplete="off" className={field}
                  value={confirmEmail} onChange={event => setConfirmEmail(event.target.value)}/>
              </label>
              <Button type="submit" disabled={busy || confirmEmail.trim() !== selected.email}
                className="h-12 w-full bg-red-700 text-white hover:bg-red-800">
                <Trash2 size={17} aria-hidden="true"/>{busy ? "Verwijderen…" : "Definitief verwijderen"}
              </Button>
            </form>
          )}
          {error && <p role="alert" className="mt-4 text-sm text-red-800">{error}</p>}
        </div>}
      </dialog>
      {total > PAGE_SIZE && <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{offset + 1}–{Math.min(offset + PAGE_SIZE,total)} van {total}</span>
        <div className="flex gap-2"><Button type="button" variant="outline" disabled={loading || offset === 0} onClick={()=>{ setLoading(true); setOffset(o=>Math.max(0,o-PAGE_SIZE)); }}>Vorige</Button>
          <Button type="button" variant="outline" disabled={loading || offset + PAGE_SIZE >= total} onClick={()=>{ setLoading(true); setOffset(o=>o+PAGE_SIZE); }}>Volgende</Button></div></div>}
    </section>
  );
}
