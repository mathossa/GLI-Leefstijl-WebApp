# Doelen, weekacties en registratie — issue #4

## Werking

- **Vandaag = doen**: elke weekactie heeft een `Gedaan`-knop die met één tik direct een uitvoering vastlegt, zonder verplichte notitie, beoordeling of formulier. De teller werkt direct bij en het weekoverzicht volgt automatisch. Zodra het weekdoel is bereikt, is de knop uitgeschakeld. Via `Laatste ongedaan maken` corrigeer je een verkeerde tik; alleen nieuwe individuele registraties kunnen worden teruggedraaid, geen oudere weektotalen zonder individuele entries.
- **Mijn doelen = overzicht en beheer**: doelen en hun acties worden compact getoond. Grote invoerformulieren zijn standaard ingeklapt, onder `Nieuw doel toevoegen`, `Doel bewerken`, `Weekactie toevoegen` en `Actie bewerken`.
- Onder **Mijn doelen** maak je persoonlijke doelen aan met motivatie, gebied en optionele datums. Wijzigingen en archiveren bewaren de historische actiegegevens.
- Een actief doel heeft maximaal 12 actieve weekacties, een gebruiker maximaal 20 actieve doelen. Frequenties zijn 1 t/m 7 per week; een voortgangswaarde is 0 t/m de voor die week vastgelegde frequentie.
- **De week begint maandag 00:00 in Europe/Amsterdam.** De berekening gebruikt de kalenderdatum in die zone (ook rond zomertijd/wintertijd) en slaat de maandag als PostgreSQL DATE op. Er is dus geen achtergrondjob of fysieke reset nodig.
- Bij wijzigen van een actie wordt de oude target eerst als snapshot voor de huidige week vastgelegd. Een gewijzigde frequentie geldt vanaf de volgende maandag. Bestaande weekregistraties en notities blijven ongewijzigd.
- Elke nieuwe tik op `Gedaan` maakt een afzonderlijk tijdgestempeld `HabitWeekEntry`-record. Bij zo'n uitvoering kun je **optioneel** kiezen hoe het ging (goed, redelijk, lastig) en een korte toelichting toevoegen. Deze feedback verandert de voortgangsteller niet. Het ongedaan maken van de laatste tik verwijdert die ene entry inclusief bijbehorende feedback; oudere weektotalen blijven staan.
- Daarnaast is er **apart** een vrije weekreflectie per actie. Het bewaren of aanpassen daarvan overschrijft geen uitvoering of per-keerervaring.
- Vorige geregistreerde weken blijven zichtbaar (de recentste acht per actie). Geen reset die data verwijdert. Gearchiveerde doelen en acties worden leesbaar bewaard, niet meer bewerkbaar.
- **Bestaande registraties blijven bestaan:** de oude `completedCount`-totalen en weeknotities blijven intact. We fabriceren geen individuele uitvoeringsmomenten voor oude totalen; de lijst met individuele ervaringen start bij nieuwe afvinkingen.

## Security en privacy

- Server Actions gebruiken Better Auth via `requireSession`; userId komt **uitsluitend** uit de server-sessie en nooit uit formulierdata.
- DB-read/update is altijd `userId`-scoped; ook geneste acties, weekregistraties en individuele uitvoeringen. In PostgreSQL zijn samengestelde foreign keys `(goalId,userId)`, `(actionId,userId)` en `(weekId,userId)` toegevoegd om kruiselingse eigenaarschap-links te blokkeren, óók buiten de app.
- Er is geen API die data van andere gebruikers teruggeeft. Testfixtures zijn volledig fictief; de databasetest rolt alle mutaties terug. Er worden geen persoonlijke waarden in URLs of logs opgenomen.
- Onjuiste invoer geeft een generieke melding zonder serverdetails. Database CHECK-constraints beschermen het datamodel ook tegen schrijvers buiten de UI.

## Testen en deployen

1. `npm ci && npm run db:generate && npm run db:deploy` op een **test**-database of de CI PostgreSQL 17-container.
2. `node --test tests/goals-domain.test.mjs`: weekgrenzen inclusief DST, datums, validatielimieten en verplichte eigenaarspredicaten.
3. `node scripts/smoke-goals-db.mjs`: foreign keys, getalslimieten en gebruikersisolatie op een tijdelijke transactie.
4. `npm run lint && npm run typecheck && npm run build`.
5. Test handmatig: `Vandaag` heeft per weekactie één `Gedaan`-knop. Tik één keer, controleer teller zonder invoer, ververs en controleer persistentie; tik opnieuw en controleer nieuwe individuele registratie. Voeg bij één uitvoering `Ging goed` en een notitie toe, laat een andere zonder feedback. Controleer ze later terug. Vul de weekreflectie in en controleer dat per-keerfeedback behouden blijft.
6. Controleer dat het weekdoel niet kan worden overschreden, dat grote formulieren standaard ingeklapt zijn, dat archiveren en wijzigingen de historie bewaren en dat een tweede account de data van een ander niet kan zien.

**Productie:** eerst een PostgreSQL-backup en herstelmogelijkheid controleren, daarna de additieve migratie toepassen via `npm run db:deploy`. Bestaande Better Auth-tabellen blijven intact. Terugval: appversie terugrollen; behoud nieuwe tabellen voor latere herdeploy (niet automatisch droppen omdat ze gebruikersgegevens bevatten).

**REUSE FIRST:** bestaande Next.js Server Actions, Better Auth, Prisma 7, PostgreSQL, shadcn/ui en Lucide hergebruikt. Geen extra libraries of code/assets van derden gekopieerd. Kleine domeinvalidatie en weeklogica zijn eigen projectcode onder AGPL-3.0-only.

**Integratie met #3:** de pagina **Vandaag** verzorgt dagelijkse one-tap registratie en toont eigen doelen en voortgang van de huidige Nederlandse kalenderweek, met een lege toestand voor nieuwe accounts. **Doelen** is het compacte overzicht met uitgeklapt beheer, per-uitvoeringfeedback en weekreflectie. De aparte Reflectie/Inzichten-pagina's blijven expliciet fictieve voorbeelden tot #5.

## Mobiel ontwerp (goedgekeurde conceptweergave)

- De drie weekcijfers zijn op telefoonbreedte compact naast elkaar zichtbaar.
- Iedere weekactie toont bovenaan in kleine letters de **doelnaam** en daaronder de actie; een duidelijk groen **vinkje** registreert direct, de **terugdraaipijl** herstelt de laatste tik.
- Een tik op de actienaam opent een **native HTML-dialog** als bottom-sheet op mobiel en een gecentreerde modal op grotere schermen. De sheet ondersteunt ESC, backdrop-click, toetsenbordfocus en zichtbare sluitknop; geen extra JS/UI-library nodig.
- In de sheet kies je desgewenst goed/redelijk/lastig en een notitie bij een van de recente uitvoeringen. Het sluiten zonder opslaan verandert de bestaande registratie niet.
- Het overzicht toont geen reeks opengeklapte review-formulieren: alleen de actiekaart. De registratie blijft één tik en feedback is optioneel.
- Test het ontwerp op 320px/375px/390px/430px, bij 200% zoom en met uitsluitend toetsenbord (focus, dialog-open/close en review opslaan), plus per ongeluk afvinken en terugdraaien.
