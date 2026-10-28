# Doelen, weekacties en registratie — issue #4

## Werking

- Onder **Mijn doelen** maak je persoonlijke doelen aan met motivatie, gebied en optionele datums. Wijzigingen en archiveren bewaren de historische actiegegevens.
- Een actief doel heeft maximaal 12 actieve weekacties, een gebruiker maximaal 20 actieve doelen. Frequenties zijn 1 t/m 7 per week; een voortgangswaarde is 0 t/m de voor die week vastgelegde frequentie.
- **De week begint maandag 00:00 in Europe/Amsterdam.** De berekening gebruikt de kalenderdatum in die zone (ook rond zomertijd/wintertijd) en slaat de maandag als PostgreSQL DATE op. Er is dus geen achtergrondjob of fysieke reset nodig.
- Bij wijzigen van een actie wordt de oude target eerst als snapshot voor de huidige week vastgelegd. Een gewijzigde frequentie geldt vanaf de volgende maandag. Bestaande weekregistraties en notities blijven ongewijzigd.
- Vorige geregistreerde weken blijven zichtbaar (de recentste acht per actie). Geen reset die data verwijdert. Gearchiveerde doelen en acties worden leesbaar bewaard, niet meer bewerkbaar.

## Security en privacy

- Server Actions gebruiken Better Auth via `requireSession`; userId komt **uitsluitend** uit de server-sessie en nooit uit formulierdata.
- DB-read/update is altijd `userId`-scoped; ook geneste acties en weekregistraties. In PostgreSQL zijn samengestelde foreign keys `(goalId,userId)` en `(actionId,userId)` toegevoegd om kruiselingse eigenaarschap-links te blokkeren, óók buiten de app.
- Er is geen API die data van andere gebruikers teruggeeft. Testfixtures zijn volledig fictief; de databasetest rolt alle mutaties terug. Er worden geen persoonlijke waarden in URLs of logs opgenomen.
- Onjuiste invoer geeft een generieke melding zonder serverdetails. Database CHECK-constraints beschermen het datamodel ook tegen schrijvers buiten de UI.

## Testen en deployen

1. `npm ci && npm run db:generate && npm run db:deploy` op een **test**-database of de CI PostgreSQL 17-container.
2. `node --test tests/goals-domain.test.mjs`: weekgrenzen inclusief DST, datums, validatielimieten en verplichte eigenaarspredicaten.
3. `node scripts/smoke-goals-db.mjs`: foreign keys, getalslimieten en gebruikersisolatie op een tijdelijke transactie.
4. `npm run lint && npm run typecheck && npm run build`.
5. Log in met twee testaccounts; controleer doel CRUD/archief, dat de ander geen doelen ziet, acties 1–7, historie na revisie en weekreset na maandag.

**Productie:** eerst een PostgreSQL-backup en herstelmogelijkheid controleren, daarna de additieve migratie toepassen via `npm run db:deploy`. Bestaande Better Auth-tabellen blijven intact. Terugval: appversie terugrollen; behoud nieuwe tabellen voor latere herdeploy (niet automatisch droppen omdat ze gebruikersgegevens bevatten).

**REUSE FIRST:** bestaande Next.js Server Actions, Better Auth, Prisma 7, PostgreSQL, shadcn/ui en Lucide hergebruikt. Geen extra libraries of code/assets van derden gekopieerd. Kleine domeinvalidatie en weeklogica zijn eigen projectcode onder AGPL-3.0-only.

**Integratie:** de oudere Vandaag-pagina heeft nog expliciet fictieve voorbeeldgewoonten. In deze issue is de pagina **Doelen** zelf volledig persistent; vervanging van het Vandaag-overzicht moet apart met dashboardwerk (#3) worden afgestemd.
