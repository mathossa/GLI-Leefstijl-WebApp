# Reuse-first en licentiebeleid — 2026-10-28

**Projectlicentie voor eigen werk: GNU AGPL-3.0-only.** De repository heeft reeds een volledige LICENSE.

## Workflow bij nieuwe functionaliteit

1. **Inventariseer** officiële APIs, frameworks en bestaande OSS; start met al aanwezige dependencies.
2. **Beoordeel** onderhoud, veiligheid, technische fit en effect op bundlegrootte/complexiteit.
3. **Verifieer licentie aan de bron** op commit/release die je daadwerkelijk gebruikt (incl. afhankelijkheden en eventuele assets). Toets AGPL-compatibiliteit, niet alleen of de repo 'public' is.
4. **Herbruik bij voorkeur als dependency**, in plaats van source copy-paste. Voor code die wel moet worden vendored: voeg upstream URL, exact commit/tag, licentie/copyright, wat gewijzigd is en vereiste notices toe.
5. **Schrijf alleen ontbrekende domeinlogica** en integratiecode zelf. Leg alternatieven vast in PR.
6. **Automatiseer** software bill of materials, dependency audit en license inventory in CI. Loop verdachte/onbekende licences altijd handmatig na.

Geen code of designs kopiëren uit willekeurige GitHub-repo's zonder licentie. Geen proprietary, betaalde UI kits zonder doorleverrecht, CC-BY-NC/ND, of gepatenteerde/ongecontroleerde assets. Onder AGPL mogen compatibele libraries via hun eigen licentie worden gebruikt; vermijd de onjuiste claim dat elk los dependency-pakket zelf AGPL moet worden.

## Voorgestelde upstreams (verifiëren bij daadwerkelijke integratie)

| Nodig | Preferentie | Licentie van upstream | Bron |
|---|---|---|---|
| Framework | Next.js | MIT | https://github.com/vercel/next.js/blob/canary/license.md |
| Authenticatie + rollen | Better Auth + Admin-plugin | MIT | https://github.com/better-auth/better-auth |
| Database ORM | Prisma ORM 7 | Apache-2.0 | https://github.com/prisma/orm/blob/main/LICENSE |
| Componenten | shadcn/ui **gratis OSS**, geen commerciële Pro-blocks | MIT | https://github.com/shadcn-ui/ui/blob/main/LICENSE.md |
| Iconen | Lucide | ISC (sommige Feather-afgeleiden met aanvullende MIT-notice) | https://github.com/lucide-icons/lucide/blob/main/LICENSE |
| Formulieren | React Hook Form | MIT | https://github.com/react-hook-form/react-hook-form |
| Validatie | Zod | MIT | https://github.com/colinhacks/zod/blob/main/LICENSE |
| Grafieken | Recharts | MIT | https://github.com/recharts/recharts |
| SMTP relay | Nodemailer | MIT-0 | https://nodemailer.com/license |

**Deze tabel is een kandidaatselectie, geen complete runtime-inventaris.** Werkelijke pakketversies zijn vastgelegd in `package-lock.json`. Onder #5 gebruiken we ook `pdf-lib` (MIT) en `sharp` (Apache-2.0), zie `THIRD_PARTY_NOTICES.md`. Na installatie registreren we exacte versies en transitive licenses via lockfile/licentiecontrole. Apache-2.0 NOTICE-verplichtingen respecteren als die van toepassing zijn.

## Overname van andere repo's (ook eigen repo's)

Code uit bijvoorbeeld bestaande projecten van dezelfde auteur is niet automatisch zonder meer herbruikbaar: check licentie, auteursrechten van contributors, en of het werkelijk generiek is. Een generieke helper met compatibele licentie is welkom; grote modules kopiëren zonder nuttige reden niet.

## PR bewijs

PR's noemen:
- Onderzochte oplossingen met URLs, keuzes en argumenten.
- Afzonderlijke dependencies en hun licenties.
- Vendored broncode met originele licentie/copyright en aanpassingen.
- Relevante security/licence scans en uitzonderingen.

## AGPL en SaaS

Als gebruikers via het netwerk met een aangepaste AGPLv3-app interacteren, moeten de relevante licentieverplichtingen inclusief aanbod van Corresponding Source zorgvuldig worden nageleefd. Houd een zichtbare broncode-link in de app zodra die wordt uitgerold. Dit document is een engineering-richtlijn en geen juridisch advies.

## OCR-verkenning (#5)

- **PaddleOCR** (https://github.com/PaddlePaddle/PaddleOCR; Apache-2.0): voorkeurskandidaat voor handgeschreven Nederlandstalige aantekeningen. Bij modelgewichten altijd afzonderlijk modellicentie, GPU/CPU-gebruik en resultaten op echte Nederlandstalige notities beoordelen.
- **Microsoft TrOCR** (https://github.com/microsoft/unilm/tree/master/trocr): gespecialiseerde handschriftherkenning, maar modellen/gewichten kunnen andere licenties hebben. Eerst een klein benchmarkonderzoek op eigen testmateriaal, geen externe upload.
- **Tesseract.js** (https://github.com/naptha/tesseract.js; Apache-2.0): handig voor drukwerk, maar de eigen FAQ raadt Tesseract voor handgeschreven tekst af.

Nog geen OCR-dependency toegevoegd. Eventuele latere OCR wordt optioneel en lokaal/VPS uitgevoerd; de gebruiker moet de voorgestelde tekst altijd zelf beoordelen vóór opslaan. De foto blijft het origineel.
