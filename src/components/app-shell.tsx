"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { BookHeart, ChartNoAxesCombined, House, LogOut, Settings2, Target } from "lucide-react";
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
      <a href="#main" className="sr-only focus:not-sr-only fixed left-4 top-4 z-50 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg">
        Ga direct naar inhoud
      </a>
      <div className="min-h-screen md:grid md:grid-cols-[256px_minmax(0,1fr)]">
        <aside className="hidden min-h-screen flex-col border-r border-border bg-[#EAF0E9]/60 px-4 py-7 md:flex">
          <Link href="/dashboard" className="mb-11 flex items-center gap-2.5 rounded-2xl px-2 py-2" aria-label="Mijn Leefstijl, naar overzicht">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-[17px] border border-white bg-[#FAF6EE] shadow-sm">
              <Image src="/brand/mark-exact-source-v4.svg" alt="" width={44} height={44} priority/>
            </span>
            <span className="min-w-0">
              <span className="block text-[17px] font-extrabold tracking-tight text-primary">Mijn Leefstijl</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[.12em] text-[#255F50]">Kleine stappen, groot verschil</span>
            </span>
          </Link>
          <div className="mb-3 px-4 text-[11px] font-semibold uppercase tracking-[.17em] text-[#536B60]">Mijn omgeving</div>
          <nav className="space-y-1.5" aria-label="Hoofdnavigatie">
            {items.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined}
                className={cn("flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#456B5B] transition-colors hover:bg-white/80",
                  isActive(pathname, href) ? "bg-white font-bold text-primary shadow-[0_5px_16px_-12px_rgba(31,93,80,.4)]" : "")}>
                <Icon size={19} aria-hidden="true" className={isActive(pathname, href) ? "text-[#255F50]" : ""}/>{label}
              </Link>
            ))}
          </nav>
          {isAdmin && <Link href="/admin" className="mt-3 flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#456B5B] hover:bg-white/80"><Settings2 size={19}/> Beheer</Link>}
          <div className="mt-auto space-y-3 px-3">
            <p className="text-xs leading-relaxed text-[#536B60]">Elke kleine stap brengt je verder.</p>
            <div className="flex items-center justify-between border-t border-border pt-4 text-sm text-[#456B5B]">
              <span className="truncate font-medium">{userName}</span>
              <button type="button" onClick={signOut} title="Uitloggen" aria-label="Uitloggen" className="flex size-11 items-center justify-center rounded-xl hover:bg-white"><LogOut size={18}/></button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 w-full">
          <header className="sticky top-0 z-20 border-b border-border/90 bg-background/95 px-4 py-3 backdrop-blur-sm sm:px-8 lg:px-12">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
              <Link href="/dashboard" className="flex min-w-0 items-center gap-2 font-bold tracking-tight text-primary md:hidden" aria-label="Mijn Leefstijl, naar overzicht">
                <Image src="/brand/mark-exact-source-v4.svg" alt="" width={37} height={37} priority/>
                <span className="truncate">Mijn Leefstijl</span>
              </Link>
              <span className="hidden text-sm text-[#536B60] md:block">Jouw plek voor nieuwe stappen</span>
              <div className="flex items-center gap-2">
                <span className="hidden max-w-48 truncate rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-[#1F5D50] sm:block">{userName}</span>
                {isAdmin && <Link href="/admin" className="flex size-11 items-center justify-center rounded-xl text-primary hover:bg-secondary md:hidden" aria-label="Beheer"><Settings2 size={19}/></Link>}
                <button type="button" onClick={signOut} className="flex size-11 items-center justify-center rounded-xl text-primary hover:bg-secondary md:hidden" aria-label="Uitloggen"><LogOut size={19}/></button>
              </div>
            </div>
          </header>
          <main id="main" className="page-enter mx-auto w-full min-w-0 max-w-6xl px-4 pb-28 pt-5 sm:px-8 md:pb-12 lg:px-12 lg:pt-9">
            {children}
          </main>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-card/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 shadow-[0_-8px_24px_-16px_rgba(31,93,80,.3)] backdrop-blur md:hidden" aria-label="Mobiele navigatie">
          {items.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined}
              className={cn("flex min-h-13 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium text-[#536B60]",
                isActive(pathname, href) ? "bg-secondary font-bold text-primary" : "")}>
              <Icon size={20} aria-hidden="true"/><span>{label === "Mijn doelen" ? "Doelen" : label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
