# Mijn Leefstijl — twee containers op Docker/Portainer

> Voor **Docker Standalone + bestaande Nginx Proxy Manager**. Dit is een nog te reviewen uitrolplan, geen uitgevoerde productie-deployment. Gebruik eerst fictieve accounts op een aparte teststack.

## Voorkeursmethode: volledig via Portainer, zonder SSH

De **uitrol** verloopt via **Portainer → Stacks → Add stack → Git repository**. GitHub Actions bouwt eerst uit een geteste commit de Next.js-image en publiceert deze in GitHub Container Registry (GHCR). Portainer haalt uitsluitend de image en het Compose-bestand op, zodat Portainer geen Docker-build op je VPS hoeft uit te voeren. Dit werkt ook bij Portainer-omgevingen via een remote Agent waar Compose-build niet betrouwbaar wordt ondersteund.

### Vooraf: image publiceren

De GitHub Actions-workflow `Code quality, secure container deployment and restore` bevat drie stappen/jobs: `quality`, `container`, en daarna pas `Publish tested image for Portainer`. Alleen wanneer beide testjobs succesvol zijn, wordt de geteste app-image gepubliceerd.

- Testbranch: `ghcr.io/mathossa/gli-leefstijl-webapp:issue7-test`.
- Voor een specifieke geteste commit: `ghcr.io/mathossa/gli-leefstijl-webapp:sha-<40-tekens-Git-commit>`.
- Na merge naar `main`: `ghcr.io/mathossa/gli-leefstijl-webapp:main` **en** `ghcr.io/mathossa/gli-leefstijl-webapp:latest`. Beide verwijzen naar de laatst succesvol gepubliceerde `main`-build.
- **Let op:** `:latest` is een veranderlijke tag, geen automatische updatefunctie. Portainer downloadt een nieuwe versie pas bij een expliciete **Pull and redeploy** (met image-pull ingeschakeld). Houd GitOps auto-updates uit en maak vóór updates backups van database, foto's en secrets. Voor reproduceerbaar uitrollen blijft een `sha-<commit>` tag aanbevolen.

**GHCR-pakketten zijn mogelijk standaard privé.** Als de registry een authentication error geeft, koppel in Portainer onder **Registries → Add registry → Custom registry** een GitHub Container Registry-account met minimaal `read:packages`, of maak de specifieke package bewust publiek via GitHub package settings. Deel het token nooit in chat, issues, Git of Compose. De workflow vereist dat GitHub Actions `packages: write` voor deze repository mag gebruiken. Controleer in GitHub Actions of de publish-job op de gekozen commit is geslaagd.

### Stap A — Bestaande Nginx Proxy Manager-netwerknaam

Zoek in **Portainer → Containers → Nginx Proxy Manager → Connected networks** een *user-defined Docker bridge*. Dat is `PROXY_NETWORK`. Gebruik het bestaande netwerk; de Mijn Leefstijl-app krijgt daarop de vaste interne alias `mijn-leefstijl-web`. PostgreSQL blijft op zijn eigen interne netwerk. Staat NPM alleen op de standaard `bridge`, dan moet je eerst via Portainer een user-defined netwerk verbinden.

### Stap B — Nieuwe Git Stack in Portainer

Ga naar **Stacks → Add stack**, maak een nieuwe teststack en kies **Git repository**:

| Portainer-veld | Invullen |
| --- | --- |
| Name | `mijn-leefstijl` (alleen als deze naam nog vrij is) |
| Repository URL | `https://github.com/mathossa/GLI-Leefstijl-WebApp` |
| Repository reference | `refs/heads/feat/issue-7-portainer-production-deployment` |
| Compose path | `compose.prod.yml` |
| Additional files | **Leeg laten** (niet `compose.build.yml` toevoegen) |
| GitOps updates / Automatic updates | **Uit** voor een proefopstelling met migraties |

Portainer kan een Git-stack rechtstreeks uit de repository laden. Er is geen lokaal `git clone`, geen VPS-shell en geen handmatige `docker build` nodig.

### Stap C — Variabelen in Portainer instellen

