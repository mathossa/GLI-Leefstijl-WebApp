# Issue #6 — adminpaneel en SMTP-relay

De voorbereidende branch is geïntegreerd met de gemergede #5. Reflecties, privéfoto's, PDF-export en weeknummers blijven behouden. De bestaande Better Auth Admin-plugin verzorgt gebruikersbeheer: nieuwe leden toevoegen, rol wijzigen en blokkeren/deblokkeren. Er zijn geen eigen auth-tabellen of eigen wachtwoordhashes.

## SMTP en privacy

De SMTP-relay is optioneel. Zonder mailinstellingen blijven inloggen en alle leefstijlfunctionaliteiten werken. SMTP is uitsluitend toegestaan via de ingestelde relayhost en poort; direct MX en poort 25 zijn uitgesloten. Alleen STARTTLS met verplichte TLS-upgrade of directe TLS met certificaatcontrole worden ondersteund.

Het SMTP-wachtwoord is met AES-256-GCM inclusief willekeurige nonce versleuteld in PostgreSQL. Maak een aparte SMTP_ENCRYPTION_KEY via het commando: openssl rand -base64 32. Stel die in via de runtime .env of Portainer-secret. Gebruik nooit BETTER_AUTH_SECRET als encryptiesleutel. Bewaar de decryptiesleutel gescheiden van de database en bewaar haar voor herstel; bij verlies moet het SMTP-wachtwoord opnieuw worden ingesteld.

De testmail gaat uitsluitend naar de aangemelde beheerder. Een atomische Postgres-update begrenst alle testaanvragen op één per vijf minuten, ook bij gelijktijdige requests. De server onthult geen wachtwoord of SMTP-transportfouten aan de browser. Auditrecords bevatten alleen actor-ID, gebeurtenis en tijdstip.

Er is nog geen publieke self-registration, geen e-mailverificatie of wachtwoord-resetflow. Nieuwe gebruikers krijgen een door de admin ingevoerd wachtwoord; deel dat buiten de app via een veilig kanaal.

## Migratie, test en hergebruik

Additieve migratie: 20261029005000_admin_smtp_settings. Deze laat alle bestaande auth-, doelen-, actie-, reflectie- en historierecords ongemoeid. Voor productie vooraf een volledige DB-backup maken en het bewaren van de encryptiesleutel controleren. Terugval bij een fout: de vorige applicatieversie draait zonder de twee nieuwe tabellen; nooit bestaande gegevens verwijderen.

Geautomatiseerd: node --experimental-strip-types --test tests/admin-smtp.test.mjs; daarnaast lint, typecheck, build en bestaande auth-smoke-tests via CI. Voor handmatige review: /admin openen als admin en lid, relay uit/aan, poort 25 afwijzen, optioneel wachtwoord bewaren, eigen testmail, cooldown, foutieve TLS en geen secrets in network responses.

REUSE FIRST: Better Auth Admin-plugin (MIT), Nodemailer 10.2.1 (MIT-0; https://nodemailer.com/license), bestaande shadcn/ui (MIT), Next.js Server Actions en Node.js native crypto. Geen eigen SMTP-protocol of gebruikerssessies geschreven.

## Gerichte, privacyveilige SMTP-diagnostiek

Bij een mislukte testmail toont het adminpaneel nu een *veilige categorie* (ontbrekende relayconfig, niet-ontsleutelbare credentials, DNS, verbinding, SMTP-auth, TLS-certificaat of geweigerd bericht). De serverlog toont uitsluitend de geallowliste foutcode, categorie en optionele numerieke SMTP-status, **nooit het ruwe Nodemailer-errorobject, SMTP-response, host, adressen of wachtwoorden**. De vijfminutencooldown geldt ook na een mislukte verbinding.

Voordat je de test opnieuw uitvoert: bevestig dat `SMTP_ENCRYPTION_KEY` bestaat in de draaiende Node-server. Als de sleutel ná het opslaan van een SMTP-wachtwoord is vervangen, moet je de oorspronkelijke sleutel herstellen of het SMTP-wachtwoord opnieuw opslaan. Wijzig de sleutel niet zomaar wanneer bestaande credentials nog nodig zijn.

## Gebruikersnaam wijzigen en gebruikers verwijderen

Het gebruikersoverzicht heeft nu een eigen mobiele `Naam wijzigen`-sheet en een `Verwijderen`-sheet. Naam wijzigen gebruikt rechtstreeks `admin.updateUser` van de bestaande Better Auth Admin-plugin. Er wordt alleen het **weergavenaamveld** gewijzigd, niet het e-mailadres of een apart login-username (de app meldt nog steeds aan met e-mailadres).

Verwijderen vereist het **exact intypen van het e-mailadres** en een nieuwe server-side admin- en eigenaarcontrole. Een admin kan zichzelf niet verwijderen; voor andere beheeraccounts moeten eerst de beheerrechten worden ingetrokken. De gewone Better Auth `admin.removeUser` verzorgt het daadwerkelijke hard delete, met cascades van accounts, sessies, doelen, individuele registraties, reflecties, bijeenkomstnotities en bijbehorende foto-metadata. Een server-side Better Auth database-deletehook blokkeert verwijdering van huidige beheerders via alle API-paden, en ruimt na succesvolle verwijdering de private fotomap van het account op. Het auditlog registreert de actie zonder persoons- of gezondheidsgegevens.

**Let op:** verwijderingen zijn permanent. Herstel van per ongeluk verwijderde gegevens kan alleen via eigen database- en bestandsbackups. De bestaande admin-/gebruikersaanmaak- en SMTP-functies blijven intact.
