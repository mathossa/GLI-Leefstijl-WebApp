"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { BookHeart, ChartNoAxesCombined, House, Leaf, LogOut, Settings2, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const items: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Vandaag", icon: House },
  { href: "/dashboard/doelen", label: "Mijn doelen", icon: Target },
  { href: "/dashboard/reflectie", label: "Reflectie", icon: BookHeart },
  { href: "/dashboard/inzichten", label: "Inzichten", icon: ChartNoAxesCombined },
];

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export function AppShell({ children, userName, isAdmin }: { children: React.ReactNode; userName: string; isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only fixed left-4 top-4 z-50 rounded-xl bg-[#234f40] px-4 py-3 text-sm font-semibold text-white shadow-lg">Ga direct naar inhoud</a>
      <div className="min-h-screen md:grid md:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="hidden border-r border-[#dee9dd] bg-[#edf3e9] md:flex md:min-h-screen md:flex-col md:px-5 md:py-7">
        <Link href="/dashboard" className="mb-12 flex items-center gap-3 rounded-xl px-3 py-2" aria-label="Mijn Leefstijl, naar overzicht">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-[#2b6b51] text-white"><Leaf size={25} strokeWidth={2} /></span>
          <span className="text-lg font-bold tracking-tight text-[#294937]">mijn<span className="text-[#416d50]">leefstijl</span><span className="block text-[11px] font-medium tracking-wider text-[#49614f]">ELKE STAP TELT</span></span>
        </Link>
        <div className="mb-3 px-4 text-[11px] font-semibold uppercase tracking-[.18em] text-[#506955]">Mijn omgeving</div>
        <nav className="space-y-1.5" aria-label="Hoofdnavigatie">
          {items.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined}
              className={cn("flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors hover:bg-[#dce9d9] hover:text-[#2b6b51]", isActive(pathname, href) ? "bg-[#d9e9da] font-semibold text-[#295f48]" : "text-[#445e4b]")}>
              <Icon size={19} aria-hidden="true" />{label}
            </Link>
          ))}
        </nav>
        {isAdmin && <Link href="/admin" className="mt-3 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#486d52] hover:bg-[#dce9d9]"><Settings2 size={19}/> Beheer</Link>}
        <div className="mt-auto space-y-4 px-3">
          <div className="flex items-center justify-between border-t border-[#dbe5d9] pt-4 text-xs text-[#4c6550]">
            <span className="font-medium">Mijn account</span>
            <button type="button" onClick={signOut} title="Uitloggen" aria-label="Uitloggen" className="rounded-lg p-2 hover:bg-[#dce9d9]"><LogOut size={17}/></button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 w-full">
        <header className="sticky top-0 z-20 border-b border-[#ecece4]/90 bg-[#f8f7f1]/95 px-5 py-4 backdrop-blur-sm sm:px-8 lg:px-12">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 font-bold text-[#315b44] md:hidden">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-white"><Leaf size={20} /></span> Mijn Leefstijl
            </Link>
            <span className="hidden text-sm text-[#506955] md:block">Jouw plek om met aandacht te groeien</span>
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full bg-[#eaf0e6] px-3 py-1.5 text-xs font-medium text-[#557563] sm:block">{userName}</span>
              {isAdmin && <Link href="/admin" className="rounded-lg p-2 text-[#557563] hover:bg-[#dce9d9] md:hidden" aria-label="Beheer"><Settings2 size={18}/></Link>}
              <button type="button" onClick={signOut} className="rounded-lg p-2 text-[#557563] hover:bg-[#dce9d9] md:hidden" aria-label="Uitloggen"><LogOut size={19}/></button>
            </div>
          </div>
        </header>

        <main id="main" className="page-enter mx-auto w-full min-w-0 max-w-6xl px-4 pb-28 pt-5 sm:px-8 md:pb-12 lg:px-12 lg:pt-9">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-[#dfe9dd] bg-[#fffefb]/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 shadow-[0_-8px_24px_-16px_rgba(25,72,43,.3)] backdrop-blur md:hidden" aria-label="Mobiele navigatie">
        {items.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined}
            className={cn("flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium",isActive(pathname, href) ? "bg-[#e8f1e7] text-[#2b7053]" : "text-[#49624e]")}>
            <Icon size={20} aria-hidden="true" /><span>{label === "Mijn doelen" ? "Doelen" : label}</span>
          </Link>
        ))}
      </nav>
      </div>
    </>
  );
}