Vul onder **Environment variables** de waarden uit `deploy/portainer.env.example` in. **Plak géén geheimen in de YAML-editor of GitHub.**

| Variabele | Inhoud |
| --- | --- |
| `APP_IMAGE` | `ghcr.io/mathossa/gli-leefstijl-webapp:issue7-test` (of geteste SHA-tag) |
| `PROXY_NETWORK` | Exacte bestaande NPM Docker-netwerknaam |
| `POSTGRES_USER` | `leefstijl` |
| `POSTGRES_DB` | `leefstijl` |
| `POSTGRES_PASSWORD` | Sterke, unieke testwaarde (genereer in wachtwoordmanager; bij voorkeur alfanumeriek/hex) |
| `DATABASE_URL` | `postgresql://leefstijl:<zelfde-wachtwoord>@postgres:5432/leefstijl` (URL-encode speciale tekens) |
| `BETTER_AUTH_URL` | Exacte externe `https://`-testhostnaam |
| `BETTER_AUTH_SECRET` | Afzonderlijke cryptografisch willekeurige lange sleutel (min. 32 tekens) |
| `SMTP_ENCRYPTION_KEY` | Mag leeg blijven bij een nieuwe testomgeving **zonder opgeslagen SMTP-wachtwoord** |
| `BOOTSTRAP_ADMIN_EMAIL` | Optioneel voor **eenmalige** eerste admin, bijv. `beheerder@voorbeeld.nl` |
| `BOOTSTRAP_ADMIN_NAME` | Optioneel, samen met e-mail en wachtwoord invullen, bijv. `Beheerder` |
| `BOOTSTRAP_ADMIN_PASSWORD` | Optioneel, uniek tijdelijk wachtwoord van minimaal 12 tekens; **niet** in Git zetten |

**Bestaande gegevens migreren?** Nooit zomaar nieuwe `BETTER_AUTH_SECRET` of `SMTP_ENCRYPTION_KEY` gebruiken: behoud de oorspronkelijke sleutels en zorg eerst voor een consistente backup.

Druk op **Deploy the stack**. Verwacht **precies twee containers**: `app` en `postgres`. De app wacht op de database, voert `prisma migrate deploy` uit en start pas daarna Next.js. Controleer **Portainer → Containers → app → Logs** en daarna **Health / Healthy**.

### Stap D — Nginx Proxy Manager en eerste testaccount

In **NPM → Hosts → Proxy Hosts → Add Proxy Host** stel je `Scheme: http`, `Forward Hostname: mijn-leefstijl-web`, `Forward Port: 3000` in. Schakel websockets en Force SSL in en gebruik een geldig certificaat. De externe DNS-host moet bij `BETTER_AUTH_URL` passen. Test vervolgens `https://jouw-host/api/health` (antwoord `ok`).

**Client-IP en inlogbeveiliging:** de app vertrouwt in productie uitsluitend op `X-Real-IP`, dat Nginx Proxy Manager zelf moet overschrijven met het clientadres (`proxy_set_header X-Real-IP $remote_addr;`). De standaard NPM-proxyconfiguratie doet dit. Controleer aangepaste Nginx-configuratie en publiceer de app-poort niet rechtstreeks. Stuur geen ongeschoonde clientheaders door. Ontbreekt een geldig adres, dan geven auth-API-routes HTTP 503 in plaats van onbeperkte inlogpogingen toe te staan. `X-Forwarded-For` wordt niet gebruikt voor de authenticatiebegrenzing. Bij een extra proxy/CDN vóór NPM moet Nginx eerst het echte adres uit uitsluitend vertrouwde proxies bepalen. Gewone `next dev`-ontwikkeling blijft mogelijk zonder proxy; directe HTTP-productietests simuleren de vertrouwde header expliciet.

De migratie `20261101120000_persistent_auth_rate_limit` voegt alleen Better Auth's begrenzingstabel toe. De teller blijft behouden na herstart en wordt door alle app-processen gedeeld. Geen extra container of environmentvariabele nodig.

