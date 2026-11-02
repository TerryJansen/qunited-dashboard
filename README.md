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

Dashboard met uitsluitend afgeleide cijfers en links. Projecten, Materiaal, Inventaris, Facturatie, IT & support, Procedures en Personeel hebben eigen pagina’s, toevoegen/bewerken/verwijderen met bevestiging, zoeken en statusfilters. Projecten hebben planning en voortgang; materiaal aantallen en referenties; inventaris assetgegevens; facturen relatie, bedrag en datums; support beschrijvingen en prioriteit; procedures eigen tekst en/of veilige http(s)-documentlink.

Personeel heeft naam, functie, contactgegevens en lokale bestandsbijlagen. Sla eerst de medewerker op, voeg vervolgens een cv (PDF/DOC/DOCX) of certificaat (PDF/JPG/PNG) toe. Maximaal 10 MB per bestand; certificaten ondersteunen naam en optionele geldigheidsdatum. Bestanden zijn te downloaden en met bevestiging te verwijderen. Verwijder eerst alle bijlagen voordat je de medewerker verwijdert, zodat geen persoonsgegevens achterblijven zonder zichtbare eigenaar.

## Opslag en grenzen

- **Alleen opgeslagen in deze browser.** Tekstgegevens staan in localStorage (`qunited.records.v1`); bestanden als blobs in IndexedDB (`qunited-files`). Geen base64-bestanden in localStorage.
- Geen backend, accounts, autorisatie, synchronisatie of centrale upload. Persoonsgegevens worden niet verzonden. Geen externe fonts of analytics. Documentlinks openen alleen wanneer je er zelf op klikt.
- Browsergegevens zijn niet versleuteld door deze app. Gebruik geen gedeeld browserprofiel voor vertrouwelijke personeelsinformatie. Houd zelf originele bestanden/back-ups bij. Wissen van browsergegevens, privévensters of een andere origin/browser kan gegevens onbereikbaar maken of verwijderen.
- Geen centrale back-up of gelijktijdige bewerking: gebruik één tabblad tegelijk. Downloads bewaren losse bestanden, niet de volledige administratie.
- Opslagfouten worden zichtbaar gemeld; niet-opgeslagen formulieren blijven staan. Ongeldige opgeslagen gegevens worden niet automatisch overschreven; herstel de browseropslag via browserbeheer of gebruik een schoon profiel. Bestandslimieten en typechecks zijn geen antivirusscan.
- Facturatie is uitsluitend interne registratie, geen verzending, betaalverwerking of boekhouding. IT-meldingen worden niet bij een helpdesk afgeleverd. Materiaalregistratie plaatst geen bestelling. Procedures bevatten geen vooraf ingevulde veiligheidsinstructies.
- Actieve projecten: Planning/In uitvoering. Open factuurbedragen: status Open, EUR. Materiaal in gebruik: som van ingevulde aantallen met status In gebruik. IT: alle niet-opgeloste registraties. Geen historische trends.

De Playwright-suite dekt CRUD, zoeken/statusfilters en herladen voor alle zeven modules, navigatie/geschiedenis, mobiel, validatie, opslagfouten en cv-/certificaat upload, download en verwijdering.
