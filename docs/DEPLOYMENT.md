# Productie op een VPS met Docker Compose en Portainer (#7)

> Alleen voor **Portainer Docker Standalone**, niet Swarm. Deze PR introduceert **geen echte VPS-deployment** en wijzigt geen bestaande productieomgeving. De implementatie is geïntegreerd met de gemergede #5 en #6. Controleer het geheel eerst op een geïsoleerde VPS of lokale Docker-host met fictieve accounts.

## Keuzes en architectuur

- Multi-stage Dockerfile: dependencies + Next.js 16 standalone build, non-root runtime, afzonderlijk Prisma v7 migrator/Better Auth beheerimage. Node.js 22.23.4/bookworm-slim, PostgreSQL 17.11/alpine3.24 expliciet gepind op versie (voor volledig immutable deployment registry digest pinnen).
- Compose: app + PostgreSQL + **eenmalige migrator**. PostgreSQL heeft alleen een intern netwerk, geen gepubliceerd poortnummer en een persistent named volume. De **privéfoto's uit #5** staan op een tweede persistent named volume (`leefstijl_private_uploads`) onder `/app/private-uploads`, buiten de webroot en schrijfbaar voor de niet-root appgebruiker. De app zit daarnaast op het **bestaande** external reverse-proxy-netwerk. Alleen de TLS-proxy is publiek.
- Migrator draait 'prisma migrate deploy' nadat PostgreSQL gezond is; de app start pas na succesvolle exitcode 0 van migrator. Er is **geen** 'prisma db push' en geen migratie tijdens webserverstart.
- GET /api/health is ongeauthenticeerde readiness, voert alleen 'SELECT 1' uit op de database en retourneert uitsluitend 'ok' of 'unavailable' met no-store. De Docker healthcheck bevraagt deze endpoint intern.
- Logging met rotatie; geen gevoelige data in healthchecks of afbeeldingen in Docker-buildcontext. Geen port mapping op de webapp. SMTP is volledig optioneel (na #6).

## Stap 1 — Proxy en secrets voorbereiden

Vereist: VPS met Docker Engine, Docker Compose v2, Portainer op hetzelfde Docker-endpoint, een bestaande TLS reverse proxy en een domein. Maak een externe Docker bridge aan als deze niet bestaat, en sluit de bestaande reverse-proxycontainer hierop aan. Gebruik exact de netwerknaam onder 'PROXY_NETWORK'.

~~~sh
docker network create reverse-proxy   # alleen wanneer nog niet aanwezig
git clone https://github.com/mathossa/GLI-Leefstijl-WebApp.git
cd GLI-Leefstijl-WebApp
git checkout <gereviewde-release-tag-of-commit>
cp deploy/portainer.env.example .env.prod
chmod 600 .env.prod
~~~

Vul in .env.prod:
- **APP_IMAGE** en **MIGRATOR_IMAGE**: twee images gebouwd uit **dezelfde commit**. Gebruik unieke, onveranderlijke tags per release. Een registry digest is nog veiliger.
- **POSTGRES_USER**, **POSTGRES_DB** en een sterk, nieuw **POSTGRES_PASSWORD**.
- **DATABASE_URL** met **host postgres**, niet 127.0.0.1. URL-encode bijzondere tekens in het PostgreSQL-wachtwoord; gebruik hetzelfde wachtwoord als bij PostgreSQL.
- **BETTER_AUTH_URL**: exacte externe HTTPS-domeinnaam, bijvoorbeeld https://leefstijl.example.nl. Configuratie van de proxy moet Host en X-Forwarded-Proto correct doorgeven.
- **BETTER_AUTH_SECRET**: genereer afzonderlijk via 'openssl rand -base64 48', en bewaar veilig buiten Git.
- **SMTP_ENCRYPTION_KEY**: wanneer SMTP-credentials gebruikt worden; genereer afzonderlijk met 'openssl rand -base64 32'. Deze key mag niet gelijk zijn aan de Better Auth-secret. Zonder SMTP is hij niet vereist.

Laat Portainer/Compose-secretwaarden niet in screenshots, issues of debuglogs terechtkomen. Scherm de VPS, Portainer, backups en Docker socket strikt af.

## Stap 2 — Images bouwen op de VPS

Een Portainer Stack in de webeditor heeft niet vanzelf toegang tot de Git build context. Bouw daarom eerst de twee images uit **dezelfde checkout** op de host (of publiceer beide via CI in een private registry). De lokale build-override is alleen voor CLI/CI; niet plakken in Portainer.

~~~sh
docker compose --env-file .env.prod \
  -f compose.prod.yml -f compose.build.yml build
docker compose --env-file .env.prod -f compose.prod.yml config --quiet
~~~

Wil je zelf versietags gebruiken, zet bijvoorbeeld APP_IMAGE=mijn-leefstijl:2026-10-29 en MIGRATOR_IMAGE=mijn-leefstijl-migrate:2026-10-29 in het beveiligde .env.prod **voor** de build. Voeg bij gepushte images exact dezelfde release-SHA of registry digest toe.

## Stap 3 — In Portainer starten

1. Ga naar **Stacks → Add stack**, kies Docker Standalone → **Web editor**.
2. Plak de inhoud van **compose.prod.yml** (NIET compose.build.yml).
3. Vul de variabelen uit je lokale .env.prod in bij **Environment variables** in Portainer; je kunt ze ook vanuit een beveiligd bestand importeren. Controleer dat ze niet als letterlijke tekst in een publieke Git-commit terechtkomen.
4. De images moeten aanwezig zijn op hetzelfde Docker-host-endpoint, of als vooraf gepushte registry-images bereikbaar zijn. Maak **nooit** gebruik van `down -v`: dat verwijdert zowel database- als fotovolume. Controleer dat Portainer geen onbedoelde oude of lokale image uit een andere release gebruikt.
5. Deploy de stack. De Postgres-container wordt healthy, de migrator voert de versiebeheer-migraties uit en **alleen bij succes** start de webapp.
6. Configureer de bestaande HTTPS-proxy naar **app:3000** op het externe proxy-netwerk (de werkelijke DNS-naam van de container hangt van je stackproject af; controleer de netwerkaliases). Configureer TLS en correcte Host / X-Forwarded-Proto.
7. Test externe login en lokaal in de appcontainer de readinesscheck.

Let op: migrator blijft na succesvolle uitvoering als **exited (0)** zichtbaar; dat is normaal. Na een redeploy kan die opnieuw draaien. Prisma migrate deploy past uitsluitend nieuwe migraties toe. **Geen stack auto-update zonder gecontroleerde backup vooraf.**

## Stap 4 — Eerste beheerder

Na de eerste succesvolle migratie: maak de eerste admin eenmalig aan met de officiële Better Auth CLI via de beheerimage. Voer dit **interactief** uit op de VPS (geen wachtwoord in shell history):

~~~sh
docker compose --env-file .env.prod -f compose.prod.yml \
  run --rm --no-deps migrate npm run auth:create-admin -- \
  --email beheerder@example.nl --name "Beheerder" --role admin
~~~

Zorg dat de PostgreSQL service draait. Registratie blijft publiek gesloten.

## Stap 5 — Backups en restoretest

Het databasescript hieronder maakt een consistente PostgreSQL custom-format dump (inclusief Better Auth accounts en leefstijlgegevens), met rechten 0600 en SHA-256. **Een DB-dump bevat geen foto's.** Maak in hetzelfde rustige onderhouds-/backupvenster ook een archief van het tweede private uploadvolume. Vermijd wijzigingen/uploads terwijl beide bestanden worden vastgelegd om inconsistentie tussen metadata en foto-bestanden te voorkomen. Backups bevatten **gevoelige persoonsgegevens**: encrypt off-host, beperk toegang, zet een bewaartermijn en verwijder oude backups volgens je beleid. Maak ook een **afzonderlijke, beveiligde backup van de runtime-secrets**, in het bijzonder de SMTP-encryptiesleutel. Een DB-backup alleen herstelt niet de SMTP-credentials wanneer de decryptiesleutel weg is.

~~~sh
# Op VPS: productie-DB dump naar ./backups, zonder de applicatie te stoppen
./scripts/backup-db.sh .env.prod ./backups
# Back-up van het afzonderlijke persistente private fotovolume
bash ./scripts/backup-private-uploads.sh .env.prod ./backups
# Expliciete hersteltests, nooit op de productie-DB of het productie-fotovolume
./scripts/test-restore.sh ./backups/leefstijl-YYYYMMDDTHHMMSSZ.dump
bash ./scripts/test-restore-private-uploads.sh ./backups/leefstijl-uploads-YYYYMMDDTHHMMSSZ.tar.gz
~~~

**Beide restoretests veranderen de productie-DB en het privéfotovolume niet.** De uploadhersteltest pakt het fotoarchief uit in een tijdelijke directory die na de proef wordt verwijderd. Bewaar de DB-backup, foto-backup en checksums als één samenhangende herstelset; test een volledige herstelprocedure met fictieve data op een afzonderlijke stack. Controleer in het herstelverslag dat de kern- en migratietabellen aanwezig zijn. Draai deze proef na de eerste backup, daarna ten minste periodiek en vóór grote upgrades. Een succesvolle dump alleen is GEEN bewezen restore. Een cron/systemd timer voor regelmatige backups is een operator-keuze; verifieer altijd dat uploads naar off-host opslag werkelijk lukken en test herstel daaruit.

Bij een echte disaster restore: stop de app, maak een snapshot van de huidige situatie, herstel eerst in een **aparte** database/stack **én een apart privéfotovolume**, controleer de metadata/foto-koppeling en het juiste schema, en wijs pas daarna de applicatie naar de herstelde database en uploadopslag. Gebruik geen directe destructieve 'pg_restore --clean' op productie via het automatische testscript. Raak het Docker volume niet aan met 'down -v'.

## Stap 6 — Release en rollback

Voor **elke** upgrade: maak een verse **database- én foto-backup**, test herstel, archiveer de bijbehorende encryptiesleutels, bouw/push beide images van hetzelfde gereviewde commit, controleer migraties en deploy daarna pas. Voer healthcheck, login, gebruikersisolatie en reflectie-/doelhistoriecontroles uit.

Bij een mislukte migratie **niet** zomaar de oude image tegen een gewijzigde database terugzetten: beoordeel schema-compatibiliteit. Herstel, indien nodig, de geverifieerde backup in een aparte database en volg een gecontroleerd omschakelplan. Bij code-only fouten zonder incompatibele migraties kun je de vorige image tags terugplaatsen. Stop nooit databases met 'docker compose down -v'.

## Scope, licenties en open punten

- Hergebruikt: officiële Docker Node/Postgres images, Next.js standalone output, Compose v2 healthchecks/dependency ordering, Prisma 7 migrate deploy, Better Auth CLI. Geen extra runtime-dependencies en geen extra diensten voor monitoring/backups.
- Licentie: bestaande AGPL-3.0-only projectcode, Docker/Prisma/Node ecosysteemlicenties behouden. CI produceert licentie-inventaris (met handmatige review voor copyleft/attributie) en voert audit van productieafhankelijkheden uit.
- Nog te doen bij echte VPS-ingebruikname: TLS-proxy-details verifiëren, secretmanagement en beveiligde **off-host database- én foto-backup** inrichten, een volledig herstel van fictieve data op een aparte VPS/stack oefenen en een security review van de VPS uitvoeren. Geen productie-credentials in Git.

## Integratie met de gemergede app (#5 en #6)

De productiestack gebruikt dezelfde Prisma-migraties als `main` (inclusief `20261029003000_weekly_reflections_meetings`, `20261029004000_private_meeting_photos` en `20261029005000_admin_smtp_settings`). De app image neemt de Next.js 12 MB uploadlimiet voor privéfoto's en de modules `pdf-lib`, `sharp`, `nodemailer` mee. De afzonderlijke migrator heeft de Prisma-CLI plus Better Auth-admin-CLI zodat de eerste beheerder aangemaakt kan worden.

**SMTP_ENCRYPTION_KEY mag niet opnieuw worden gegenereerd** wanneer er al een werkende versleutelde SMTP-configuratie bestaat. Voor migratie van een bestaande omgeving moeten de bijbehorende sleutel en de database als één set worden bewaard. `BETTER_AUTH_SECRET` moet bij een bestaande productie-installatie eveneens stabiel blijven.

**Let op bij de eerste stap:** de voorbeeldstack is uitsluitend voor een reverse-proxy op dezelfde Docker-host. Als je al een Nginx Proxy Manager-, Traefik- of Caddy-netwerk hebt, configureer `PROXY_NETWORK` op dat bestaande netwerk. Maak nooit onnodig een tweede publieke proxy of open poort 5432. Het eigen `DATABASE_URL`-wachtwoord en `POSTGRES_PASSWORD` moeten dezelfde waarde hebben.