**Geen Portainer-console nodig:** vul bij de eerste uitrol onder **Stacks → mijn-leefstijl → Editor / Environment variables** tijdelijk `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME` en `BOOTSTRAP_ADMIN_PASSWORD` in. Voer daarna **Pull and redeploy / Update the stack** uit met de nieuwste geteste GHCR-image (als het dezelfde tag `issue7-test` is, zorg dat de nieuwe image opnieuw wordt gepulld).

De startup voert eerst `prisma migrate deploy` uit, controleert vervolgens dat de Better Auth-`user`-tabel **leeg** is, en gebruikt alleen dan de officiële Better Auth `create-admin`-CLI. De e-mail wordt standaard geverifieerd. Bij reeds bestaande gebruikers wordt de bootstrap **overgeslagen**: er worden geen rollen toegekend of wachtwoorden gewijzigd. Een onvolledig ingevulde set variabelen of een mislukte aanmaak stopt de appstart. In de logs verschijnt slechts een algemene melding, **geen wachtwoord**.

Log in via HTTPS, controleer het adminportaal, **verwijder direct alle drie BOOTSTRAP_ADMIN_* variabelen uit Portainer** en redeploy de stack zodat de Docker-containerconfiguratie ze niet meer bevat. Bewaar het wachtwoord voortaan uitsluitend in je wachtwoordmanager. De Portainer-stackvariabelen zijn **niet hetzelfde als Docker secrets**: beheerders van Portainer/Docker kunnen deze waarden zien en tijdens de eerste aanmaak is het wachtwoord kort zichtbaar als CLI-procesargument. Gebruik dit uitsluitend voor de eerste bootstrap, niet als permanent beheersysteem. Maak backups en test met fictieve gegevens voordat je persoonsgegevens opslaat.

**Alternatief:** wie een werkende containerconsole heeft, kan ook de bestaande officiële CLI blijven gebruiken: `npm run auth:create-admin -- --email beheerder@voorbeeld.nl --name "Beheerder" --role admin`.

### Niet vergeten: backups vóór echte persoonsgegevens

**Portainer Git-deployment maakt niet automatisch backups.** Deze PR bevat `scripts/backup-db.sh`, `scripts/backup-private-uploads.sh` en geïsoleerde hersteltests, maar de geplande off-host uitvoering en veilige export zijn een **aparte beheerinstelling**. De repo hoeft niet via SSH geïnstalleerd te worden om de containers te deployen. Voor echt gebruik moeten we nog een backupstrategie kiezen die je ook vanuit Portainer kunt beheren (bijvoorbeeld met een geplande taak/daarvoor bestemde backupvoorziening); dat kan een tijdelijk extra hulpcontainerproces vereisen. Tot die tijd: alleen fictieve testdata.

---
## Architectuur en startup

De stack bevat precies **twee services**:

- **app**: één Next.js standalone-app-image met Prisma 7 CLI en Better Auth admin-CLI, interne HTTP-poort 3000.
- **postgres**: PostgreSQL 17 met een intern-only Docker-netwerk, **zonder gepubliceerde poort**.

Je bestaande Nginx Proxy Manager blijft apart draaien: geen extra proxycontainer. De webapp deelt alleen het bestaande externe Docker-proxynetwerk met NPM, onder de vaste alias `mijn-leefstijl-web`. PostgreSQL is niet bereikbaar via dat netwerk.

