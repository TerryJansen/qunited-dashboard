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

De werkruimte heeft vijf soorten scherm. **Overzicht** beantwoordt vier vragen in één blik: wie is ingezet en wie is beschikbaar, welke projecten lopen, wat vraagt vandaag actie, en wat staat er open aan urenstaten en facturen. Bovenaan vier kerncijfers die doorklikken naar het gefilterde overzicht waar ze vandaan komen. Daaronder de bezettingsplanning — medewerkers links, vier weken over de breedte, met vorige en volgende — naast een actielijst. Daaronder de lopende en geplande projecten en wie er binnenkort vrijkomt. Op de telefoon wordt de planning een lijst van wie waar staat, want een tijdbalk van zes mensen over zeven dagen is op dat formaat niet te lezen.

Een medewerker voeg je één keer toe. Overal waar een persoon hoort — verantwoordelijke van een project, toegewezen aan een inventarisitem, melder van een storing, eigenaar van een procedure, en natuurlijk inzet, urenstaten en afwezigheid — kies je hem uit de lijst in plaats van zijn naam opnieuw te typen. Functie en telefoon komen uit de medewerker zelf en staan op de detailpagina; in tabellen staat alleen de naam, anders wordt het een muur van herhaling. Namen die vóór deze wijziging met de hand waren ingetypt worden bij het laden gekoppeld aan de medewerker met diezelfde naam; tekst die nergens op slaat blijft gewoon staan en overleeft een bewerking.

**Detail** toont één registratie in het geheel: alle velden, alles wat ernaar verwijst, en bij personeel de cv's en certificaten. Een projectpagina toont dus de locatie, de klant, de periode, de voortgang en de bezetting, plus wie erop staat en welke uren erop geschreven zijn. Je komt er via de titel in een lijst, via een balk in de planning of via een actiepunt.

Bezetting telt iemand één keer, ook met twee inzetten op dezelfde dag. Beschikbaar betekent: actief, niet ingezet én niet afwezig. "Inzetbaar vanaf" bij een aflopende inzet is de eerste dag daarna zonder inzet en zonder afwezigheid, dus een aflopende opdracht maakt iemand niet automatisch vrij.

De actielijst noemt per punt wat er moet gebeuren, wie of wat het betreft, de deadline of het aantal dagen achterstand, de urgentie en waar je het doet: urenstaten die beoordeling nodig hebben, werkdagen zonder urenstaat, projecten met een onvervulde personeelsbehoefte, verlopende certificaten, vervallen facturen, en verstreken inspectie-, materiaal- en herzieningsdatums. Zonder brongegevens meldt het scherm dat het niets heeft om uit af te leiden, in plaats van dat alles in orde is.

**Modules** zijn tabellen met onderstreepte tabs per status, een teller per tab, zoeken en één rij-actie per taak. Projecten, Inzet, Urenstaten, Personeel, Afwezigheid, Materiaal, Inventaris, Facturatie, IT & support en Procedures werken alle op dezelfde manier: toevoegen, bewerken en verwijderen met bevestiging. Een kolom die in elke zichtbare rij leeg is, valt weg. Inzet koppelt een medewerker aan een project met periode, rol en uren per week; de rijtitel wordt afgeleid uit medewerker en project, zodat die een hernoemd project volgt in plaats van te verouderen.

Personeel heeft naam, functie, contactgegevens en lokale bestandsbijlagen achter de rij-actie **Bestanden**. Sla eerst de medewerker op, voeg vervolgens een cv (PDF/DOC/DOCX) of certificaat (PDF/JPG/PNG) toe. Maximaal 10 MB per bestand; certificaten ondersteunen naam en optionele geldigheidsdatum. Bestanden zijn te downloaden en met bevestiging te verwijderen. Een medewerker of project kan niet worden verwijderd zolang er uren- of inzetregistraties aan hangen; verwijder bij personeel eerst alle bijlagen, zodat geen persoonsgegevens achterblijven zonder zichtbare eigenaar.

**Rapportages** toont uren per week naast de optelsom op dezelfde x-as, uren per project en per medewerker, de bezetting van vandaag en de project- en inzetstatussen. Uren en inzet zijn als CSV te downloaden; de datum-, project- en medewerkerfilters gelden alleen voor de uren en de uren-CSV.

**Back-up** zet de hele werkruimte in één JSON-bestand, desgewenst inclusief cv's en certificaten, en leest zo'n bestand weer in. Dezelfde pagina kan de werkruimte in deze browser volledig wissen.

