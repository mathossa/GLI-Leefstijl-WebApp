# Mijn Leefstijl — twee containers op Docker/Portainer

> Voor **Docker Standalone + bestaande Nginx Proxy Manager**. Dit is een nog te reviewen uitrolplan, geen uitgevoerde productie-deployment. Gebruik eerst fictieve accounts op een aparte teststack.

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

## 2. Image bouwen en runtimevariabelen

Vanaf een reviewed commit van het project op dezelfde VPS:

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

De **Portainer Web Editor** heeft niet vanzelf een Docker-buildcontext. Bouw vooraf op dezelfde Docker-host of publiceer de app-image in een beveiligd registry. Gebruik **alleen `compose.prod.yml`** voor de Stack in Portainer; `compose.build.yml` is voor lokale builds en CI.

## 3. Eerste start in Portainer

1. **Stacks → Add stack → Web editor**: plak `compose.prod.yml` en stel de environment-variabelen in.
2. Zorg dat `APP_IMAGE` op hetzelfde Docker-endpoint beschikbaar is en deploy de Stack.
3. PostgreSQL start eerst en moet healthy worden; de app start dan en voert `prisma migrate deploy` uit. **Alleen na succes** start Next.js.
4. Controleer dat er precies **twee containers** zijn. De app moet healthy worden en moet via NPM met HTTPS bereikbaar zijn.
5. **Geen automatische updates** zonder vooraf bewezen, consistente backup (database én foto's).

### Eerste beheeraccount

Na succesvolle migraties gebruik je dezelfde appcontainer voor de officiële Better Auth CLI. Voer dit interactief uit; zet wachtwoorden niet in shell history:

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
