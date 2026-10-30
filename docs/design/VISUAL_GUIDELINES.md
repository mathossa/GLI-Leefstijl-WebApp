# Mijn Leefstijl — Design System 2B: Energie & Focus

> **Status:** Concept 2B **gekozen op 30 oktober 2026**. Deze richtlijn **vervangt** eerdere gekozen Logo Concept B (groen / kronkelpad) en de vorige regels in dit document. De basisapp blijft behouden; implementatie volgt via [issue #19](https://github.com/mathossa/GLI-Leefstijl-WebApp/issues/19). De gekozen beeldreferentie is een **gerenderd concept**, niet een productieklare vector of automatisch juridisch uniek merk.

![Gekozen Concept 2B, Energie & Focus](https://raw.githubusercontent.com/mathossa/GLI-Leefstijl-WebApp/docs/gli-approved-visual-reference/docs/design/mijn-leefstijl-concept-2b-referentie.svg)

## 1. Ontwerpdoel en merkgevoel

**Mijn Leefstijl** moet direct voelen als: *“YES, ik kan dit!”*: positief, energiek, volwassen, toegankelijk en uitnodigend. Geen medische instelling, corporate verzekeraar, schoolapp, extreme fitness-/dieetcultuur of generiek wellnessmerk. Niet kinderachtig, overdadig of trendgevoelig. De app moet bruikbaar blijven voor zowel een kleine dagelijkse actie als een langere reflectie.

- **Merkmetafoor**: een abstracte klim / berg / kronkelende route / persoonlijke vooruitgang, gecombineerd met een **subtiele, actieve, minimalistische mensvorm die doelgericht de klim maakt**. Vormtaal: tegengestelde bewegingsrichting/flow van figuur en berglijnen, zodat *overwinnen* en *vooruitkomen* voelbaar zijn.
- **Geselecteerd**: precies de compositie van **Concept 2B** als leidende richting; donkerblauwe bergvorm, turquoise/teal, oranje accent en kleine actieve menselijke figuur **aan rechterzijde van de berg**. Niet terug naar de oudere Concept B met groen/geel of een uitgebreid stick-figure-renplaatje.
- **Logo en illustraties zijn verschillend**: beeldmerk compact en herkenbaar bij 32px; grotere decoratieve illustraties mogen meer details hebben, maar mogen geen extra informatie of acties verbergen.
- Geen losse blaadjes, medische kruizen, hartjes als primaire branding, generieke zon-aan-de-horizon zonder unieke vorm. De warme oranje zon **mag** deel van Concept 2B blijven, maar is geen verplichte achtergronddecoratie op iedere kaart.
- Merknaam **Mijn Leefstijl**, optioneel motto **Kleine stappen, groot verschil**; tagline nooit verplicht op kleine schermen.

## 2. Kleuren — geselecteerde 2B-palette

De vijf gekozen merkstalen uit het conceptbord:

| Rol | Naam | Hex | Gebruik |
|---|---|---|---|
| **Brand / diepblauw** | Deep teal navy | `#0F4C5C` | woordmerk, primaire CTA, koppen, actieve navigatie |
| **Brand / teal** | Energetic teal | `#2A9D8F` | merkillustraties, accentvlak, progress-indicatoren |
| **Brand / zacht mint** | Soft mint | `#A7D8D0` | ondersteunende vlakken, zachte highlights, achtergrond |
| **Brand / oranje** | Achievement orange | `#FF9F1C` | energiemomenten, mijlpalen, warme illustratieaccenten |
| **Brand / crème** | Warm cream | `#FFF4E6` | subtiele ondersteunende oppervlakken en empty states |

**Functionele contrast-/surface-tokens (ontwerpvoorstel, te testen):**
```css
:root {
  --background: #f8f7f1;            /* huidige warme basis behouden */
  --foreground: #153540;            /* donkere primaire tekst */
  --card: #fffdf9;                  /* warme, bijna witte kaarten */
  --card-foreground: #153540;
  --primary: #0f4c5c;               /* solide primaire actie */
  --primary-foreground: #ffffff;
  --secondary: #e9f6f4;             /* lichte teal-tint */
  --secondary-foreground: #0f4c5c;
  --muted: #edf4f1;
  --muted-foreground: #536873;
  --accent: #fff4e6;                /* warm oranje-gerelateerd vlak */
  --accent-foreground: #0f4c5c;
  --border: #dde9e8;
  --ring: #126b68;                  /* duidelijk zichtbare focus */
  --brand-teal: #2a9d8f;
  --brand-mint: #a7d8d0;
  --brand-orange: #ff9f1c;
  --link: #126b68;                  /* donkerder dan decoratieve teal */
  --radius: 1.2rem;
}
```
**Toegankelijkheid:** `#2A9D8F` op off-white haalt slechts ~**3.27:1**; `#FF9F1C` op off-white slechts ~**2.02:1**. Gebruik deze **niet** voor kleine lopende tekst of witte tekst op teal/oranje knoppen. `#126B68` op bijna wit ~**6.21:1**; `#0F4C5C` op bijna wit ~**9.36:1**. Hercontroleer alle uiteindelijke combinaties, disabled states en grafieklabels conform WCAG AA.

Kleurverdeling richtlijn: **65% rustige neutrale oppervlakken / 25% navy-teal / 10% zonnig oranje**. Oranje beloont, benadrukt en maakt blij; niet elke interactie oranje. Statuskleuren voor fouten en waarschuwingen moeten semantisch apart blijven.

## 3. Typografie, vormen, animaties

- Behoud huidige **Inter/system sans**, typography scale, prettige regels en afgeronde lettervorm; liever geen externe font-download of visueel zware display-fonts.
- Koppen navy, royaal en goed scanbaar, zonder ALLES IN CAPS in de inhoud. In het merkbeeld mogen enkele subtiele uppercase eyebrow-labels.
- Kaarten: afgerond **20–24px**, subtiele border `#DDE9E8`, zachte schaduw of geen schaduw. Geen dikke kleurvlakken rond alle kaarten. Inputs `12–14px` radius.
- Touch targets **minimaal 44×44 CSS px** waar praktisch; form-controls op iPhone minimaal **16px font-size** om automatisch inzoomen te voorkomen. Grote voldoende zichtbare labels en focus-indicators.
- Microinteracties spaarzaam, 120–200 ms; één vriendelijk voltooiingssignaal, geen verwarrende animaties/loopende confetti. `prefers-reduced-motion` respecteren.
- Gebruik uitsluitend bestaande Lucide-icoonstijl, consistent stroke-weight en sizes; niet overal een gekleurd cirkeltje. SVG-illustraties lokaal, geoptimaliseerd en decoratief.

## 4. Layout en schermen

### App-shell & navigatie
- `src/components/app-shell.tsx`: vervang het huidige Leaf-merk door **Concept 2B**-icon; mobiel compacte brand + naam, desktop woordmerk. Behoud huidige desktop sidebar en mobiele bottom navigation; kleur actieve item in navy/teal en niet in klassiek groen. Respecteer `safe-area-inset-bottom` op iOS.
- Merkdetails op inloggen/onboarding, adminomgeving, favicon/PWA en waar zinvol export-PDF; admin blijft functioneel en rustig, zonder decoratieve grote banners.

### Vandaag / dashboard
- Eerste blik moet persoonlijk, licht en energiek zijn; compacte hero met **één** abstracte 2B-illustratie-accent, weeklabel, tekst en hooguit één directe CTA. Op mobiel blijven dagacties bij voorkeur zonder veel scrollen zichtbaar.
- Overzichtskaarten (doelen, acties, voortgang) behouden, maar navy voor nadruk, teal voor voortgang en oranje alleen voor echt positief resultaat.
- Acties: snelle check-in heeft voorrang op grafische decoratie; afgeronde rijen, direct leesbare status, geen extra klik om alleen iets af te vinken.
- Motivatiequote (#15) krijgt een nette, rustige card die past bij 2B; geen tekst-op-sierbeeld dat moeilijk leesbaar is.

### Doelen / weekacties / wizard (#20)
- Eén hoofdkleur voor primaire actie; doelen-/actiewizard in dezelfde stijlfamilie. Stappenindicator in teal, oranje alleen bij positief feedbackmoment.
- Compacte informatiehiërarchie: titel, doel, kleine voortgangsbalk, vervolgstap; geen steeds wisselende grote thematische illustraties. Lege status mag met kleine abstracte klim-route-illustratie.
- Afgeronde formulieren en bottom sheets moeten **ruimte-efficiënt, snel en duidelijk** blijven.

### Reflecties / bijeenkomsten / notities
- Zachte teal of mint bij reflectie en energie/herstel, warme oranje subtiele bekrachtiging bij iets dat goed ging.
- Notities en foto’s blijven eerste klas inhoud; geen grote artwork boven editor of invoervelden. Weekkeuze en datumkiezer blijven snel, direct en betrouwbaar.
- Op fout geen verlies van ingevoerde tekst; voorkom vertragende datum-popovers en onnodige extra knoppen (functioneel herstel waar nodig als afzonderlijk bugfix-issue).

### Inzichten / voortgang
- Hergebruik bestaande wekelijkse/maandelijkse weergave. Gebruik deep navy + teal in grafieken; oranje markeert concrete successen, niet alle datapunten.
- Toon cijfers en labels naast visuele indicatoren; kleur mag nooit de enige statusdrager zijn.

### Auth, beheer & exports
- Inlogkaart met klein beeldmerk, warme off-white omgeving en teal/navy CTA; niet onnodig uitwaaieren.
- Admin-info volledig en leesbaar, extra illustraties alleen waar ze duidelijk bijdragen.
- PDF-export ontwerp B: volg merkpalette en woordmerk binnen bestaande printlayout, zonder dat meerpagina's, 3+ doelen, 7+ acties of lange notities breken.

## 5. Componentbibliotheek (bestaande code hergebruiken)

| Bestaand | Visuele richtlijn |
|---|---|
| `src/app/globals.css` | centraliseer tokens; verwijder zoveel mogelijk hardcoded legacy greens per scherm |
| `src/components/ui/card.tsx` | warme card, subtiele border, uniforme radius |
| `src/components/ui/button.tsx` | primary navy, secondary licht-teal, focusring, heldere active/disabled/loading |
| `src/components/app-shell.tsx` | 2B-branding, actieve nav, mobile/desktop consistent |
| `src/app/dashboard/page.tsx` | compacte hero, goal metrics, afvinken, rustige progress |
| `src/components/goals-overview.tsx` | doelkaarten, registraties, wizard consistent |
| `src/components/reflections-overview.tsx` | notities, weeknavigatie, meetings, bottom sheets |
| `src/components/insights-overview.tsx` | grafiek-/voortgangsstijl |
| `src/components/sign-in-form.tsx` | vernieuwd merk en inputs |
| `src/app/admin/page.tsx` | shared tokens en consistent formulierdesign |

Geen nieuwe dashboardarchitectuur, geen eigen design-framework, geen extra runtime-kleurthema, geen databasewijzigingen. Hergebruik shadcn/ui, Lucide, Tailwind CSS v4 en bestaande React-componenten.

## 6. Asset- en logo-specificatie

- Het huidige [2B-conceptboard](https://github.com/mathossa/GLI-Leefstijl-WebApp/blob/docs/gli-approved-visual-reference/docs/design/mijn-leefstijl-concept-2b-referentie.svg) is de primaire **visuele referentie**, niet een echte vectorbron: de SVG bevat een ingesloten raster-preview.
- Herteken het **actieve abstracte klimfiguur tegen de stroming van de berglijnen in**, niet als iemand bovenop/naast de berg die al klaar is. Ritme en eenvoud primeren over anatomische details.
- Vectorizeer **origineel en schoon** (strakke paths; geen screenshot-trace als eindproduct). Ontwerp ook een vereenvoudigde **16/32px micro-icon variant** (zon optioneel teruggebracht tot stip, lijnen en details waar nodig schrappen).
- Varianten: `mark.svg` (square), `wordmark.svg` (horizontaal), monochroom, dark-on-light, light-on-dark; PNG sizes voor favicon/Apple touch/PWA indien van toepassing.
- Professionele uitstraling: logo als merkidentiteit, grotere ‘klim’-illustraties alleen bij onboarding/empty states/succes, en niet op elke component.
- Licentie/ontstaan vastleggen; controleer zichtbare verwantschap en potentiële merkrechten vóór publiek/zakelijk gebruik via o.a. BOIP en EUIPO. **Nog geen uniciteit geverifieerd.**

## 7. Verificatie, testmatrix en afbakening

1. Before/after screenshots bij **390px, 768px, 1440px** met uitsluitend fictieve gegevens; donkere/lichte achtergrond voor logo indien ondersteund.
2. Test op iPhone Safari en Android Chrome: correcte bottom sheet, **geen autozoom bij tekstinvoer**, datumvelden functioneren, niets achter keyboard of bottom navigation, geen horizontale scroll.
3. Stress-test 0/1/3+ doelen, 0/7+ acties, lange notities, foutmelding tijdens opslaan, lege lijsten, voortgang 0/50/100%, en reflectiefoto’s.
4. Toegankelijkheidscontrole WCAG AA (tekstcontrast, focus, semantiek, font scaling, icon-only buttons), motion preferences, keyboard.
5. Lighthouse/performance-benchmark vóór/na: geen grote LCP-illustratie of zware externe icon assets.
6. `npm run lint`, `npm run typecheck`, `npm run build`, relevante UI/tests, en AGPL-/notices-check.
7. PR beschrijft de hergebruikte bouwstenen; voeg reële schermmockups/screenshots toe. Stop bij bestaande bugs niet stilzwijgend grote functionele veranderingen in deze PR.

## 8. Implementatiestrategie

**Fase 1:** design tokens, shared Button/Card/input states, compacte brand vector + app shell.  
**Fase 2:** dashboard en goals/wizard; mobiel controleren.  
**Fase 3:** reflectie/notities, inzichten, login/admin, PDF branding.  
**Fase 4:** accessibility & visual regression, final assets en review.

Elke fase testbaar, feature-branch + PR; merge alleen na review en groene CI. Geen bestaande functionaliteit of UX verslechteren; visuele upgrade moet dezelfde lage invoerfrictie houden.


## Implementatie — featurebranch

De featurebranch `feat/issue-19-concept-2b-restyle` implementeert deze richting via echte lokale SVG-assets (`public/brand/mark.svg`, `public/brand/hero-mountains.svg`), het app-icoon, de globale CSS-design tokens, shell/navigatie en de bestaande schermcomponenten. De vectoren zijn originele implementaties van de gekozen conceptvorm en **nog ter visuele review**; overname van de raster-conceptboard als productieasset is vermeden. Bestaande domeinlogica en dataflows blijven intact. Uitgebreidere logo-uniqueness review en test op fysieke iPhone volgen apart vóór publieke zakelijke distributie.
