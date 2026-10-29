# Mijn Leefstijl — GLI CooL

> Persoonlijke leefstijltracker voor kleine stappen en reflectie; open source onder GNU AGPL-3.0-only.

## Status

Mijn Leefstijl bevat een mobile-first dashboard, beveiligde login met Better Auth, doelen en eenklikregistratie (#1–#4). **Issue #5 is gemerged** en biedt: wekelijkse reflecties, CooL-bijeenkomstnotities, echte week-/maandinzichten en een privé JSON-export, een deelbaar PDF-overzicht en privéfoto's bij CooL-bijeenkomsten. Alle persoonlijke gegevens worden opgeslagen in PostgreSQL via Prisma. Dit is nog geen productieversie; SMTP, VPS/Portainer en verdere privacy-/securityhardening volgen in #6–#8.

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

### Privéfoto's en exports (#5)

- Bij **Reflectie → CooL-bijeenkomsten** kun je bij een bijeenkomst een foto van je papieren notities uploaden, zonder die eerst over te typen. Uploads (maximaal 5 per bijeenkomst, elk 8 MB) worden via `sharp` opnieuw gecodeerd naar WebP, zonder EXIF/GPS, en staan uitsluitend in de private map `.private-uploads/` of het ingestelde `PRIVATE_UPLOAD_DIR`.
- Bij **Inzichten** kun je een deelbare, vormgegeven **PDF** of een volledige machineleesbare **JSON** downloaden. De PDF bevat recente samenvattingen en bewust geen privéfoto's; JSON bevat alle historie inclusief fotometadata, maar geen afbeeldingsbestanden.
- **Voor de VPS is een persistent privévolume verplicht.** Database- en bestandsbackups zijn beide nodig, omdat PostgreSQL alleen de fotometadata bevat. Zonder zo'n volume gaan geüploade foto's bij containervervanging verloren. Zie `docs/REFLECTIONS.md`.
- OCR van handschrift staat nog niet aan. Onderzoek naar geschikte OSS-modellen is gedocumenteerd in `docs/REUSE_AND_LICENSES.md`.

## Controle

```bash
npm run lint
npm run typecheck
npm run build
```

Next.js genereert `next-env.d.ts` automatisch. Dit bestand is daarom niet meer onderdeel van Git; `npm run typecheck` voert eerst `next typegen` uit.

GitHub Actions gebruikt een tijdelijke PostgreSQL 17, voert de gecommitte migraties uit en test via HTTP onder meer afgesloten registratie, inloggen, adminisolatie en de gebruikersgebonden export.

## Beveiliging

- **Geen publieke registratie**: Better Auth `emailAndPassword.disableSignUp: true` op de server.
- **Alle** `/dashboard/**`-routes vereisen een server-side sessiecontrole; `/admin/**` vereist expliciet adminrol. Data-API's die we later toevoegen volgen dezelfde regels, inclusief eigenaarschap.
- Gebruikers en sessies worden beheerd door Better Auth en de officiële Admin-plugin. De eerste administrator wordt aangemaakt met de officiële CLI.
- Zonder geconfigureerde mailserver geen wachtwoordherstel- of verificatiemail; de app stuurt geen eigen MX-mail.
- Sleutels en databasewachtwoorden staan alleen lokaal in `.env` en nooit in Git; PostgreSQL heeft geen publieke luisterpoort.

## Hergebruik en licentie

Gebruik bestaande upstreamfunctionaliteit boven eigen code. Zie [AGENTS.md](AGENTS.md), [ARCHITECTURE.md](docs/ARCHITECTURE.md), [REUSE_AND_LICENSES.md](docs/REUSE_AND_LICENSES.md) en [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Better Auth (MIT), Prisma (Apache-2.0), shadcn/ui (MIT) en Lucide (ISC) behouden hun oorspronkelijke licenties. Eigen code: [AGPL-3.0-only](LICENSE).

[GitHub issues](https://github.com/mathossa/GLI-Leefstijl-WebApp/issues) · [Broncode](https://github.com/mathossa/GLI-Leefstijl-WebApp)

## Gebruikersbeheer en SMTP-relay (#6)

Beheerders kunnen via `/admin` gebruikers aanmaken, hun rol wijzigen en accounts blokkeren of deblokkeren via de bestaande Better Auth Admin-plugin. Een optionele TLS/STARTTLS SMTP-relay ondersteunt veilig verzenden van een testmail naar het eigen beheeraccount. Het SMTP-wachtwoord is met AES-256-GCM versleuteld; stel `SMTP_ENCRYPTION_KEY` apart van `BETTER_AUTH_SECRET` in (bijvoorbeeld `openssl rand -base64 32`). Zonder SMTP blijven login en leefstijlfunctionaliteit werken. Geen directe MX-mail of poort 25. Zie [docs/ADMIN_SMTP.md](docs/ADMIN_SMTP.md).
