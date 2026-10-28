"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Leaf, LockKeyhole } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await authClient.signIn.email({ email, password, rememberMe: true });
      if (response.error) {
        setError("Inloggen mislukt. Controleer je e-mailadres en wachtwoord.");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Inloggen is momenteel niet mogelijk. Probeer het later opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#edf3e9] px-4 py-12">
      <Card className="w-full max-w-md space-y-6 bg-white px-6 py-8 sm:px-9 sm:py-10">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-white"><Leaf size={25}/></span>
          <div><p className="text-xl font-bold tracking-tight">Mijn Leefstijl</p><p className="text-xs text-muted-foreground">Elke stap telt</p></div>
        </div>
        <div><h1 className="text-2xl font-bold">Welkom terug</h1><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Log in om jouw persoonlijke omgeving te bekijken.</p></div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-semibold">E-mailadres</label>
            <input id="email" type="email" autoComplete="username" required value={email} onChange={(e)=>setEmail(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-white px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="jij@voorbeeld.nl" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-semibold">Wachtwoord</label>
            <input id="password" type="password" autoComplete="current-password" required minLength={12} value={password} onChange={(e)=>setPassword(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-white px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full">{busy ? "Bezig met inloggen…" : "Inloggen"}</Button>
        </form>
        <p className="flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole size={15}/> Registratie is gesloten. Accounts worden door een beheerder aangemaakt.</p>
      </Card>
    </main>
  );
}
