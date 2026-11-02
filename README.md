# Qunited dashboard

Nederlandstalige, lokale werkruimte. Start volledig leeg: geen demo-projecten, fictieve medewerkers, historische cijfers of externe systeemstatus.

## Start en controle

```sh
npm ci
npx playwright install chromium
npm run dev
npm test
npm run build
```

Tests starten zelf een geïsoleerde Vite-server op 127.0.0.1:4182 en gebruiken echte Chromium-browserinteracties. Bestaande servers hoeven niet te worden gestopt. `dist/` bevat de statische productiebuild. Hashroutes werken zonder server-side routerconfiguratie.

## Onderdelen

Dashboard met uitsluitend afgeleide cijfers, attentiepunten en links. Projecten, Inzet, Urenstaten, Personeel, Materiaal, Inventaris, Facturatie, IT & support en Procedures hebben eigen pagina’s, toevoegen/bewerken/verwijderen met bevestiging, zoeken en statusfilters. Projecten hebben planning en voortgang; inzet koppelt een medewerker aan een project met periode, rol en uren per week; materiaal aantallen en referenties; inventaris assetgegevens; facturen relatie, bedrag en datums; support beschrijvingen en prioriteit; procedures eigen tekst en/of veilige http(s)-documentlink.

Personeel heeft naam, functie, contactgegevens en lokale bestandsbijlagen. Sla eerst de medewerker op, voeg vervolgens een cv (PDF/DOC/DOCX) of certificaat (PDF/JPG/PNG) toe. Maximaal 10 MB per bestand; certificaten ondersteunen naam en optionele geldigheidsdatum. Bestanden zijn te downloaden en met bevestiging te verwijderen. Een medewerker of project kan niet worden verwijderd zolang er uren- of inzetregistraties aan hangen; verwijder bij personeel eerst alle bijlagen, zodat geen persoonsgegevens achterblijven zonder zichtbare eigenaar.

Rapportages tonen uren per project en per medewerker met datum-, project- en medewerkerfilters, de bezetting van vandaag (wie staat op welk project, wie is beschikbaar) en een werkruimteoverzicht van project- en inzetstatussen en openstaande facturen. Uren en inzet zijn als CSV te downloaden.

Back-up zet de hele werkruimte in één JSON-bestand, desgewenst inclusief cv’s en certificaten, en leest zo’n bestand weer in. Dezelfde pagina kan de werkruimte in deze browser volledig wissen.

## Attentiepunten

Het dashboard leidt attentiepunten uitsluitend af uit datums die je zelf hebt ingevuld, en splitst ze in verstreken en binnenkort aflopend: projecteinddatums en einde inzet, vervaldatums van open facturen, volgende inspectie van inventaris, benodigd-op van materiaal dat nog nodig is, herzieningsdatum van actuele procedures, een inzet die al begonnen is maar nog op Gepland staat, en de geldigheidsdatum van certificaten. Er worden geen trends, voorspellingen of externe bronnen gebruikt.

## Opslag en grenzen

- **Alleen opgeslagen in deze browser.** Tekstgegevens staan in localStorage (`qunited.records.v1`); bestanden als blobs in IndexedDB (`qunited-files`). Geen base64-bestanden in localStorage.
- Geen backend, accounts, autorisatie, synchronisatie of centrale upload. Persoonsgegevens worden niet verzonden. Geen externe fonts of analytics. Documentlinks openen alleen wanneer je er zelf op klikt.
- Browsergegevens zijn niet versleuteld door deze app. Gebruik geen gedeeld browserprofiel voor vertrouwelijke personeelsinformatie. Houd zelf originele bestanden/back-ups bij. Wissen van browsergegevens, privévensters of een andere origin/browser kan gegevens onbereikbaar maken of verwijderen.
- Een back-upbestand is niet versleuteld en bevat personeelsgegevens leesbaar; bewaar het als vertrouwelijk. Terugzetten vervangt alles in deze browser en kan niet ongedaan worden gemaakt. Bijlagen zonder bijbehorende medewerker in dezelfde back-up worden overgeslagen, net als bestanden met een niet-toegestaan type of boven 10 MB.
- Geen centrale back-up of gelijktijdige bewerking: gebruik één tabblad tegelijk. Downloads bewaren losse bestanden, niet de volledige administratie.
- Opslagfouten worden zichtbaar gemeld; niet-opgeslagen formulieren blijven staan. Ongeldige opgeslagen gegevens worden niet automatisch overschreven; herstel de browseropslag via browserbeheer of gebruik een schoon profiel. Bestandslimieten en typechecks zijn geen antivirusscan.
- Facturatie is uitsluitend interne registratie, geen verzending, betaalverwerking of boekhouding. IT-meldingen worden niet bij een helpdesk afgeleverd. Materiaalregistratie plaatst geen bestelling. Inzet plant niemand in en bericht niemand. Procedures bevatten geen vooraf ingevulde veiligheidsinstructies.
- Actieve projecten: Planning/In uitvoering. Lopende inzet en bezetting: status Gepland/Actief waarvan de periode vandaag omvat. Beschikbaar personeel: actieve medewerkers zonder zo’n lopende inzet. Open factuurbedragen: status Open, EUR. Materiaal in gebruik: som van ingevulde aantallen met status In gebruik. IT: alle niet-opgeloste registraties. Geen historische trends.

De Playwright-suite dekt CRUD, zoeken/statusfilters en herladen voor alle modules, navigatie/geschiedenis, mobiel, validatie, opslagfouten, cv-/certificaat upload, download en verwijdering, de afgeleide attentiepunten, de bezettingsrapportage en de volledige back-up heen en terug inclusief geweigerde en beschadigde bestanden.
