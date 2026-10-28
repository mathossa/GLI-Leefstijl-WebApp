# Agent / contributor rules for GLI-Leefstijl-WebApp

## Non-negotiables
1. **REUSE FIRST.** Voor elke feature: check eerst framework API's, officiële generators, gevestigde OSS libraries, shadcn/ui en herbruikbare code uit repositories met expliciete compatibele licentie. Leg in de PR uit wat is hergebruikt en wat echt maatwerk vereist.
2. **AGPL-3.0-only** is de licentie voor eigen projectcode. Geen code kopiëren zonder expliciete licentiecontrole. Een openbare GitHub-repo zonder licentie is GEEN toestemming. Bewaar copyright, SPDX, de upstreamlicentietekst en wijzigingsvermeldingen waar vereist.
3. Geen commerciële, proprietary, NC, ND of niet-redistribueerbare UI-kits opnemen. Links naar inspiratie geven geen recht op het overnemen van broncode/assets.
4. Gebruik **Better Auth** voor auth, Admin-plugin voor rollen en gebruikersbeheer; nooit eigen wachtwoord- of sessieimplementaties.
5. Per-record privacy: elke query voor doel/actie/reflectie/metingen scoped op geauthenticeerde userId. Server-side access checks op alle pagina's én mutaties, ook admin. Geen health data of secrets in client logs, demo data, PRs of CI.
6. Registratie standaard gesloten. Eerste admin via officieel Better Auth CLI bootstrap. SMTP optioneel en enkel via ingestelde relay; nooit directe MX-mail.
7. Deployment op VPS met Docker Compose/Portainer, interne PostgreSQL 17 en een bestaande TLS reverse proxy. Secrets alleen buiten git.
8. Voorkom over-engineering: geen extra services, queue, microservices of eigen UI framework zonder gemotiveerde noodzaak.
9. Houd PRs klein en testbaar: featurebranch, tests, lint, typecheck, build. Geen ongecontroleerde dependencies of upgrades. Geen merges zonder review.

## Voor iedere PR
- [ ] Vermeld minstens één onderzochte upstream/reuse-kandidaat en waarom gekozen/afgewezen.
- [ ] Licentie en notices van overgenomen code gecheckt en vastgelegd.
- [ ] Privacy-, auth- en multi-user gevolgen beoordeeld.
- [ ] Geen secrets, persoonsgegevens of echte gezondheidsdata aanwezig.
- [ ] Migraties, deployment, backup-impact en terugval beoordeeld.
- [ ] Tests en checks toegevoegd / uitvoerbaarheid verklaard.
- [ ] Scope beperkt; mogelijke vervolgissues benoemd.

Lees [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) en [docs/REUSE_AND_LICENSES.md](docs/REUSE_AND_LICENSES.md).
