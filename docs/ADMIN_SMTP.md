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