De app en database hebben aparte persistente named volumes: `leefstijl_private_uploads` (privéfoto's, buiten de webroot) en `leefstijl_pg_data` (PostgreSQL). Een Portainer herstart verwijdert die volumes niet; gebruik nooit `docker compose down -v` of een volume-prune.

**Migraties:** Het startup-script in de app voert altijd `prisma migrate deploy` uit vóór `node server.js`. Reeds toegepaste migraties worden overgeslagen; bij een migratiefout start de webserver niet. Docker kan de container opnieuw proberen door `restart: unless-stopped`, dus bekijk de logs wanneer de webapp niet healthy wordt. Dit mechanisme **draait een gedeeltelijke migratie niet automatisch terug**. Updates moeten daarom gepland, geback-upt en serieel uitgevoerd worden. De app-image is iets groter door de extra CLI-dependencies; er is geen derde container.

Dit ontwerp is voor **één** Next.js-appinstantie op één VPS; geen automatische horizontale schaal of zero-downtime schema-updates.

## 1. Nginx Proxy Manager en Docker-netwerk

1. Ga in Portainer naar **Containers → Nginx Proxy Manager → Connected networks**. Noteer de exacte naam van het bestaande *user-defined bridge-netwerk* van NPM. Vul deze naam in als `PROXY_NETWORK`.
2. Staat NPM uitsluitend op het standaard `bridge`-netwerk, voeg dan eerst via zijn eigen Stack een dedicated user-defined bridge-netwerk toe. Houd de bestaande publiek gepubliceerde poorten 80/443 en dashboardpoort ongewijzigd.
3. Maak in **Nginx Proxy Manager → Hosts → Proxy Hosts** een Proxy Host:

   | Veld | Instelling |
   | --- | --- |
   | Domain Names | Het subdomein uit `BETTER_AUTH_URL` |
   | Scheme | `http` |
   | Forward Hostname/IP | `mijn-leefstijl-web` |
   | Forward Port | `3000` |
   | Websockets Support | Aan |
   | SSL | Een geldig certificaat of Let's Encrypt; Force SSL aan |

4. Zorg dat het DNS-record naar de VPS wijst. Maak **geen** publieke poorten voor de app of PostgreSQL. Controleer na uitrol `https://jouw-domein/api/health` en de login.

Let op: meerdere test- en productieapps op hetzelfde proxy-netwerk mogen niet dezelfde alias hebben; geef ze een eigen DNS-alias voordat je een tweede stack aansluit.

## Alternatief voor handmatige CLI-deployments (niet nodig met Portainer Git)

Alleen wanneer je bewust **niet** de hierboven beschreven Portainer/GHCR-methode gebruikt, kun je op een Docker-host handmatig een image bouwen uit een gereviewde checkout:

```sh
git clone https://github.com/mathossa/GLI-Leefstijl-WebApp.git
cd GLI-Leefstijl-WebApp
git checkout <geteste-release-tag-of-commit>
cp deploy/portainer.env.example .env.prod
chmod 600 .env.prod
```

Vul `.env.prod` in (of Portainer's protected Stack environment):

- `APP_IMAGE`: unieke image-tag per geteste release (bij voorkeur een registry digest).
- `PROXY_NETWORK`: bestaande NPM Docker-netwerknaam.
- `POSTGRES_USER`, `POSTGRES_DB` en sterk uniek `POSTGRES_PASSWORD`.
- `DATABASE_URL`: verwijst naar host `postgres:5432` op het interne netwerk, met **exact hetzelfde wachtwoord**, URL-gecodeerd bij speciale tekens.
- `BETTER_AUTH_URL`: exact je externe `https://`-domein.
- `BETTER_AUTH_SECRET`: afzonderlijke lange sleutel, voor een nieuwe installatie bijvoorbeeld `openssl rand -base64 48`.
- `SMTP_ENCRYPTION_KEY`: afzonderlijke `openssl rand -base64 32` wanneer een SMTP-wachtwoord is opgeslagen.

Als je een bestaande database overzet, **hergebruik beide originele sleutels**. Een nieuwe SMTP-sleutel kan eerder opgeslagen SMTP-wachtwoorden onleesbaar maken. Behandel alle variabelen, database- en fotobackups als gevoelige persoonsgegevens; niet in Git of screenshots opnemen.

Bouw de enige app-image:

```sh
docker compose --env-file .env.prod -f compose.prod.yml -f compose.build.yml build app
docker compose --env-file .env.prod -f compose.prod.yml config --quiet
```

Voor de aanbevolen Portainer-only deployment gebruik je de door GitHub Actions gepubliceerde GHCR-image. `compose.build.yml` is uitsluitend voor lokale builds en CI, niet voor de Portainer Stack.

## 3. Eerste start in Portainer

1. **Stacks → Add stack → Web editor**: plak `compose.prod.yml` en stel de environment-variabelen in.
2. Zorg dat `APP_IMAGE` op hetzelfde Docker-endpoint beschikbaar is en deploy de Stack.
3. PostgreSQL start eerst en moet healthy worden; de app start dan en voert `prisma migrate deploy` uit. **Alleen na succes** start Next.js.
4. Controleer dat er precies **twee containers** zijn. De app moet healthy worden en moet via NPM met HTTPS bereikbaar zijn.
5. **Geen automatische updates** zonder vooraf bewezen, consistente backup (database én foto's).

### Eerste beheeraccount

**Portainer-only aanpak:** gebruik de optionele eenmalige `BOOTSTRAP_ADMIN_*` variabelen uit stap D hierboven. Na succesvolle login verwijderen en de containers opnieuw uitrollen. Bij bestaande gebruikers worden de variabelen bewust genegeerd; gebruik voor herstel een geautoriseerde beheermethode in plaats van de bootstrap opnieuw te activeren.

**Alternatieve shell-aanpak:** gebruik alleen als een interactieve console wel werkt; zet wachtwoorden niet in shell history:

```sh
docker compose --env-file .env.prod -f compose.prod.yml \
  exec app npm run auth:create-admin -- \
  --email beheerder@example.nl --name "Beheerder" --role admin
```

Publieke registratie blijft gesloten.

## 4. Backups en restoreproeven

Een databasebackup bevat **geen geüploade CooL-foto's**; die staan in een tweede volume. Maak beide archieven in hetzelfde onderhoudsvenster, bij voorkeur zonder inkomende updates/uploads, en bewaar ook de benodigde encryptiesleutels.

```sh
./scripts/backup-db.sh .env.prod ./backups
./scripts/backup-private-uploads.sh .env.prod ./backups
./scripts/test-restore.sh ./backups/leefstijl-YYYYMMDDTHHMMSSZ.dump
./scripts/test-restore-private-uploads.sh ./backups/leefstijl-uploads-YYYYMMDDTHHMMSSZ.tar.gz
```

De PostgreSQL-backup gebruikt `pg_dump -Fc`, de foto-archive `tar.gz`; beide hebben SHA-256 en beperkte bestandsrechten. De restoretests gebruiken alleen tijdelijke geïsoleerde opslag, **nooit** bestaande productievolumes. Verifieer daarnaast een **volledige** hersteltest met fictieve gegevens op een andere Stack en neem gecontroleerde off-host, versleutelde backups met bewaartermijn op in het beheerproces.

Een nieuwe image of apprestart maakt **niet automatisch** backups. Richt daarvoor afzonderlijk een beveiligde host cron/systemd timer en externe opslag in.

## 5. Updates, migratiefouten en rollback

1. Plan een onderhoudsvenster, neem een bij elkaar horende database- en fotobackup, controleer de checksums en een restoreproef.
2. Bouw/push een geteste nieuwe app-image met een **nieuwe tag**. Zet `APP_IMAGE` in Portainer naar die versie.
3. De app voert vóór iedere webstart `prisma migrate deploy` uit. Bij succes wordt Next.js healthy en kun je login, admin/SMTP, PDF, doelen, reflecties en foto-upload testen.
4. Bij een mislukte migratie stopt de app vóór de webserver. **Zet niet blind de oude image terug**: de database kan al gedeeltelijk veranderd zijn. Bekijk de migratiestatus en herstel via een aparte database/teststack wanneer nodig. Pas dan gecontroleerd omschakelen.
5. Gebruik nooit `down -v`, volume-pruning of `prisma db push` bij productie-updates.

## Security en resterende acceptatie

Hergebruikt: Node 22, PostgreSQL 17, Next.js standalone, Prisma 7, Better Auth CLI, NPM en Compose healthchecks. App draait non-root, Postgres alleen op intern netwerk, twee persistente volumes, afgeschermde uploads, logrotatie en de gepatchte `sharp@0.35.5`. CI voert `npm audit --omit=dev --audit-level=high` uit en valideert een echte DB/foto-backup en geïsoleerde restore.

Nog vóór daadwerkelijke ingebruikname: testen op eigen test-VPS/Portainer met fictieve accounts, NPM/DNS/HTTPS, off-host encrypted backups en complete herstelproef, hostbeveiliging en privacyreview. **Geen VPS of bestaande NPM-configuratie is door deze PR gewijzigd.**