## Vormgeving

Eén getint L-frame draagt de zijbalk en de topbalk; het werk staat op een wit blad met een haarlijnrand, afgeronde hoeken en geen schaduw. Kleur ligt op de data en op de status, niet op de chrome: het merkoranje is de enige datakleur, het merknavy is de inkt, en de zijbalk deelt de grond van het frame. Alle cijfers staan in IBM Plex Mono met vaste cijferbreedtes, zodat bedragen, uren en datums onder elkaar uitlijnen; dat lettertype staat gesubset in deze repo (`src/fonts/`, OFL-licentie ernaast) en wordt niet extern geladen.

## Attentiepunten

Het dashboard leidt attentiepunten uitsluitend af uit datums die je zelf hebt ingevuld, en splitst ze in verstreken en binnenkort aflopend: projecteinddatums en einde inzet, vervaldatums van open facturen, volgende inspectie van inventaris, benodigd-op van materiaal dat nog nodig is, herzieningsdatum van actuele procedures, een inzet die al begonnen is maar nog op Gepland staat, en de geldigheidsdatum van certificaten. Er worden geen trends, voorspellingen of externe bronnen gebruikt.

## Opslag en grenzen

De huidige opslag en wat centrale opslag met accounts zou vragen, staan in [OPSLAG.md](OPSLAG.md).

- **Alleen opgeslagen in deze browser.** Tekstgegevens staan in localStorage (`qunited.records.v1`); bestanden als blobs in IndexedDB (`qunited-files`). Geen base64-bestanden in localStorage.
- Geen backend, accounts, autorisatie, synchronisatie of centrale upload. Persoonsgegevens worden niet verzonden. Geen externe fonts of analytics. Documentlinks openen alleen wanneer je er zelf op klikt.
- Browsergegevens zijn niet versleuteld door deze app. Gebruik geen gedeeld browserprofiel voor vertrouwelijke personeelsinformatie. Houd zelf originele bestanden/back-ups bij. Wissen van browsergegevens, privévensters of een andere origin/browser kan gegevens onbereikbaar maken of verwijderen.
- Een back-upbestand is niet versleuteld en bevat personeelsgegevens leesbaar; bewaar het als vertrouwelijk. Terugzetten vervangt alles in deze browser en kan niet ongedaan worden gemaakt. Bijlagen zonder bijbehorende medewerker in dezelfde back-up worden overgeslagen, net als bestanden met een niet-toegestaan type of boven 10 MB.
- Geen centrale back-up of gelijktijdige bewerking: gebruik één tabblad tegelijk. Downloads bewaren losse bestanden, niet de volledige administratie.
- Opslagfouten worden zichtbaar gemeld; niet-opgeslagen formulieren blijven staan. Ongeldige opgeslagen gegevens worden niet automatisch overschreven; herstel de browseropslag via browserbeheer of gebruik een schoon profiel. Bestandslimieten en typechecks zijn geen antivirusscan.
- Facturatie is uitsluitend interne registratie, geen verzending, betaalverwerking of boekhouding. IT-meldingen worden niet bij een helpdesk afgeleverd. Materiaalregistratie plaatst geen bestelling. Inzet plant niemand in en bericht niemand. Procedures bevatten geen vooraf ingevulde veiligheidsinstructies.
- Actieve projecten: Planning/In uitvoering. Lopende inzet en bezetting: status Gepland/Actief waarvan de periode vandaag omvat. Beschikbaar personeel: actieve medewerkers zonder zo’n lopende inzet. Open factuurbedragen: status Open, EUR. Materiaal in gebruik: som van ingevulde aantallen met status In gebruik. IT: alle niet-opgeloste registraties. Geen historische trends.

De Playwright-suite telt 53 tests en dekt CRUD, zoeken/statusfilters en herladen voor alle modules, navigatie en geschiedenis, het opgevouwen menu op de telefoon, validatie, opslagfouten, cv-/certificaat upload, download en verwijdering, de afgeleide attentiepunten, de bezettingsbalk en -rapportage, de detailpagina's, en de volledige back-up heen en terug inclusief geweigerde en beschadigde bestanden. `tests/cover.test.js` rekent de bezetting zonder browser na: dubbele inzet, aansluitende inzet, afwezigheid, datumgrenzen en de zomertijd. `tests/helpers.js` bevat de gedeelde grepen: een werkruimte klaarzetten, een gegevensrij zoeken, het menu openen, op status filteren en de bestanden van een medewerker openklappen.
