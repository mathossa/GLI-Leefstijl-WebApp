# Mijn Leefstijl — GLI CooL

> Mobile-first persoonlijke leefstijltracker, onder GNU AGPL-3.0-only.

## Status

**Issue #1:** responsive Next.js App Router-designbasis met voorbeeldschermen. **Dit is nog geen productierijpe app.** Er zijn nog geen accounts, database, persoonlijke gegevens of persistentie. Alle voortgang en doelkaarten zijn expliciet fictieve demo-data. Zie de [roadmap](docs/ROADMAP.md).

## Lokaal opstarten

Node.js 22+ en npm nodig.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. De app start op `/dashboard` en heeft de tabbladen Vandaag, Doelen, Reflectie en Inzichten. `npm run lint`, `npm run typecheck` en `npm run build` zijn de kwaliteitschecks.

> Let op: tijdens het opzetten van issue #1 kon de ontwikkelomgeving geen npm-registry bereiken. De GitHub Actions-test bepaalt of alle dependencies installeren en de code bouwt. Een volledige **package-lock.json** moet door de eerste install-check beschikbaar zijn voordat de PR wordt gemerged; gebruik daarna uitsluitend `npm ci`.

## Architectuur / afspraken

- Next.js 16 App Router + TypeScript + Tailwind CSS 4.
- UI van **shadcn/ui** (MIT, aangepast) en **Lucide** (ISC). [Copyright/notices](THIRD_PARTY_NOTICES.md).
- Gesloten registratie en Better Auth (volgende issue), PostgreSQL en Prisma volgen later.
- SMTP wordt alleen relay naar een zelfgeconfigureerde mailserver. Geen directe MX-mail.
- Hosting wordt Docker Compose/Portainer op VPS.
- Hergebruik vóór maatwerk. Lees [AGENTS.md](AGENTS.md), [architectuur](docs/ARCHITECTURE.md) en [hergebruikbeleid](docs/REUSE_AND_LICENSES.md).
- Geen gezondheidsgegevens, gebruikersgegevens of secrets in git opslaan.

## Licentie

Eigen code: [GNU AGPL-3.0-only](LICENSE). Afgeleide shadcn/ui-componenten houden hun upstream MIT notices. Broncode: https://github.com/mathossa/GLI-Leefstijl-WebApp.
