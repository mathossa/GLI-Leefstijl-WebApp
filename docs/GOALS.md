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

## Definitief mobiel ontwerp (#4)

- **Eén motiverende zin** in de welkomstkaart; geen tweede motiverende balk onderaan en geen herhalende aanmoedigingen in de zijbalk.
- **Drie compacte statistiekkaarten** in één rij, ook vanaf 320px. Titels en aantallen mogen niet uit hun kaarten lopen.
- **Vandaag afvinken** toont alleen de actietitel, voluit over de gehele kaartbreedte (met regelafbreking waar nodig). De doelnaam staat bewust niet op de startpagina maar wel in de review-popup.
- De tweede rij heeft links `x/y deze week` met een progressbar, rechts twee grote knoppen: de terugdraaipijl en het groene vinkje. Tellers tonen direct de optimistische waarde; de server bewaakt eigenaarschap en limieten.
- Tikken op de actietitel opent de bestaande native `<dialog>`: op mobiel een bottom-sheet, op desktop een modal. Er zijn geen uitlegzinnen zoals ‘Tik voor je ervaring’ nodig.
- **Even stilstaan** wordt een enkele compacte link naar de reflectiepagina, zonder uitgebreide voorbeeldreflectie of herhaalde motiverende tekst.
- De lijst toont *alle* actuele weekacties, niet uitsluitend de eerste zes. Registratie blijft op Vandaag mogelijk zonder naar Doelen te navigeren.
- Oude demo-labels in header/zijbalk verwijderd. De bestaande Better Auth-controles en gescheiden beheeromgeving blijven intact.

### Handmatige acceptatie

Controleer 320px, 375px, 390px en 430px breedte, plus tablet en desktop. Nergens horizontaal scrollen of afgekapte titels, KPI's of knoppen. Probeer een actietitel met minimaal 80 tekens, zoom naar 200%, toets Tab/Enter/Escape in het reviewscherm, registreer tweemaal, draai een keer terug, voeg optionele feedback toe, herlaad de pagina en verifieer de opgeslagen data.

## Doelenoverzicht met mobiele bottom-sheets (PR #13)

- Het scherm **Mijn doelen** bestaat uit een compacte titel, één knop `Nieuw doel toevoegen`, en overzichtskaarten. Iedere kaart toont alleen naam, één regel motivatie, leefstijlgebied, aantal weekacties, optionele periode en voortgang; de pagina toont geen standaard open formulieren of weekdetails.
- **Doelkaart** opent een native bottom-sheet (desktop: modal). Daar zijn volledige motivatie, actiekaarten, doel bewerken, weekactie toevoegen en veilig archiveren zichtbaar.
- **Actiekaart** opent een volgende view in dezelfde sheet: weekteller, ervaringen, weekreflectie, bewerken en recente historie. Met de terugknop ga je naar het doel, niet terug naar de startpagina.
- Toevoegen/bewerken van doelen en acties, weekreflectie en ervaringen gebeuren in afzonderlijke sheet-views. Bestaande Next.js Server Actions en gebruikersisolatie blijven onveranderd; er zijn geen nieuwe dependencies of databasemigraties nodig.
- Motivatie is optioneel geworden, passend bij het goedgekeurde ontwerp; oude doelen blijven ongewijzigd.
- Ervaringen uit de meest recente geregistreerde weken blijven beschikbaar om te bekijken en te bewerken; het review-overzicht gebruikt de al bestaande feedbackcomponent.
- Mobiele acceptatie: 320/375/390/430px, scrollen in een open sheet, met Escape sluiten, terugnavigatie, aanmaken/bewerken/archiveren en gegevens na herladen. `Vandaag` mag visueel en functioneel niet veranderen.

## UX polish — 29 oktober 2026

- **Leefstijlgebied** kies je nu met zes goed aantikbare gekleurde knoppen (Beweging, Voeding, Slaap, Ontspanning, Sociaal, Anders), geen dropdown. De bestaande enum en PostgreSQL-data blijven intact. De gekozen waarde gaat als verborgen veld door dezelfde gevalideerde Server Action.
- **Ervaringen** opent direct een lijst met individuele uitvoeringen uit recente weken, inclusief lokale datum/tijd, beoordeling en notitie. Er zitten geen extra uitklapbare `details`-lagen meer tussen.
- Tik op een uitvoering om de **Hoe ging het?**-view te openen: drie gezichtjes voor goed / redelijk / lastig, plus optionele notitie, en één bewaarbutton. Terug gaat naar de ervaringenlijst; succesvol opslaan ververst de data.
- De bestaande Vandaag-review gebruikt dezelfde gedeelde beoordelingsknoppen. Bewaarlogica en gebruikersisolatie blijven bij Better Auth / Prisma; geen schemawijzigingen of dependencies.
- Handmatig te testen: gebiedsselectie bij aanmaken én bewerken, bewaren, ervaringenlijst met meerdere weken, openen/bewerken van een ervaring, Escape/terug, 320px-430px en 200% zoom.
