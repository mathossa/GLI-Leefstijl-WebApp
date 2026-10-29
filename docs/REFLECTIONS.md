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

## Inzichten, mobile-first

De inzichtenpagina toont nu twee compacte totalen, **Weken met activiteiten** en **Weekreflecties**. Een segmented control wisselt direct tussen de laatste 12 kalenderweken en de laatste 6 kalendermaanden, zonder lange dubbele lijsten. Ontbrekende registraties krijgen ‘Geen gegevens’ in plaats van 0%; de per-week/per-maand-balken tonen uitsluitend opgeslagen actievoortgang. Eigen JSON-export staat als afzonderlijk onderdeel onderaan.

Er zijn geen externe analyticsdiensten, medische aannames of nieuwe grafieklibraries toegevoegd. De persoonsgegevens blijven op de eigen PostgreSQL-database.

## Nieuwe wensen: PDF-export, privéfoto's en weekselectie

- **Eerdere weken** zijn te vinden via één horizontaal te swipen rij (51 vorige weken), met indicator `Ingevuld` of `Leeg`. Een tik opent direct de reflectie van die week. Geen extra selectie-popup of nested dropdown.
- **PDF-export** op `/api/export/pdf` is alleen beschikbaar na een Better Auth-sessie; A4 in de sage/cream-appstijl met titelpagina-achtige omslag, KPI's, actieve doelen, laatste 12 weekoverzichten, maximaal 12 recente reflecties en maximaal 24 recente CooL-bijeenkomsten. Bewust geen volledige persoonlijke historiebestanden of foto-bijlagen in een gemakkelijk te delen overzicht. De JSON-export blijft volledig.
- **Privéfoto's van papieren aantekeningen**: nieuw `MeetingPhoto`-model, maximaal 5 foto's per bijeenkomst, 8 MB per foto. JPEG/PNG/WebP en waar ondersteund HEIC. `sharp` heroriënteert, verkleint tot 1800x2400 en converteert naar WebP **zonder EXIF/GPS**. Originele uploads worden niet gepubliceerd en niet bewaard.
- Opslag buiten `public/`, standaard `.private-uploads/` voor lokaal testen. Op Docker/Portainer/VPS **verplicht een persistente, private volume** configureren via `PRIVATE_UPLOAD_DIR`. Databasebackups bevatten alleen fotometadata: ook het volume moet worden meegenomen in backup/restore.
- De beveiligde afbeeldingsroute controleert de sessie en de eigenaar bij ieder verzoek. Geen publieke URLs zonder autorisatie, `private, no-store`, geen openbare static files.
- Een bijeenkomst kan zonder getypte notitie worden aangemaakt als er een foto wordt bewaard. Foto's kunnen meteen bij het aanmaken of later vanuit de bijeenkomst worden toegevoegd/verwijderd.
- **OCR nog niet geactiveerd**. Onderzochte opties: PaddleOCR (Apache-2.0, eerste kandidaat voor handschrift), TrOCR (Microsoft/Hugging Face, gespecialiseerde handschriftherkenning met modellicenties afzonderlijk te toetsen), Tesseract.js (Apache-2.0, vooral drukwerk; eigen FAQ raadt handschrift af). Aanbevolen later proces: optioneel lokaal OCR uitvoeren > herkende tekst controleren > gebruiker laat expliciet overnemen naar de notitie. Geen externe cloudupload van privéfoto's.
- De CI test nu private fotolevering (zonder login 401, ander account 404), de complete eigen JSON-export en werkelijke PDF-response voor twee ingelogde gebruikers, plus alle eerdere veiligheidstests.

## Ontwerp B: PDF en ISO-weken (goedgekeurd)

- Deelbare PDF in de **frisse, speelse B-stijl**: rustige ivoor-achtergrond, mintkleurige header met weeknummer en donut, **één pastelkleurige kaart per actief doel**, alle weekacties en hun huidige aantallen/progressbars direct onder het doel. De kaarten worden in groepen van maximaal vier acties gesplitst wanneer een doel te groot is; er wordt geen actie afgekapt.
- Een aparte sectie **Terugblik & reflectie** toont alleen daadwerkelijk geregistreerde weken (geen `Geen gegevens`-rijen), en daarna de echte weekreflecties en CooL-bijeenkomsten als gekleurde, dynamisch paginerende kaarten. Bij langere tekst worden vervolgkaarten gebruikt; originele privéfoto’s blijven bewust buiten de deelbare PDF.
- Niet-relevante bijzinnen, `Over dit verslag` en lege reflectiesecties zijn verwijderd. De export bevat een compacte samenvatting, geen medische conclusies.
- Dezelfde centrale `isoWeekLabel`-helper toont **`Week NN · ISO-jaar`** in Vandaag, Mijn doelen, Reflectie, Inzichten en de PDF. ISO-weekjaar volgt de donderdagregel, ook wanneer bijvoorbeeld 30 december al bij week 1 van het nieuwe jaar hoort.
- CI controleert week 53, jaarwisselingen, zomer-/wintertijd en een synthetische PDF met drie actieve doelen; de echte PDF-response wordt geopend met `pdf-lib`.
