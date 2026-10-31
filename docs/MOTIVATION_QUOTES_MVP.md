# Motivatiequotes — #15 eerste testversie

## Wat deze branch oplevert
- **Vandaag** toont een korte motivatiezin, met een kleine knop **Motivatie aanpassen**. De mobiele pop-up hergebruikt de bestaande `review-dialog` en invoervelden zijn 16px voor iPhone Safari.
- **Dagelijks nieuw** (standaard): 30 originele, Nederlandstalige startteksten in PostgreSQL. Per Amsterdamse kalenderdag komt één tekst in `daily_motivation_quote`; geen externe API of cron. Bij iedere nieuwe bezochte dag worden de vorige max. 29 gebruikte IDs meegenomen om herhalingen te voorkomen. Datums worden bepaald met `Europe/Amsterdam` (ook bij zomertijd).
- **Eigen tekst**: max. 300 tekens, privé per Better Auth-user; alleen de ingelogde gebruiker kan via de serveractie zijn eigen tekst aanpassen. Terugschakelen naar AUTO verwijdert de tekst niet.
- De migratie `20261031_motivation_quotes_mvp` maakt drie nieuwe tabellen; bestaande data blijft ongemoeid. De 30 starters worden eenmalig via SQL ingevoegd en overschrijven latere wijzigingen niet. Bestaande dagteksten zijn snapshots.
- Valt de hele bibliotheek weg/inactief, dan toont de app de rustige fallback `Kleine stappen in je eigen tempo.`.

## Testen
- `node --test tests/motivation-quote-domain.test.mjs` (datumgrenzen, DST, rotatie en 30 teksten).
- `node scripts/smoke-motivation-db.mjs` op een wegwerp-PostgreSQL met alle migraties (fictieve data; transactie wordt teruggedraaid).
- In CI: Prisma-validatie, `db:generate`, `db:deploy`, lint, typecheck en Next.js build.
- Handmatig: open Vandaag op iPhone/desktop, wissel AUTO → CUSTOM → AUTO → CUSTOM, refresh en login op tweede device, test tweede account en check dat een fout niet de invoer laat verdwijnen. Test lokale datumwissel en Safari (geen automatisch inzoomen).

## Deployment/rollback
- Maak vóór productie-uitrol een databasebackup. Bij Portainer start de bestaande `start-container.sh` met `prisma migrate deploy` vóór de app. Database tabellen blijven staan bij terugschakelen naar een vorige app-image; voor een echte schema-rollback is een gecontroleerd backup-/migratieplan nodig.
- Geen extra containers, npm-dependencies, secrets, externe quoteproviders of dataverzameling.

## Bewuste scope voor volgende iteratie
- Nog **geen** `/admin/quotes` CRUD/import/export of uitgebreide redactionele 120-quote bibliotheek; deze zijn onderdeel van vervolgwerk in #15 en niet klaar voor merge zonder review.
- De selectie houdt rekening met actieve quotes, maar bij grote gelijktijdige wijzigingen in de bibliotheek kan een kortere rotatie ontstaan. Admin-edit-tests volgen wanneer het beheerscherm wordt gebouwd.

## Reuse en licenties
Next.js App Router, Better Auth/Admin-role infrastructuur, Prisma, bestaande Radix-vrije native `<dialog>` patroon, Lucide en Tailwind zijn reeds aanwezig. Geen extra library nodig. Quote-inhoud is nieuw geschreven, niet gekopieerd van Pinterest/Reddit of GLI-bronnen. Projectcode valt onder AGPL-3.0-only.
