# Reflecties, CooL-bijeenkomsten, inzichten en JSON-export — #5

## Functies
- Per gebruiker één reflectie per Amsterdamse week (maandag 00:00 t/m zondag 23:59). Minstens één van drie tekstvelden wordt ingevuld. Huidige week aanpassen, eerdere weken teruglezen en opnieuw aanpassen, de afgelopen 11 ontbrekende weken achteraf invullen.
- CooL-bijeenkomsten: datum, titel, notities en optionele actiepunten; toevoegen, wijzigen of verwijderen.
- Wekelijkse trend over 12 weken en maandelijkse trend over 6 kalendermaanden uit de bestaande weekregistraties van #4. Berekening: som voltooide stappen / som historische weektargets. Geen registratie = geen percentage; een week wordt aan de maand van de maandag toegekend. Weken met daadwerkelijk ingevulde voortgang of notities worden geteld; een automatisch snapshot telt niet mee. Bestaande #4-gegevens blijven intact.
- Eigen machineleesbare export via `GET /api/export`: JSON met doelen, acties en volledige weekhistorie, reflecties en bijeenkomsten. Datumvelden hebben de vorm `YYYY-MM-DD`. Geen sessies, wachtwoorden of andere gebruikersprofielen.
- Geen gewicht, BMI, medische metingen of tracking. Optionele gezondheidsmetingen vallen buiten #5 en vergen vooraf een privacyreview.

## Security
Alle mutaties halen userId uitsluitend uit de server-side Better Auth sessie, en iedere read/update/delete wordt met userId gefilterd. De unieke reflectiesleutel bevat userId en weekStart. De export controleert dezelfde sessie en antwoordt zonder login met HTTP 401, met `Cache-Control: private, no-store` voor downloads. Geen nieuwe externe services of analytics.

## Migratie en terugval
Migratie `20261029003000_weekly_reflections_meetings` voegt twee tabellen met constraints toe, na de individuele actie-migratie van #4. Maak een backup vóór `npm run db:deploy`. De bestaande registratiegegevens worden niet aangepast.

## Reuse-first, licenties
Bestaande Next.js Server Actions, Better Auth, Prisma 7, PostgreSQL 17, shadcn/ui (MIT), Lucide (ISC) en de timezone-helper uit #4 hergebruikt. Recharts (MIT) beoordeeld, maar voor deze kleinschalige inzichten zijn toegankelijke tekstlijsten met eenvoudige CSS-balken beter: geen nieuwe afhankelijkheid of chart-framework. Er is geen code of asset van derden gekopieerd. Alle eigen projectcode blijft AGPL-3.0-only.

## Automatisch testen
```bash
npm ci
npm run db:generate
npm run db:deploy
node --test tests/goals-domain.test.mjs tests/reflections-domain.test.mjs
node scripts/smoke-goals-db.mjs
node scripts/smoke-reflections-db.mjs
npm run lint && npm run typecheck && npm run build
```

## Handmatig testen na #4 (met twee fictieve testaccounts)
1. Bewaar de huidige reflectie, wijzig één antwoord, controleer refresh en login opnieuw.
2. Vul vorige week in, wijzig en verwijder. Test met tweede account dat reflecties niet uitlekken.
3. Maak een bijeenkomstnotitie met actiepunten, wijzig de inhoud, verwijder die, controleer eigenaarschap.
4. Registreer actievoortgang via Doelen; controleer week-/maandpercentages en dat ontbrekende weken geen 0% zijn.
5. Download export met beide accounts; controleer dat alleen eigen gegevens, alle historie en geen auth-velden in JSON staan.
6. Test de export uitgelogd (401), mobiele breedte, toetsenbord, leesbaarheid en langere teksten.

**Integratie:** de recente #4-commits hebben ook de Vandaag-pagina aan echte doel- en weekregistraties gekoppeld. #5 gebruikt dezelfde historische registratiegegevens voor trends. De wijzigingen van #4 blijven onderdeel van de onderliggende PR.

## Definitieve #4-integratie

#5 gebruikt `HabitWeekEntry` uit #4. Een week telt voor de inzichten mee als `completedCount > 0`, er een weeknotitie bestaat, of er individuele entries zijn; een lege automatische target-snapshot telt niet mee. De eigen JSON-export bevat ook alle individuele uitvoeringen en bijbehorende optionele feedback. De actuele Vandaag- en Doelen-schermen blijven behouden.

## Mobile-first UX en exporttests

- Reflectie heeft nu een **compacte kaart voor deze week**, eerdere weekkaarten en een eenvoudige lijst met CooL-bijeenkomsten. Grote formulieren zitten in native bottom-sheets (desktop modal), met terugknop en sluitknop. Geen geneste accordion-machines.
- Per week zijn **wat ging goed, wat was lastig en volgende stap** te bewerken; ten minste één antwoord volstaat. Eerdere ontbrekende weken zijn via één keuzescherm invulbaar.
- Bijeenkomst toevoegen/bewerken en notities/actiepunten bekijken gebeurt via een sheet. Verwijderen vraagt bevestiging.
- De CI voert een echte HTTP-exporttest uit: 401 zonder login, een export voor administrator en gewone gebruiker, verifiëren dat hun gegevens niet mengen en dat individuele uitvoeringsfeedback, reflecties en bijeenkomstnotities wel in de JSON staan, maar authvelden niet.
