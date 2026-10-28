import type { Metadata } from "next";
import { BookHeart, HeartHandshake, Lightbulb, MoonStar } from "lucide-react";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Reflectie" };
const prompts = [
  { icon: HeartHandshake, title: "Wat ging er goed?", description: "Welke kleine stap ging deze week makkelijker dan verwacht?", shade: "bg-[#e8f1e5]" },
  { icon: MoonStar, title: "Wat vond je lastig?", description: "Wat kwam er tussendoor? Je hoeft niet streng voor jezelf te zijn.", shade: "bg-[#f0eaf5]" },
  { icon: Lightbulb, title: "Wat neem je mee?", description: "Wat helpt je volgende week om een haalbare stap te zetten?", shade: "bg-[#f9f0db]" },
];

export default function ReflectionPage() {
  return (
    <div className="space-y-6">
      <header><p className="mb-1 text-xs font-semibold uppercase tracking-[.18em] text-[#506d59]">Een moment voor jezelf</p><h1 className="text-3xl font-bold tracking-tight">Wekelijkse reflectie <span aria-hidden="true">✨</span></h1><p className="mt-2 text-sm text-muted-foreground">Kijk met aandacht terug. Ook kleine overwinningen verdienen ruimte.</p></header>
      <section className="grid gap-4 md:grid-cols-3" aria-label="Voorbeeld reflectievragen">
        {prompts.map(({ icon: Icon, title, description, shade }) => (
          <Card key={title} className="min-h-56"><div className={`flex size-12 items-center justify-center rounded-2xl text-[#527e60] ${shade}`}><Icon size={22} aria-hidden="true"/></div><h2 className="text-lg font-semibold">{title}</h2><p className="text-sm leading-relaxed text-muted-foreground">{description}</p></Card>
        ))}
      </section>
      <div className="rounded-[24px] border border-[#dee9db] bg-[#f0f5ed] p-6"><BookHeart size={23} className="mb-3 text-[#4b8563]"/><h2 className="font-semibold">Jouw verhaal telt</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Hier komen later jouw eigen reflecties en notities van CooL-bijeenkomsten. De invoer en veilige opslag worden toegevoegd in <a className="underline" href="https://github.com/mathossa/GLI-Leefstijl-WebApp/issues/5">issue #5</a>.</p></div>
    </div>
  );
}
