# Ontwerpvoorbereiding — begeleid doelen en acties maken (issue #20)

**Status:** voorbereidende specificatie, geen productiewijziging  
**Issue:** [#20](https://github.com/mathossa/GLI-Leefstijl-WebApp/issues/20)  
**Datum:** 29 oktober 2026  
**Basis:** `main` na doelen/acties #4 en reflecties #5. #6 (admin), #7 (deploy) en #19 (illustraties) staan los hiervan.

## 1. Productbesluit

**Een doel opstellen mag aandacht vragen; de actie uitvoeren blijft één tik.**  
Twee invoerroutes werken met dezelfde backend:

1. **Snel toevoegen** (standaard voor bestaande gebruikers): doel via titel + leefstijlgebied (motivatie optioneel); weekactie via titel + 1–7 keer per week. De snelroute mag geen extra verplichte veldvalidatie krijgen.
2. **Help mij op weg** (aanbevolen bij het eerste doel): een optionele wizard van maximaal vier schermen, die een doel en eventueel de eerste weekactie vastlegt. Later opnieuw oproepbaar bij nieuwe doelen en bestaande doelen via 'Weekactie toevoegen'.

Na opslaan verandert `Vandaag` niet: één tik op `Gedaan`; beoordelingen en notities blijven optioneel. Geen verplicht terugkommoment, meldingen, streaks, getallen over gewicht of gezondheidsadviezen.

### Niet opnemen in MVP
- Door de app gegenereerde medische doelen of AI-advies.
- Een 'laag vertrouwen'-score als blokkade of als diagnose.
- Verplichte dagbeoordeling, dagelijkse score-updates of een apart notificatiesysteem.
- Automatisch het weekdoel als behaald markeren wanneer alleen een plan B wordt uitgevoerd; dit vergt een expliciet ontwerpbesluit voor een aparte, later optionele registratie.

## 2. Vier korte wizardstappen

| Scherm | Vraag in gewone taal | Invoer | Verplicht? |
| --- | --- | --- | --- |
| **1. Mijn doel** | Wat zou jij willen veranderen? | titel, leefstijlgebied | ja |
| | Waarom is dit belangrijk voor jou? | motivatie | nee |
| | Waaraan merk je dat je vooruitgaat? | persoonlijk voortgangssignaal | nee |
| | Start-/einddatum | achter 'Meer opties' | nee |
| **2. Eerste stap** | Wat ga je precies doen? | actietitel | alleen wanneer gebruiker een actie wil toevoegen |
| | Hoe vaak per week? | 1–7, voorkeur voor duidelijke aantikbare knoppen of toegankelijke select | alleen bij actie |
| | Wanneer past dit het beste? | contextvrij tekstveld, bijv. 'na het avondeten' | nee |
| **3. Gaat dit lukken?** | Hoeveel vertrouwen heb je dat dit lukt? | 1–10, inclusief zichtbaar cijfer en toegankelijk toetsenbordalternatief | nee |
| | Wat helpt je nu al? | `existingStrength` | nee |
| | Wat zou je vertrouwen één punt verhogen? | `confidenceBooster` | nee, alleen wanneer score 1–9 |
| | Wat kan het lastig maken? / Wat doe je dan? | obstakel/plan B, samen in uitklapbaar blok | nee |
| **4. Mijn plan** | Klopt dit voor jou? | leesbare samenvatting, 'Terug' en 'Mijn plan opslaan' | één expliciete bevestiging |

### Belangrijke UX-randgevallen
- **Alleen een doel:** op scherm 2 duidelijke keuze *Nu alleen doel opslaan*. Geen lege `HabitAction` aanmaken; stap 3 vervalt.
- **Een actie bij bestaand doel:** start direct bij stap 2 met doelnaam als context, daarna stap 3 en 4; sla geen tweede doel op.
- **Vertrouwen 1–6:** vriendelijke suggestie 'Maak het kleiner als je wilt' (géén verplichting en geen hardcoded tekstrewrite van actieomschrijving).
- **Vertrouwen 7–9:** optionele vraag naar +1, zonder dwingende coaching.
- **Vertrouwen 10:** vraag niet naar 11/10. Eventueel 'Wat maakt dit zo haalbaar?' achter optionele uitklapper.
- **Geen score:** geen vervolgvragen over een specifiek cijfer. Vrije velden en plan B mogen wel worden ingevuld.
- **Terug navigeren:** reeds ingevulde waarden blijven staan, ook bij optionele plan B na inklappen; verborgen velden worden bij opslaan niet automatisch gewist.
- **Sluiten:** bij onopgeslagen wijzigingen keuze om verder te gaan of deze invoer te verlaten. Conceptversie alleen React-state in de open wizard; nog geen browseropslag van gevoelige data of onzichtbare serverdraft.
- **Mislukte save:** behoud formulierdata en geef toegankelijk foutbericht; voorkom dubbele `submit`.
- **Optionele velden:** leeg = `null` in DB, nooit fictieve standaardscore 6 of gegenereerde antwoorden.

## 3. Tekstvoorstellen per scherm

**Scherm 1**  
Titel: 'Wat zou jij willen veranderen?'  
Ondertitel: 'Begin met iets dat voor jou belangrijk is. Het hoeft nog niet perfect.'  
Hulp: 'Je eerste kleine stap kiezen we zo.'

**Scherm 2**  
Titel: 'Wat wordt jouw eerste kleine stap?'  
Ondertitel: 'Iets wat in jouw normale week past, is genoeg.'  
Voorbeeld: '20 minuten wandelen' / '3 keer per week' / 'na het avondeten'.

**Scherm 3**  
Titel: 'Denk je dat dit gaat lukken?'  
Ondertitel: 'Het is geen toets. Je kunt altijd iets aanpassen.'  
Schaal-label: 'Hoeveel vertrouwen heb je? (1 = weinig, 10 = veel)'  
Conditionele vraag: 'Wat zou je helpen om van een 6 naar een 7 te gaan?'  
Optionele knop: 'Een plan B bedenken'.

**Scherm 4**  
Titel: 'Je hebt een plan!'  
Actie: 'Mijn plan opslaan' (niet 'Volgende').  
Nazorg: ga naar de geopende doelkaart of het doelenoverzicht; niet automatisch naar een lege reflectie.

## 4. Gebruikersroutes en statusmodel

- `new-goal/quick` -> bestaande `createGoal`-serveraction of een optioneel-uitgebreide opvolger.
- `new-goal/guided` -> stappen `goal`, `firstAction`, `confidence`, `review`; `firstAction` mag overslaan.
- `goal/:id/new-action/quick` -> bestaande `createHabitAction`-serveraction.
- `goal/:id/new-action/guided` -> stappen `firstAction`, `confidence`, `review`; eigenaarschap doel altijd server-side valideren.
- `goal/:id/edit` en `action/:id/edit`: huidige bewerkflow uitbreiden met optionele velden. Geen wizard verplicht.
- Doel- en actiekaarten tonen standaard niet alle vrije teksten; in detail toont de app relevante informatie onder 'Mijn plan'.

Gebruik bestaande `GoalsOverview`-dialog/sheet. Wizardstate ligt in een los component/hook onder `src/components/` (bijv. `goal-action-wizard.tsx`) om de bestaande grote `goals-overview.tsx` niet verder te laten groeien. Een reducer is alleen nuttig als eenvoudiger `useState` aantoonbaar onvoldoende is.

## 5. Data- en backendcontract (voorstel)

### Additieve Prisma-schema-uitbreiding

```prisma
model Goal {
  // Bestaande velden blijven onveranderd.
  progressIndicator String? @db.VarChar(500)
}

model HabitAction {
  // Bestaande velden blijven onveranderd.
  whenContext       String? @db.VarChar(250)
  confidenceScore   Int?
  existingStrength  String? @db.VarChar(500)
  confidenceBooster String? @db.VarChar(500)
  obstacle          String? @db.VarChar(500)
  fallbackPlan      String? @db.VarChar(500)
}
```

Dit is een **fragment**; pas modellen met behoud van bestaande velden en relaties aan, maak de migratie additief. Voeg PostgreSQL CHECK-constraint toe voor `confidenceScore IS NULL OR confidenceScore BETWEEN 1 AND 10`, zodat niet alleen de UI valideert.

### Validatieregels
- Hergebruik `src/lib/goals-domain.mjs`: `parseGoalForm`, `parseActionForm`, `FormInputError`, `ownedWhere`.
- Optionele strings trimmen en limiteren; leeg naar `null`. Geen HTML-uitvoer zonder React-escaping.
- `confidenceScore`: alleen leeg/`null` of strikt integer 1–10; reject NaN, decimalen, 0, 11, extra tekens en arrays via `FormData`.
- De actietitel en 1–7 frequentie blijven verplicht als een actie aanwezig is; voor alleen een doel blijft alles van de actie echt afwezig.
- Bij wijzigen van frequentie bestaande current-week snapshot laten staan en de nieuwe frequentie de volgende maandag laten ingaan.
- Bij begeleid doel + eerste actie één **Prisma `$transaction`**: `Goal` + `HabitAction` atomair en userId uit `requireSession`; bestaande 20 actieve doelen/12 acties per doel-regels in transactioneel pad afdwingen. Zorg voor eigenaarschap op zowel parent als child. Voor een nieuwe actie bij bestaand doel eerst `ownedWhere(user.id,goalId)` controleren.
- Geen client-supplied `userId` vertrouwen; geen nieuwe vrij toegankelijke routes.
- Als wizard gebroken wordt door navigatie of een mislukte save, geen half doel met openstaande transactie en geen stille duplicatie.

### Dataoverdracht en privacy
- `src/app/dashboard/doelen/page.tsx`: voeg alleen veilige velden toe aan doel-/actie-DTO (strings, integers, nulls), laat Prisma `Date` aan serverzijde.
- `src/lib/export-personal-data.ts`: neem nieuwe velden in **JSON-export** op; bestaande `mijn-leefstijl-json`-versie expliciet overwegen te bumpen als afnemers op contract rekenen.
- `src/lib/pdf-personal-report.ts`: alleen beknopte *gekozen* doel-/actiecontext (bij voorkeur doelzin en 'wanneer') wanneer zinvol voor doelenoverzicht; plan-B/obstakel/motivatie zijn potentieel persoonlijk, dus niet automatisch in een deelbare PDF dumpen. Verzoek om expliciet ontwerpbesluit vóór toevoeging van private teksten.
- Geen ruwe vrije-tekstwaarden in auditlogs, URLs, browseranalytics of CI.
- Bestaande doelen, actiehistorie, weekreflecties en CooL-bijeenkomsten blijven intact; rollback draait appversie terug zonder automatisch gedropte gebruikerskolommen.

## 6. Hergebruik/licentie-afweging

- **Gebruik wat al bestaat:** React state en Server Actions (Next.js), `GoalsOverview` native dialog/bottom-sheet, shadcn/ui, Lucide, Prisma 7/PostgreSQL. Geen nieuwe dependency vereist voor een 4-stapsformulier.
- **Kandidaat bekeken:** React Hook Form (MIT) / Zod (MIT) staan als mogelijke OSS-opties in `docs/REUSE_AND_LICENSES.md`, maar leveren voor vier korte schermen nog niet aantoonbaar voordeel boven bestaande state en `goals-domain.mjs`-validatie. Alleen toevoegen bij een concrete beperking. Werkelijke licentie/versie altijd verifiëren vóór dependencytoevoeging.
- Geen code/assets gekopieerd; nieuwe documentatie is eigen projectwerk (AGPL-3.0-only).

## 7. Implementatievolgorde met minimale mergeconflicten

1. **Voorbereiding (deze branch):** alleen dit ontwerpdocument. Geen productiecode, geen schema, geen deploymentwijzigingen.
2. **PR A — datamodel/domein/backend:** schema + migratie + tests, parser, atomair opslaan van doel-met-actie, JSON-export en query/DTO's. Separaat te reviewen; bestaande formulieren blijven bruikbaar.
3. **PR B — wizard en snelroute:** losse wizardcomponent; doel-en-actie-op-zelfde-eindscherm; deelstappen; conditionele scorevragen; mobiel; aanpassen in bestaande details.
4. **PR C — verfijning:** eventuele optionele reflectiecontext en selectieve PDF-presentatie, usabilitytesten. Geen blokkade voor eerste wizardrelease.

**Niet mergen zonder review** en pas na rekening houden met #6 en #7. Deze voorbereidende PR mag los van die features besproken worden.

## 8. Testmatrix (voor implementatie-PR's)

| Scenario | Verwacht |
| --- | --- |
| Snel doel/action | Even snel als huidige flow; geen nieuwe verplichte vragen |
| Eerste begeleide doel + actie | Beide in één transactie en na refresh terug te vinden |
| Begeleid doel zonder actie | Alleen doel bestaat |
| Bestaand doel + begeleide actie | Geen extra doel, geen cross-user koppeling |
| Score blanco/1/6/7/10 | Correcte, vriendelijke condities en opslag |
| Score 0/11/3.5/tekst/array | Server accepteert niet; DB CHECK begrenst integers |
| Plan B uitklappen, dicht, stap terug | Gegevens blijven behouden; geen stille tekstwijzigingen |
| Sluiten met wijzigingen / save failure | Niet ongemerkt data kwijt of dubbel opgeslagen |
| Doel bewerken / actie frequentie wijzigen | Historische weeksnapshots blijven onveranderd |
| Bestaande gebruiker met oude records | Alles blijft zichtbaar; optionele velden `null` |
| Account A vs B | Geen toegang of mutatie op andermans records |
| JSON-export / deelbare PDF | Nieuwe velden veilig verwerkt, geen lege blokken of afgebroken tekst |
| 320/375/390/430px, desktop, 200% zoom | Geen horizontaal scrollen; focus, ESC, toetsenbord, schermlezer |
| `npm run lint`, `npm run typecheck`, unit+DB smoke, `npm run build` | Groen, geen dependency-upgrades |

## 9. Nog te toetsen vóór implementatie

- Wordt 'begeleid' eerste-doel-standaard alleen bepaald door `active goals = 0`, of ook via eigen voorkeur? **Start met eerste optie; geen voorkeurinstelling nodig.**
- Mag een plan-B-actie meetellen? **Niet stilzwijgend in MVP veranderen; later een expliciete keuze voor aangepaste uitvoering ontwerpen.**
- Verandert scorehistorie in toekomst? **Eerste iteratie slaat huidige score op; geen onnodig meetsysteem.**

**Productacceptatie:** nieuwe gebruiker kan in vier overzichtelijke schermen een eigen doel én passende eerste actie opstellen; terugkerende gebruiker kan het snel doen; het dagelijkse afvinken blijft dezelfde één-tik-ervaring.
