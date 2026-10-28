# Architectuur (ADR-001) — besluit, 2026-10-28

## Doel en scope

Een persoonlijke GLI CooL-webapp voor eigen gebruik met groeioptie naar meerdere gebruikers (geen coachportaal in MVP). Een kalm welzijnsdesign, snelle dagelijkse acties, reflectie en trendinzichten. Geen medisch advies.

## Componenten

```text
Browser/PWA -- HTTPS reverse proxy --> Next.js (App Router)
                                           |-- Better Auth + Admin plugin
                                           |-- Server-side domain services
                                           |-- SMTP adapter -> configured relay (optional)
                                           |
                                           +--> Prisma 7 --> PostgreSQL 17
```

- Next.js, React, TypeScript en Tailwind: standaard frameworks, App Router.
- shadcn/ui (MIT), Lucide React (ISC): herbruikbare UI, geen eigen componentframework.
- Better Auth: wachtwoorden, cookies, sessies, adminrol en eerste-admin CLI. Afgezonderde adminroutes en check in server-side handlers.
- Prisma ORM **7** + `@prisma/adapter-pg`: compatibel met actuele Better Auth Prisma Client-adapter. Prisma 8 pas evalueren na aantoonbare Better Auth-ondersteuning. [Prisma integratie](https://www.prisma.io/docs/guides/authentication/better-auth/nextjs).
- PostgreSQL 17: persistent volume; niet publiek bereikbaar.
- Nodemailer: mail uitsluitend via geconfigureerde SMTP-relay; SMTP niet vereist voor opstarten.

## Data en verantwoordelijkheden

- User/Session/Account/Verification: **Better Auth beheerde modellen**; genereer auth-schema met officiële CLI en pas migrations toe.
- Goal: eigenaar, naam, motivatie, leefstijlgebied, status, start/optionele einddatum.
- HabitAction: doel, frequentie per week, archiefstatus; veranderbaar zonder historie te wissen.
- HabitCheckIn: actie, tijdstip, optionele notitie; unieke/relevante registratieregels per type.
- WeeklyReflection: per gebruiker/week, successen, belemmeringen, volgende stap.
- MeetingNote: eigen bijeenkomstnotities en actiepunten.
- AdminMailSettings: niet-geheime SMTP-metadata + versleutelde credential.
- AdminAudit: wie/wat/wanneer, zonder credentials/gevoelige request payloads.

Domeinmodellen worden pas in implementatie-PRs definitief na toetsing op eenvoud en migratie.

## Identity, veiligheid en privacy

- Public sign-up is **server-side disabled** (endpoint blokkeren, niet alleen knop verbergen).
- First admin via officiële Better Auth CLI `create-admin` nadat schema is gemigreerd; werking zonder SMTP.
- Elke serveraction/route valideert actieve sessie, eigenaarschap en rol. Verberg health data van andere users; nooit direct op onbetrouwbare userId uit request vertrouwen.
- Door het karakter van leefstijlgegevens: dataminimalisatie, expliciet optionele metingen, export/verwijdering, geen tracker analytics, strikte logs en backups, HTTPS.
- Geen echte persoonsgegevens in repo of screenshots. Test met fictieve data.
- CI en dependencies gescand; never commit .env/keys.

## E-mail (keuze)

De app wordt **geen mailserver** en verstuurt niet rechtstreeks via MX of poort 25. Admin configureert host, poort, STARTTLS of implicit TLS, gebruikersnaam, credential en afzender. Het geheim wordt op serverniveau versleuteld met AES-256-GCM en een aparte key uit runtime secrets; nooit teruggegeven aan client of logs. Testmail alleen admin, input gevalideerd en rate-limited. Zonder relay werken login, doelentracker en beheer; reset/verify via e-mail is dan niet beschikbaar.

## Deployment

- VPS met Portainer; Docker Compose app+PostgreSQL 17, intern netwerk en volume.
- Reverse proxy beheert TLS. Geen publieke PostgreSQL-poort.
- Migraties gecontroleerd uitvoeren in release/deploy; backups en hersteltest documenteren.
- Geen demo- of health data in image. Health endpoint zonder privacygevoelige inhoud.

## Niet doen in v0.1

- Geen coachportaal, calorieënplanner, sociale gamification of wearables.
- Geen custom auth, eigen componentbibliotheek, volledige mailserver of in-house analyticsstack.
- Geen lock-in op externe commerciële SaaS.

Zie de uitvoering in [issues](https://github.com/mathossa/GLI-Leefstijl-WebApp/issues).
