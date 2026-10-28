# Issue #3 — mobile-first en toegankelijkheidsreview

Dit document beschrijft de handmatige acceptatiecontrole voor het dashboard van **Mijn Leefstijl**. De huidige inhoud is fictief: sla nog geen echte persoonsgegevens of gezondheidsinformatie op.

## Test op schermbreedtes

- [ ] **320px en 375px (mobiel):** de welkomstkaart heeft leesbare tekst op volledige breedte, zonder dat de decoratieve illustratie de knop of tekst overlapt.
- [ ] **390px en 430px (mobiel):** de vier onderdelen Vandaag, Doelen, Reflectie en Inzichten zijn bereikbaar via de onderste navigatie; geen horizontale scroll.
- [ ] **768px (tablet):** inhoud en kaarten schalen zonder afgekorte tekst of overlap.
- [ ] **1024px en desktop:** navigatie in de zijbalk en een leesbaar maximaal contentformaat.

## Toegankelijkheid

- [ ] **Alleen toetsenbord:** eerste Tab toont “Ga direct naar inhoud”; Enter verplaatst de navigatie naar het hoofdgedeelte. Tab vervolgens door navlinks, beheer en uitloggen; elke focus heeft een zichtbare markering.
- [ ] **Schermlezer:** headings volgen een logische hiërarchie; actieve navigatie is aangeduid met `aria-current="page"`; progressiebalken hebben een beschrijvende naam; de fictieve grafiek benoemt de zes percentages.
- [ ] **Contrast:** kleine labels en muted-tekst gebruiken een donkerder groentint; de gekozen navigatietekst heeft berekend minimaal 5:1 contrast op de achtergrond (mobiel inactief 6,63:1, desktop inactief 6,31:1). Andere componenten handmatig controleren op hun achtergrond.
- [ ] **Bewegingsreductie:** met `prefers-reduced-motion: reduce` geen page-entryanimatie of smooth scroll.
- [ ] **Zoom:** bij 200% browserzoom blijven inhoud en bediening bereikbaar.
- [ ] **Kopie en data:** geen dwingende streaks, medische claims, echte user-data of impliciete persoonlijke gezondheidsresultaten.

## Scope en afhankelijkheden

- Het oorspronkelijke app-shell-werk uit #1 verzorgt de basis van de vier pagina's, navigatie en shadcn/ui- en Lucide-hergebruik.
- Deze branch corrigeert mobiele presentatie, tekstcontrast en decoratieve toegankelijke iconen in pagina's die **niet** door PR #11 worden aangepast.
- **PR #11 (#2) is gemerged**: de authenticatie-shell is behouden. Voor het dashboard zijn de desktop- en mobiele navigatieteksten verduisterd, er is een skiplink naar de hoofdinhoud toegevoegd en de auth/logout-bediening blijft toetsenbordbereikbaar. Dit document claimt geen volledige WCAG-audit.
- Geen nieuwe dependencies of derdepartijassets; bestaande MIT/ISC notices blijven behouden.
- Geen database-, autorisatie-, migratie-, backup- of deploy-wijzigingen. Gebruikersspecifieke content komt pas in #4/#5.

## Buildchecks

`npm ci && npm run db:generate && npm run lint && npm run typecheck && npm run build`; `typecheck` voert officieel `next typegen` uit en genereert het genegeerde `next-env.d.ts` lokaal. GitHub Actions test ook de bestaande Better Auth login-/autoriseringsscenario’s tegen tijdelijke PostgreSQL 17. De viewport- en schermlezercontroles moeten nog handmatig worden uitgevoerd.

## Generated files

`next-env.d.ts` wordt volgens de officiële Next.js 16-documentatie niet langer in Git bewaard; het staat in `.gitignore` en wordt automatisch aangemaakt met `next typegen`, `next dev` en `next build`. Het blijft in `tsconfig.json` staan, zoals Next.js voorschrijft. Hier zijn geen database- of afhankelijkheidswijzigingen voor nodig.
