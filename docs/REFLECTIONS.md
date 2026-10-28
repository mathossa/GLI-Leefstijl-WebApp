# Reflecties, CooL-bijeenkomsten, inzichten en JSON-export — #5

## Functies
- Per gebruiker één reflectie per Amsterdamse week (maandag 00:00 t/m zondag 23:59). Minstens één van drie tekstvelden wordt ingevuld. Huidige week aanpassen, eerdere weken teruglezen en opnieuw aanpassen, de afgelopen 11 ontbrekende weken achteraf invullen.
- CooL-bijeenkomsten: datum, titel, notities en optionele actiepunten; toevoegen, wijzigen of verwijderen.
- Wekelijkse trend over 12 weken en maandelijkse trend over 6 kalendermaanden uit de bestaande weekregistraties van #4. Berekening: som voltooide stappen / som historische weektargets. Geen registratie = geen percentage; een week wordt aan de maand van de maandag toegekend.
- Eigen machineleesbare export via \`GET /api/export\`: JSON met doelen, acties en volledige weekhistorie, reflecties en bijeenkomsten. Datumvelden hebben de vorm \`YYYY-MM-DD\`. Geen sessies, wachtwoorden of andere gebruikersprofielen.
- Geen gewicht, BMI, medische metingen of tracking. Optionele gezondheidsmetingen vallen buiten #5 en vergen vooraf een privacyreview.

## Security
Alle mutaties halen userId uitsluitend uit de server-side Better Auth sessie, en iedere read/update/delete wordt met userId gefilterd. De unieke reflectiesleutel bevat userId en weekStart. De export controleert dezelfde sessie en antwoordt zonder login met HTTP 401, met \`Cache-Control: private, no-store\` voor downloads. Geen nieuwe externe services of analytics.

## Migratie en terugval
Migratie \`20261029002000_weekly_reflections_meetings\` voegt uitsluitend twee tabellen en hun constraints toe. Eerst PostgreSQL-backup en restoreprocedure testen, daarna \`npm run db:deploy\`. Bij rollback de nieuwe tabellen niet automatisch droppen, want ze kunnen persoonlijke notities bevatten. Branch is gebaseerd op #4 en wordt pas geïntegreerd als #4 is gemerged.

## Reuse-first, licenties
Bestaande Next.js Server Actions, Better Auth, Prisma 7, PostgreSQL 17, shadcn/ui (MIT), Lucide (ISC) en de timezone-helper uit #4 hergebruikt. Recharts (MIT) beoordeeld, maar voor deze kleinschalige inzichten zijn toegankelijke tekstlijsten met eenvoudige CSS-balken beter: geen nieuwe afhankelijkheid of chart-framework. Er is geen code of asset van derden gekopieerd. Alle eigen projectcode blijft AGPL-3.0-only.

## Automatisch testen
\`\`\`bash
npm ci
npm run db:generate
npm run db:deploy
node --test tests/goals-domain.test.mjs tests/reflections-domain.test.mjs
node scripts/smoke-goals-db.mjs
node scripts/smoke-reflections-db.mjs
npm run lint && npm run typecheck && npm run build
\`\`\`

## Handmatig testen na #4 (met twee fictieve testaccounts)
1. Bewaar de huidige reflectie, wijzig één antwoord, controleer refresh en login opnieuw.
2. Vul vorige week in, wijzig en verwijder. Test met tweede account dat reflecties niet uitlekken.
3. Maak een bijeenkomstnotitie met actiepunten, wijzig de inhoud, verwijder die, controleer eigenaarschap.
4. Registreer actievoortgang via Doelen; controleer week-/maandpercentages en dat ontbrekende weken geen 0% zijn.
5. Download export met beide accounts; controleer dat alleen eigen gegevens, alle historie en geen auth-velden in JSON staan.
6. Test de export uitgelogd (401), mobiele breedte, toetsenbord, leesbaarheid en langere teksten.

**Integratiebeperking:** de Vandaag-pagina toont in #4 nog expliciete demo-gewoonten; #5 maakt die pagina niet live.
