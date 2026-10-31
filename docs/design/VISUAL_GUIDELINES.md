# Mijn Leefstijl — De Klim / palet 3: Rust & Groei

> **Status:** De berg-/klimcompositie van concept 2B blijft de basis. **Kleurenpalet 3 — Rust & Groei — gekozen op 31 oktober 2026**, na de eerste praktijktest. Deze keuze vervangt het eerdere bosgroen/salie/perzik van 2B. Issue [#19](https://github.com/mathossa/GLI-Leefstijl-WebApp/issues/19) en draft PR [#26](https://github.com/mathossa/GLI-Leefstijl-WebApp/pull/26) volgen dit palet. De ontwerpbeelden zijn inspiratie, geen productierijpe vectorassets of bewezen uniek logo.

![Oorspronkelijke compositiereferentie Concept 2B; kleuren zijn vervangen door palet 3](https://raw.githubusercontent.com/mathossa/GLI-Leefstijl-WebApp/docs/gli-approved-visual-reference/docs/design/mijn-leefstijl-concept-2b-referentie.svg)

## 1. Ontwerpdoel en merkgevoel

**Mijn Leefstijl** moet direct voelen als: *“YES, ik kan dit!”*: positief, energiek, volwassen, toegankelijk en uitnodigend. Geen medische instelling, corporate verzekeraar, schoolapp, extreme fitness-/dieetcultuur of generiek wellnessmerk. Niet kinderachtig, overdadig of trendgevoelig. De app moet bruikbaar blijven voor zowel een kleine dagelijkse actie als een langere reflectie.

- **Merkmetafoor**: een abstracte klim / berg / kronkelende route / persoonlijke vooruitgang, gecombineerd met een **subtiele, actieve, minimalistische mensvorm die doelgericht de klim maakt**. Vormtaal: tegengestelde bewegingsrichting/flow van figuur en berglijnen, zodat *overwinnen* en *vooruitkomen* voelbaar zijn.
- **Geselecteerd**: het beeldmerk uit de uiteindelijke palet-3-mockup. **Twee afzonderlijke oplopende, afgeronde bergvlakken links**, een **kleine perzikkleurige driehoek rechts** en een **kleine klimmer met oranje rugzak tussen berg en driehoek**, met een losse perzikkleurige zon erboven. De klimmer is niet in de berg getekend of liggend op de top. Op de grote dashboardillustratie klimt een klein figuur rechts over de stijgende bergrand.
- **Logo en illustraties zijn verschillend**: beeldmerk compact en herkenbaar bij 32px; grotere decoratieve illustraties mogen meer details hebben, maar mogen geen extra informatie of acties verbergen.
- Geen losse blaadjes, medische kruizen, hartjes als primaire branding, generieke zon-aan-de-horizon zonder unieke vorm. De warme perzik zon **mag** deel van Concept 2B blijven, maar is geen verplichte achtergronddecoratie op iedere kaart.
- Merknaam **Mijn Leefstijl**, optioneel motto **Kleine stappen, groot verschil**; tagline nooit verplicht op kleine schermen.

## 2. Definitief gekozen palet 3 — Rust & Groei

| Rol | Naam | Hex | Gebruik |
|---|---|---|---|
| Merk/donker | Bosgroen | `#1F5D50` | woordmerk, knoppen, primaire koppen, actieve navigatie |
| Merk/middel | Salie | `#7BA892` | bergvormen, voortgang, zachte ornamenten; niet als kleine tekst |
| Merk/accent | Perzik | `#F4A261` | zon, resultaten, successen, warme highlight |
| Achtergrond | Linnen | `#FAF6EE` | volledige pagina en groot achtergrondvlak |
| Merk/licht | Mosgrijs | `#D8E2D7` | subtiele sidebar en outlines/borders |

**Toegankelijke ondersteunende rollen:** lichtkaart `#FFFDFA`; donkere tekst `#233D34`; gedempte tekst `#536B60`; interactieve link `#255F50`; lichtsalie `#EAF0E9`; lichtperzik `#FCE8D8`. Primaire knoppen hebben wit op `#1F5D50`; geen witte tekst op salie of perzik.

CSS-tokens in `src/app/globals.css` zijn de implementatiebron:
```css
:root {
  --background: #faf6ee;
  --foreground: #233d34;
  --card: #fffdfa;
  --card-foreground: #233d34;
  --primary: #1f5d50;
  --primary-foreground: #ffffff;
  --secondary: #eaf0e9;
  --secondary-foreground: #1f5d50;
  --muted: #f0f3ed;
  --muted-foreground: #536b60;
  --accent: #fce8d8;
  --accent-foreground: #1f5d50;
  --border: #d8e2d7;
  --ring: #255f50;
  --brand-sage: #7ba892;
  --brand-peach: #f4a261;
  --radius: 1.2rem;
}
```

**Contrastcontrole (tegen `#FAF6EE`):** bosgroen ~7,1:1 en linkgroen ~6,9:1, beide geschikt voor gewone tekst. Salie ~2,5:1 en perzik ~1,9:1, dus **niet** geschikt voor kleine tekst. Gebruik ze alleen voor illustraties, vlakken of voldoende groot, niet-tekstueel decoratief accent. Controleer uiteindelijke UI met WCAG AA (4,5:1 normale tekst).

**Kleurverdeling:** rustige lichte linnen/witte oppervlakken domineren; donkergroen voor belangrijke acties, salie voor progressie en perzik als spaarzaam beloningsaccent. Vermijd een dashboard dat volledig lichtgroen is.

## 3. Typografie, vormen, animaties

- Behoud huidige **Inter/system sans**, typography scale, prettige regels en afgeronde lettervorm; liever geen externe font-download of visueel zware display-fonts.
- Koppen bosgroen, royaal en goed scanbaar, zonder ALLES IN CAPS in de inhoud. In het merkbeeld mogen enkele subtiele uppercase eyebrow-labels.
- Kaarten: afgerond **20–24px**, subtiele border `#DDE9E8`, zachte schaduw of geen schaduw. Geen dikke kleurvlakken rond alle kaarten. Inputs `12–14px` radius.
- Touch targets **minimaal 44×44 CSS px** waar praktisch; form-controls op iPhone minimaal **16px font-size** om automatisch inzoomen te voorkomen. Grote voldoende zichtbare labels en focus-indicators.
- Microinteracties spaarzaam, 120–200 ms; één vriendelijk voltooiingssignaal, geen verwarrende animaties/loopende confetti. `prefers-reduced-motion` respecteren.
- Gebruik uitsluitend bestaande Lucide-icoonstijl, consistent stroke-weight en sizes; niet overal een gekleurd cirkeltje. SVG-illustraties lokaal, geoptimaliseerd en decoratief.

## 4. Layout en schermen

### App-shell & navigatie
- `src/components/app-shell.tsx`: vervang het huidige Leaf-merk door **Concept 2B**-icon; mobiel compacte brand + naam, desktop woordmerk. Behoud huidige desktop sidebar en mobiele bottom navigation; kleur actieve item in bosgroen/salie en niet in klassiek groen. Respecteer `safe-area-inset-bottom` op iOS.
- Merkdetails op inloggen/onboarding, adminomgeving, favicon/PWA en waar zinvol export-PDF; admin blijft functioneel en rustig, zonder decoratieve grote banners.

### Vandaag / dashboard
- Eerste blik moet persoonlijk, licht en energiek zijn; compacte hero met **één** abstracte 2B-illustratie-accent, weeklabel, tekst en hooguit één directe CTA. Op mobiel blijven dagacties bij voorkeur zonder veel scrollen zichtbaar.
- Overzichtskaarten (doelen, acties, voortgang) behouden, maar bosgroen voor nadruk, salie voor voortgang en perzik alleen voor echt positief resultaat.
- Acties: snelle check-in heeft voorrang op grafische decoratie; afgeronde rijen, direct leesbare status, geen extra klik om alleen iets af te vinken.
- Motivatiequote (#15) krijgt een nette, rustige card die past bij 2B; geen tekst-op-sierbeeld dat moeilijk leesbaar is.

### Doelen / weekacties / wizard (#20)
- Eén hoofdkleur voor primaire actie; doelen-/actiewizard in dezelfde stijlfamilie. Stappenindicator in salie, perzik alleen bij positief feedbackmoment.
- Compacte informatiehiërarchie: titel, doel, kleine voortgangsbalk, vervolgstap; geen steeds wisselende grote thematische illustraties. Lege status mag met kleine abstracte klim-route-illustratie.
- Afgeronde formulieren en bottom sheets moeten **ruimte-efficiënt, snel en duidelijk** blijven.

### Reflecties / bijeenkomsten / notities
- Zachte salie of mosgrijs bij reflectie en energie/herstel, warme perzik subtiele bekrachtiging bij iets dat goed ging.
- Notities en foto’s blijven eerste klas inhoud; geen grote artwork boven editor of invoervelden. Weekkeuze en datumkiezer blijven snel, direct en betrouwbaar.
- Op fout geen verlies van ingevoerde tekst; voorkom vertragende datum-popovers en onnodige extra knoppen (functioneel herstel waar nodig als afzonderlijk bugfix-issue).

### Inzichten / voortgang
- Hergebruik bestaande wekelijkse/maandelijkse weergave. Gebruik bosgroen + salie in grafieken; perzik markeert concrete successen, niet alle datapunten.
- Toon cijfers en labels naast visuele indicatoren; kleur mag nooit de enige statusdrager zijn.

### Auth, beheer & exports
- Inlogkaart met klein beeldmerk, warme off-white omgeving en salie/bosgroen CTA; niet onnodig uitwaaieren.
- Admin-info volledig en leesbaar, extra illustraties alleen waar ze duidelijk bijdragen.
- PDF-export ontwerp B: volg merkpalette en woordmerk binnen bestaande printlayout, zonder dat meerpagina's, 3+ doelen, 7+ acties of lange notities breken.

## 5. Componentbibliotheek (bestaande code hergebruiken)

| Bestaand | Visuele richtlijn |
|---|---|
| `src/app/globals.css` | centraliseer tokens; verwijder zoveel mogelijk hardcoded legacy greens per scherm |
| `src/components/ui/card.tsx` | warme card, subtiele border, uniforme radius |
| `src/components/ui/button.tsx` | primary bosgroen, secondary licht-salie, focusring, heldere active/disabled/loading |
| `src/components/app-shell.tsx` | 2B-branding, actieve nav, mobile/desktop consistent |
| `src/app/dashboard/page.tsx` | compacte hero, goal metrics, afvinken, rustige progress |
| `src/components/goals-overview.tsx` | doelkaarten, registraties, wizard consistent |
| `src/components/reflections-overview.tsx` | notities, weeknavigatie, meetings, bottom sheets |
| `src/components/insights-overview.tsx` | grafiek-/voortgangsstijl |
| `src/components/sign-in-form.tsx` | vernieuwd merk en inputs |
| `src/app/admin/page.tsx` | shared tokens en consistent formulierdesign |

Geen nieuwe dashboardarchitectuur, geen eigen design-framework, geen extra runtime-kleurthema, geen databasewijzigingen. Hergebruik shadcn/ui, Lucide, Tailwind CSS v4 en bestaande React-componenten.

## 6. Asset- en logo-specificatie

- Het huidige [oorspronkelijke compositie-conceptboard](https://github.com/mathossa/GLI-Leefstijl-WebApp/blob/docs/gli-approved-visual-reference/docs/design/mijn-leefstijl-concept-2b-referentie.svg) is de primaire **visuele referentie**, niet een echte vectorbron: de SVG bevat een ingesloten raster-preview.
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

## Feedback uit eerste praktijktest (31 oktober 2026)

- Het oorspronkelijke klimmende figuur stond visueel verkeerd (rechts uit de berg vandaan). De gecorrigeerde doelreferentie toont een **klein figuur met oranje rugzak dat rechts zichtbaar bergop loopt**; het logo gebruikt daarnaast de twee losse bergvormen en perzikkleurige driehoek uit het voorbeeld. Toets herkenbaarheid op 16/32px en dashboardformaat.
- Het oude blaadje bleef zichtbaar als browserfavicon. Zowel `public/icon.svg` als de **nieuwe URL** `/brand/app-icon-reference-v2.svg` zijn bijgewerkt; `src/app/layout.tsx` en `public/manifest.webmanifest` verwijzen naar de nieuwe URL om browsercache van het oude icoon te vermijden.
- Palet 3 is definitief gekozen als opvolger van het eerdere 2B-kleurenschema. Alle latere designs volgen de tokens hierboven.

## Logo- en illustratiereview — bijgewerkt 31 oktober 2026

De laatst meegestuurde goedgekeurde *Palette 3 — Rust & Groei* screenshot is de leidende beeldreferentie, boven eerdere 2B-logo-exploraties. De vervangende echte SVG's zijn nu:
- `public/brand/mark-reference-v2.svg`: **twee losse afgeronde bergvormen, vrije klimmer met oranje rugzak, losse zon en perzik driehoek**; in desktopzijbalk, mobile header en inlog.
- `public/brand/app-icon-reference-v2.svg`: dezelfde compositie op een linnen achtergrond voor browser-tab/PWA. Ook `public/icon.svg` bijgewerkt en metadata-/manifest-URL vernieuwd om oude faviconcache te doorbreken.
- `public/brand/hero-reference-v2.svg`: zachtere gelaagde bergen met een duidelijk **bergop lopende figuur rechts**, inclusief oranje rugzak. Geen grote losstaande stickfigure of hard driehoeklandschap.

Het zijn originele, lichtgewicht vectorinterpretaties van de gebruikersreferentie; nog visueel te reviewen door de opdrachtgever. **Palet 3 is onveranderd**.
