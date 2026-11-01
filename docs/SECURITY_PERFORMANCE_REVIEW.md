# Code-review beveiliging, betrouwbaarheid en snelheid — 1 november 2026

Basis: `main` op `4030da1443aa38779f9746ea568c7801f84cd949`. Wijzigingen staan op `fix/security-performance-review`; productie wordt niet automatisch gewijzigd.

## Bevindingen en oplossingen

| Onderdeel | Bevinding | Wijziging |
|---|---|---|
| Auth achter NPM | Een aangeleverde `X-Forwarded-For`-keten kan met de standaardinstelling geen betrouwbaar IP opleveren; Better Auth slaat dan IP-begrenzing over. | Alleen door NPM overschreven `X-Real-IP` vertrouwen; productie-auth weigert ontbrekend/ongeldig IP. Regressietest reproduceert het eerdere probleem. |
| Inlogbegrenzing | De standaard geheugenteller verdwijnt bij herstart en wordt niet gedeeld tussen processen. | Officiële Better Auth-databaseopslag en bijbehorend gegenereerd model; geen eigen authenticatie of extra service. |
| Browserbeveiliging | Applicatieheaders tegen framing en ongewenste doorverwijzing van referers ontbraken. | `frame-ancestors`, `X-Frame-Options`, `nosniff`, `no-referrer`, restricties op objecten/base/form en niet-gebruikte browserrechten. Dit is een gerichte CSP; geen volledige nonce-gebaseerde script-CSP. |
| Fotoquotum | Losse count/create kan gelijktijdige uploads voorbij vijf foto's laten komen. | Telling en metadata-insert in dezelfde serialiseerbare transactie, inclusief eigenaarschap. |
| Gedeeltelijk opslaan | Bijeenkomst/tekst werd opgeslagen voordat foto-opslag gereed was. Bij fout leek de hele bewerking mislukt, terwijl een deel al was opgeslagen. | Eerst foto voorbereiden, vervolgens bijeenkomst en metadata atomair opslaan. Afgewezen transacties ruimen het voorbereide bestand op. |
| Verwijderen versus uploaden | Metadata ophalen en bijeenkomst verwijderen waren losse operaties. | Samen in een serialiseerbare transactie; daarna bestanden opruimen. |
| Gelijktijdig afvinken | Serialiseerbare transacties hadden geen herstel voor Prisma `P2034`-conflicten. | Centrale helper met maximaal vier pogingen en korte backoff; uitsluitend reeds teruggedraaide databaseconflicten worden opnieuw geprobeerd. |
| Invoervalidatie | Verkeerd getypeerde optionele velden werden als leeg behandeld. | Bestanden/objecten afwijzen; geen onbedoeld wissen van antwoorden. ID-predicaten controleren ook runtime-types. |
| Uploadpaden/build | Dubbele padlogica en tracing-waarschuwingen; runtime-uploadpaden lieten Turbopack te veel projectbestanden meenemen. | Eén bestaande, gecontroleerde padhelper; runtime-opslag expliciet uitgesloten van buildtracing. |
| Beheeraccounts | Bij accountaanmaak vanaf pagina twee werd nogmaals de oude pagina opgehaald. | Alleen de juiste pagina verversen. |

## Snelheid en onderhoud

- `React.cache` deelt de sessiecontrole tussen layout en pagina binnen één render. Geen globale of blijvende cache voor gebruikerssessies.
- Quote en doelen worden parallel opgehaald op Vandaag.
- Overbodige `router.refresh()` verwijderd na afvinken, ervaringsfeedback en motivatie opslaan: de bestaande Server Action met `revalidatePath` stuurt de bijgewerkte UI al terug.
- Registratiequeries filteren expliciet op eigenaar en halen voor de doelenpagina alleen benodigde registratievelden op.
- Het statische SVG-logo wordt eenmaal per proces naar PNG omgezet voor PDF's. Iedere persoonlijke PDF en de bijbehorende data worden opnieuw opgebouwd; geen gedeelde persoonsgegevenscache.
- Ongebruikte imports/types en bestaande lintwaarschuwingen opgeruimd.
- Lokale standalone-output daalde na de tracingcorrectie van ongeveer 71 naar 68 MiB. Dit is de standalone-output, niet de totale Docker-image. Geen ongefundeerde procentuele claim over de snelheid op de VPS; daarvoor is een meting met representatieve data nodig.

## Controles

