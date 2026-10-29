# Derde-partijcomponenten

De eigen projectcode valt onder **AGPL-3.0-only**. De volgende bestanden zijn afgeleid van de vrije shadcn/ui-componenten en vallen voor de upstreamgedeelten onder hun oorspronkelijke **MIT-licentie**. Bij wijzigingen zijn imports, kleurtokens, opmaak en varianten aangepast aan Mijn Leefstijl.

- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/progress.tsx`

**Upstream:** https://github.com/shadcn-ui/ui (shadcn, contributors).

**MIT-notice (upstream):** Copyright (c) 2023 shadcn. Licensed under the MIT License. Full upstream notice en licentietekst staan in [vendor-licenses/SHADCN-UI-MIT.txt](vendor-licenses/SHADCN-UI-MIT.txt).

Bestaande dependency-pakketten blijven onder hun eigen licenties. Controleer de uiteindelijke npm dependency- en transitive licentie-inventaris bij de eerste reproducible install.

## PDF- en fotoverwerking (#5)

- [pdf-lib](https://github.com/Hopding/pdf-lib) **1.17.1**, MIT-licentie. Wordt als npm-dependency gebruikt voor het opmaken van lokale PDF-overzichten; er zijn geen upstreambronbestanden gekopieerd.
- [sharp](https://github.com/lovell/sharp) **0.34.5**, Apache-2.0-licentie. Wordt als npm-dependency gebruikt om privéfoto's van notities veilig te verwerken (resize/oriëntatie, WebP, zonder EXIF). Eigen bindings en native libvips-afhankelijkheden behouden hun oorspronkelijke licenties.

Bekijk de lockfile voor exacte versies/transitieve pakketten en controleer bij distributie de eventuele notice-verplichtingen. De projectcode van de integratie is AGPL-3.0-only; de libraries behouden hun upstreamlicenties.
