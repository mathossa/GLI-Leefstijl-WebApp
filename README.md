# Mijn Leefstijl — GLI CooL

> Persoonlijke leefstijltracker voor kleine stappen en reflectie; open source onder GNU AGPL-3.0-only.

## Status

**Sinds issue #2:** Better Auth 1.7, Admin-plugin, Prisma 7/PostgreSQL en gesloten registratie zijn aanwezig. **Issue #3 (PR #12):** mobiel ontwerp, contrast en toetsenbordnavigatie worden verbeterd. De pagina's **Vandaag** en **Mijn doelen** tonen persoonlijke doelen, weekacties en registraties uit PostgreSQL (#4); individuele uitvoeringen kunnen optioneel een ervaring bevatten. De aparte Reflectie- en Inzichtenpagina's bevatten nog **fictieve data** tot issue #5. Dit is nog geen productieversie.

## Lokaal op Linux / WSL

Vereisten: Node.js 22+, npm, Docker Engine + Compose v2 (of een bestaande lokale PostgreSQL 17).

```bash
cp .env.example .env
# Werk eerst POSTGRES_PASSWORD, DATABASE_URL en BETTER_AUTH_SECRET in .env bij.
# Gebruik hetzelfde sterke wachtwoord in POSTGRES_PASSWORD en DATABASE_URL.
# Tip: openssl rand -base64 48   (voor BETTER_AUTH_SECRET)

docker compose --env-file .env -f compose.dev.yml up -d
npm ci
npm run db:generate
npm run db:deploy
npm run auth:create-admin -- --email you@example.com --name "Admin" --role admin
npm run dev
```

Het Better Auth CLI-commando vraagt interactief om een wachtwoord. Vermijd `--password` op je eigen machine, zodat je wachtwoord niet in de shell history terechtkomt. De CLI markeert het account als geverifieerd zonder SMTP, volgens de officiële Better Auth-documentatie. Open [http://localhost:3000/sign-in](http://localhost:3000/sign-in), log in en ga naar het dashboard. Alleen een administrator heeft toegang tot `/admin`.

Voor een andere poort: pas eerst `BETTER_AUTH_URL` in `.env` aan naar de exacte URL, en start `npm run dev -- -p 3001`. Gebruik dezelfde hostnaam (localhost of 127.0.0.1) consistent.

**Belangrijk:** de Compose-database is alleen voor lokale ontwikkeling, luistert uitsluitend op loopback (`127.0.0.1`) en is geen productieopzet. VPS/Portainer deployment volgt in #7.

## Controle

```bash
npm run lint
npm run typecheck
npm run build
```

Next.js genereert `next-env.d.ts` automatisch. Dit bestand is daarom niet meer onderdeel van Git; `npm run typecheck` voert eerst `next typegen` uit.

GitHub Actions gebruikt een tijdelijke PostgreSQL 17, voert de gecommitte migraties uit en test via HTTP onder meer afgesloten registratie, inloggen en adminisolatie.

## Beveiliging

- **Geen publieke registratie**: Better Auth `emailAndPassword.disableSignUp: true` op de server.
- **Alle** `/dashboard/**`-routes vereisen een server-side sessiecontrole; `/admin/**` vereist expliciet adminrol. Data-API's die we later toevoegen volgen dezelfde regels, inclusief eigenaarschap.
- Gebruikers en sessies worden beheerd door Better Auth en de officiële Admin-plugin. De eerste administrator wordt aangemaakt met de officiële CLI.
- Zonder geconfigureerde mailserver geen wachtwoordherstel- of verificatiemail; de app stuurt geen eigen MX-mail.
- Sleutels en databasewachtwoorden staan alleen lokaal in `.env` en nooit in Git; PostgreSQL heeft geen publieke luisterpoort.

## Hergebruik en licentie

Gebruik bestaande upstreamfunctionaliteit boven eigen code. Zie [AGENTS.md](AGENTS.md), [ARCHITECTURE.md](docs/ARCHITECTURE.md), [REUSE_AND_LICENSES.md](docs/REUSE_AND_LICENSES.md) en [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Better Auth (MIT), Prisma (Apache-2.0), shadcn/ui (MIT) en Lucide (ISC) behouden hun oorspronkelijke licenties. Eigen code: [AGPL-3.0-only](LICENSE).

[GitHub issues](https://github.com/mathossa/GLI-Leefstijl-WebApp/issues) · [Broncode](https://github.com/mathossa/GLI-Leefstijl-WebApp)
