# Issue #3 — mobile-first en toegankelijkheidsreview

Dit document beschrijft de handmatige acceptatiecontrole voor het dashboard van **Mijn Leefstijl**. De huidige inhoud is fictief: sla nog geen echte persoonsgegevens of gezondheidsinformatie op.

## Test op schermbreedtes

- [ ] **320px en 375px (mobiel):** de welkomstkaart heeft leesbare tekst op volledige breedte, zonder dat de decoratieve illustratie de knop of tekst overlapt.
- [ ] **390px en 430px (mobiel):** de vier onderdelen Vandaag, Doelen, Reflectie en Inzichten zijn bereikbaar via de onderste navigatie; geen horizontale scroll.
- [ ] **768px (tablet):** inhoud en kaarten schalen zonder afgekorte tekst of overlap.
- [ ] **1024px en desktop:** navigatie in de zijbalk en een leesbaar maximaal contentformaat.

## Toegankelijkheid

- [ ] **Alleen toetsenbord:** tab vanaf begin door alle navlinks en knoppen; elke focus heeft een zichtbare markering.
- [ ] **Schermlezer:** headings volgen een logische hiërarchie; actieve navigatie is aangeduid met `aria-current="page"`; progressiebalken hebben een beschrijvende naam; de fictieve grafiek benoemt de zes percentages.
- [ ] **Contrast:** kleine labels en muted-tekst gebruiken een donkerder groentint; de in #3 aangepaste teksten zijn gecontroleerd op minimaal 4,5:1 tegen hun beoogde lichte achtergrond. Controleer ook andere componenten handmatig.
- [ ] **Bewegingsreductie:** met `prefers-reduced-motion: reduce` geen page-entryanimatie of smooth scroll.
- [ ] **Zoom:** bij 200% browserzoom blijven inhoud en bediening bereikbaar.
- [ ] **Kopie en data:** geen dwingende streaks, medische claims, echte user-data of impliciete persoonlijke gezondheidsresultaten.

## Scope en afhankelijkheden

- Het oorspronkelijke app-shell-werk uit #1 verzorgt de basis van de vier pagina's, navigatie en shadcn/ui- en Lucide-hergebruik.
- Deze branch corrigeert mobiele presentatie, tekstcontrast en decoratieve toegankelijke iconen in pagina's die **niet** door PR #11 worden aangepast.
- **PR #11 (#2) wijzigt `src/components/app-shell.tsx`**: na de auth-merge opnieuw de contrasten en toetsenbordnavigatie van de desktopzijbalk en mobiele navigatie controleren. Dit document claimt niet dat de volledige applicatie reeds op WCAG is geaudit.
- Geen nieuwe dependencies of derdepartijassets; bestaande MIT/ISC notices blijven behouden.
- Geen database-, autorisatie-, migratie-, backup- of deploy-wijzigingen. Gebruikersspecifieke content komt pas in #4/#5.

## Buildchecks

`npm ci && npm run lint && npm run typecheck && npm run build`; GitHub Actions CI is leidend voor de PR. De viewport- en schermlezercontroles zijn handmatig uit te voeren.
