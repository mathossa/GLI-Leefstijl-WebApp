# Mijn Leefstijl — GLI CooL

> Persoonlijke leefstijl- en doelentracker. Open source onder **GNU AGPL-3.0-only**.

**Status (oktober 2026): architectuur en backlog opgesteld; nog geen werkende applicatie.** Geen echte persoonsgegevens toevoegen aan GitHub.

## Visie

Een rustige, mobile-first app voor duurzame gedragsverandering tijdens een GLI CooL-traject. Niet primair calorieën tellen of streaks najagen: het gaat om eigen regie, kleine haalbare stappen en terugkijken.

**Gebruikersomgeving**:
- Vandaag: concrete weekacties registreren.
- Doelen: resultaat-/gedragsdoelen, motivatie, frequentie, historie.
- Reflectie: wekelijkse evaluaties en notities bij CooL-bijeenkomsten.
- Inzichten: voortgang over tijd, optioneel gezondheidsmetingen.

**Beheer** (`/admin`, strikt admin-only):
- Gebruikersbeheer via Better Auth Admin-plugin.
- Instellingen en SMTP-relay (ook een later zelfgehoste mailserver).
- App functioneert zonder SMTP; geen directe MX-verzending.

## Gekozen technische richting

- **Next.js App Router**, React, TypeScript, Tailwind CSS.
- **shadcn/ui** (MIT) en **Lucide** (ISC) voor bestaande toegankelijke UI-bouwstenen.
- **Better Auth** + Admin-plugin voor accounts, sessies en rollen; publieke registratie UIT.
- **Prisma 7** met **PostgreSQL 17** (zie [architectuur](docs/ARCHITECTURE.md)).
- **Nodemailer** voor uitsluitend geconfigureerde SMTP-relay.
- **Docker Compose** voor deployment op een VPS via Portainer.
- Tests, CI, dependency- en licentiecontrole vóór release.

Gebruik bestaande OSS-functies, componenten en officiële generators vóór we iets zelf bouwen. De [hergebruik- en licentieregels](docs/REUSE_AND_LICENSES.md) gelden voor alle wijzigingen.

## Projectplanning

Zie [de roadmap](docs/ROADMAP.md) en [GitHub Issues](https://github.com/mathossa/GLI-Leefstijl-WebApp/issues). We ontwikkelen per featurebranch en pull request; **niet direct op main**.

## Licentie

Eigen projectcode: [GNU AGPL-3.0-only](LICENSE). Afzonderlijke upstream-componenten behouden hun eigen licentie, notices en copyright. Raadpleeg de [dependency-inventaris](docs/REUSE_AND_LICENSES.md) en lockfile zodra die is toegevoegd.

De applicatie bevat geen medisch advies. Bewaar echte gezondheidsgegevens alleen in je eigen beveiligde installatie, nooit als demo-data of issuebijlage.