- Unit-tests voor domeinregels, datums/DST, SMTP, uploadpaden, proxy-identiteit en begrensde transactieretries.
- ESLint, TypeScript, Prisma-generatie en productiebuild.
- Bestaande HTTP-smoke: gesloten registratie, rollen, exportisolatie, PDF-inhoud/paginering, privéfoto's, accountbeheer en bestandopruiming.
- Nieuwe HTTP-smoke tegen de productiebuild: beveiligingsheaders, origincontrole, ontbrekend proxy-IP, gelijktijdige inlogpogingen met vervalste forwarded headers en database-teller, fotoquotum/rollback/opruiming, afvinken en anonieme mutaties.
- GitHub Actions voert de nieuwe regressies uit tegen de bestaande tijdelijke PostgreSQL 17-service en controleert de container/migraties/backups. De PR-checks zijn leidend voor deze integratietests; lokale PGlite is niet gelijkwaardig voor gelijktijdige verbindingen.
- `npm audit --omit=dev`: **0 bekende meldingen** op controlemoment. Dit is geen bewijs dat de applicatie vrij is van kwetsbaarheden.
- Volledige `npm audit`: **16 moderate package-meldingen door één minimatch-advisory** (`GHSA-g3hv-75wg-m249`) in de ontwikkeltoolketen. Geen high/critical. De geadviseerde automatische fixes veranderen incompatibel de ESLint/Next-toolketen. Niet blind geforceerd of verborgen met een audit-uitzondering. Geen app-route accepteert globpatronen. Let op: de huidige Dockerfile kopieert voor de Prisma/Better Auth-CLI's ook devDependencies naar de image; `--omit=dev` beschrijft dus niet alle pakketten in de image.
- Bestaande licentie-inventaris: geen ontbrekende/geblokkeerde pakketlicenties. Geen nieuwe dependency of overgenomen externe broncode.

## Deployment en terugval

Maak zoals gebruikelijk een database- en uploadbackup. De nieuwe migratie is additief en wordt door de bestaande startup toegepast. Controleer bij testen via NPM vooral inloggen, snel afvinken/undo, een bijeenkomst met foto opslaan, limiet van vijf foto's, eigen quote en PDF delen op iPhone. Er is geen extra service/container nodig.

Bij terugval kan de vorige app-image blijven werken met de extra tabel aanwezig. Verwijder de tabel niet voor een gewone code-terugval. Auth-API-toegang in productie vereist vanaf deze versie de door de vertrouwde proxy ingestelde `X-Real-IP`; zie `DEPLOYMENT.md`.

Bestandssysteem en PostgreSQL vormen geen gezamenlijke transactie. Een harde processtop tussen het voorbereiden van een bestand en de databasecommit kan een verweesd privébestand achterlaten; gewone foutpaden ruimen dit op. Ook een fout tijdens fysiek verwijderen na de databasecommit blijft een operationeel opruimpunt.

## Resterende verbeterpunten

- De minimatch-melding oplossen via een afzonderlijk compatibel geteste toolchain-upgrade/backport zodra beschikbaar; ook de noodzaak van alle devDependencies in de runtime-image opnieuw beoordelen.
- Bij grote archieven doelen/bijeenkomsten en exports pagineren of streamen; bestaande inhoud wordt in deze review niet stilzwijgend afgekapt.
- PDF-generatie en beeldverwerking hebben invoerlimieten, maar nog geen gedeeld quotum voor totale CPU/opslag per gebruiker.
- TLS, NPM-headers, schijf-/backupencryptie en restorebeleid op de echte VPS zijn niet vanuit deze repository te bewijzen. Deze wijziging voegt geen encryptie van leefstijlgegevens of foto's toe.

## Hergebruik en bronnen

Gekozen: bestaande Better Auth 1.7.14-rate limiter/CLI (MIT), Prisma 7-transacties (Apache-2.0), React-cache (MIT), Next.js-headers/revalidatie (MIT), sharp (Apache-2.0) en de bestaande privépadhelper. Maatwerk beperkt zich tot domeintransacties, begrensde conflict-herpogingen en regressietests. Voor de HTTP-tests wordt React's eigen reply-encoder uit de reeds gepinde Next-distributie hergebruikt.

- https://better-auth.com/docs/concepts/rate-limit
- https://better-auth.com/docs/reference/security
- https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions
- https://nextjs.org/docs/app/api-reference/config/next-config-js/headers
- https://nextjs.org/docs/app/api-reference/functions/revalidatePath
- https://react.dev/reference/react/cache
- https://github.com/advisories/GHSA-g3hv-75wg-m249
