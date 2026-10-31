-- MVP #15: local, editable later via admin; seed inserts never overwrite admin edits.
CREATE TABLE "motivation_quote" (
  "id" VARCHAR(40) NOT NULL,
  "text" VARCHAR(300) NOT NULL,
  "category" VARCHAR(30),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "origin" VARCHAR(16) NOT NULL DEFAULT 'SEED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "motivation_quote_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "daily_motivation_quote" (
  "day" DATE NOT NULL,
  "quoteId" VARCHAR(40),
  "text" VARCHAR(300) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "daily_motivation_quote_pkey" PRIMARY KEY ("day")
);
CREATE TABLE "user_quote_preference" (
  "userId" TEXT NOT NULL,
  "mode" VARCHAR(6) NOT NULL DEFAULT 'AUTO',
  "customText" VARCHAR(300),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_quote_preference_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "user_quote_preference" ADD CONSTRAINT "user_quote_preference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Fixed, reviewed starter set; original Dutch copy, no external API and no copyrighted quotations.
INSERT INTO "motivation_quote" ("id", "text", "category") VALUES
  ('starter-001', 'Een plan dat alleen werkt op goede dagen, is geen plan voor het echte leven.', 'PLANNEN'),
  ('starter-002', 'Rust is geen beloning voor wanneer alles af is.', 'ONTSPANNING'),
  ('starter-003', 'Een verjaardag is geen examen in gezond eten.', 'VOEDING'),
  ('starter-004', 'Een sportplan dat alleen werkt als je energie over hebt, kan slimmer.', 'BEWEGEN'),
  ('starter-005', 'Je merkt vooruitgang soms eerder aan de trap dan aan de weegschaal.', 'BEWEGEN'),
  ('starter-006', 'Wat wil je straks weer kunnen doen waar je nu nog tegenop ziet?', 'REFLECTIE'),
  ('starter-007', 'Een gemiste wandeling hoef je niet in te halen. Kies je volgende moment.', 'BEWEGEN'),
  ('starter-008', 'Maak het jezelf gemakkelijk om morgen een goede keuze te maken.', 'PLANNEN'),
  ('starter-009', 'Niet alles wat goed voor je is, hoeft als een opgave te voelen.', 'PLEZIER'),
  ('starter-010', 'Soms begint gezonder leven met vanavond eerder stoppen.', 'SLAAP'),
  ('starter-011', 'Na een volle werkdag telt tien minuten buiten ook.', 'BEWEGEN'),
  ('starter-012', 'Een avond op de bank kan een goede keuze zijn als je rust nodig hebt.', 'ONTSPANNING'),
  ('starter-013', 'Je hoeft boodschappen niet perfect te doen om thuis iets voedzaams te eten.', 'VOEDING'),
  ('starter-014', 'Een slaapritme begint soms bij de laatste afspraak in je agenda.', 'SLAAP'),
  ('starter-015', 'De trap die vandaag makkelijker gaat, is ook vooruitgang.', 'BEWEGEN'),
  ('starter-016', 'Je bent niet je weegschaal. Merk op wat je lichaam wél kan.', 'EIGEN_REGIE'),
  ('starter-017', 'Past het vandaag niet? Maak je plan kleiner, niet je zelfkritiek groter.', 'HERSTEL'),
  ('starter-018', 'Ook zonder zin kun je kiezen voor vijf minuten bewegen.', 'BEWEGEN'),
  ('starter-019', 'Er is verschil tussen opgeven en je plan aanpassen.', 'HERSTEL'),
  ('starter-020', 'Wat hielp je de vorige keer toen je agenda overvol zat?', 'REFLECTIE'),
  ('starter-021', 'Je lijf merkt het als je pauze neemt voordat je leeg bent.', 'ONTSPANNING'),
  ('starter-022', 'Eten met vrienden is meer dan wat er op je bord ligt.', 'SOCIAAL'),
  ('starter-023', 'Je hoeft een drukke week niet te compenseren met een streng weekend.', 'HERSTEL'),
  ('starter-024', 'Als je plan vandaag niet lukte, mag morgen gewoon morgen zijn.', 'HERSTEL'),
  ('starter-025', 'Welke gewoonte kost je energie, en wat kan vandaag lichter?', 'REFLECTIE'),
  ('starter-026', 'Een glas water klaarzetten werkt soms beter dan een groot voornemen.', 'PLANNEN'),
  ('starter-027', 'De wandeling na het eten hoeft geen prestatie te worden.', 'BEWEGEN'),
  ('starter-028', 'Herstellen hoort bij oefenen; ook een rustige dag telt mee.', 'ONTSPANNING'),
  ('starter-029', 'Wat je op een gewone dinsdag volhoudt, is meer waard dan een perfect maandagplan.', 'PLANNEN'),
  ('starter-030', 'Een keuze die je morgen opnieuw kunt maken, is sterker dan een eenmalige sprint.', 'EIGEN_REGIE')
ON CONFLICT ("id") DO NOTHING;
