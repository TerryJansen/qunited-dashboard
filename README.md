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

De werkruimte heeft vijf soorten scherm. **Overzicht** beantwoordt vier vragen in één blik: wie staat waar vandaag, welke projecten lopen, wat vraagt vandaag actie, en hoeveel urenstaten en projecten er lopen. Het bestaat uit kaarten: de gewerkte uren per dag van deze of vorige week (klik een dag aan voor de verdeling per project, met het verschil ten opzichte van de week ervoor), wie vandaag waar staat, de lopende projecten met hun looptijd, de bezetting van vandaag, de actiepunten en de urenstaten per status. Elke kaart heeft onderaan één link naar het hele scherm. **Urenstaten** staan per dag in een kaart, met het dagtotaal en de verdeling over de projecten erboven.

**Planning** (in het menu tussen Inzet en Urenstaten) is de weekagenda: medewerkers onder elkaar, maandag tot en met zondag naast elkaar, met de dag en de datum er voluit boven en vandaag gemarkeerd. Aaneengesloten dagen op hetzelfde project zijn één blok met de projectnaam, de rol en de uren per week erin; gepland, afwezig en afgerond hebben elk een eigen vorm en staan ook in woorden. Met Vorige week, Deze week en Volgende week blader je. **Inplannen doe je hier:** klik op een vrije dag bij een medewerker en er gaat een venster open met de medewerker en de dag al ingevuld. Je kiest alleen nog het project en tot wanneer (met knoppen voor alleen deze dag, t/m vrijdag, 2 weken of nog onbekend), eventueel een rol, en met een draaiwiel hoeveel uur per dag (begint op 8:00), met knoppen de pauze per dag (begint op 30 minuten). **De reistijd kies je niet zelf:** je geeft aan waar de medewerker vandaan rijdt (huis, of een ander adres) en de reistijd met de auto naar de locatie van het project wordt uitgerekend en vastgelegd (enkele reis, heen en terug en kilometers), zodat de planning hem kan controleren. Een project heeft daarom verplicht een locatie (adres, postcode of plaats; offshore de haven of heliport), en bij een medewerker vul je een vertrekadres in.

Voor die berekening gaan het vertrekadres en de projectlocatie naar twee openbare diensten op basis van OpenStreetMap: Nominatim (adres naar plek, OpenStreetMap Foundation) en de OSRM-routeserver van FOSSGIS e.V. in Duitsland. Geen sleutel, geen Amerikaans bedrijf, geen andere gegevens. Beide zijn bedoeld voor licht gebruik; elke uitkomst wordt in de browser onthouden zodat hetzelfde adres niet opnieuw wordt gevraagd. De tijd is een rit zonder file. Voor zwaarder gebruik kan dit later naar een eigen of betaalde Europese routeserver (`src/route.js`). De status (gepland, actief, afgerond) volgt vanzelf uit de datums. Een klik op een blok opent hetzelfde venster om de inzet te wijzigen of te verwijderen. Inzet heeft geen eigen menu-item meer en geen uren per week: de uren staan per dag in de urenstaten. Op de telefoon kies je een dag en zie je per medewerker wat hij die dag doet.

Een medewerker voeg je één keer toe. Overal waar een persoon hoort — verantwoordelijke van een project, toegewezen aan een inventarisitem, melder van een storing, eigenaar van een procedure, en natuurlijk inzet, urenstaten en afwezigheid — kies je hem uit de lijst in plaats van zijn naam opnieuw te typen. De lijst die openklapt begint meteen met de medewerkers, niet met een regel "Kies medewerker". Functie en telefoon komen uit de medewerker zelf en staan op de detailpagina; in tabellen staat alleen de naam, anders wordt het een muur van herhaling. Namen die vóór deze wijziging met de hand waren ingetypt worden bij het laden gekoppeld aan de medewerker met diezelfde naam; tekst die nergens op slaat blijft gewoon staan en overleeft een bewerking.

**Detail** toont één registratie in het geheel: alle velden, alles wat ernaar verwijst, en bij personeel de cv's en certificaten. Een projectpagina toont dus de locatie, de klant, de periode, de voortgang en de bezetting, plus wie erop staat en welke uren erop geschreven zijn. Je komt er via de titel in een lijst, via een balk in de planning of via een actiepunt.

Bezetting telt iemand één keer, ook met twee inzetten op dezelfde dag. Beschikbaar betekent: actief, niet ingezet én niet afwezig. "Inzetbaar vanaf" bij een aflopende inzet is de eerste dag daarna zonder inzet en zonder afwezigheid, dus een aflopende opdracht maakt iemand niet automatisch vrij.

De actielijst noemt per punt wat er moet gebeuren, wie of wat het betreft, de deadline of het aantal dagen achterstand, de urgentie en waar je het doet: urenstaten die beoordeling nodig hebben, werkdagen zonder urenstaat, projecten met een onvervulde personeelsbehoefte, verlopende certificaten, en verstreken inspectie-, materiaal- en herzieningsdatums. Zonder brongegevens meldt het scherm dat het niets heeft om uit af te leiden, in plaats van dat alles in orde is.

**Modules** zijn tabellen met onderstreepte tabs per status, een teller per tab, zoeken en één rij-actie per taak. Projecten, Urenstaten, Personeel, Afwezigheid, Materiaal, Inventaris, IT & support en Procedures werken alle op dezelfde manier: toevoegen, bewerken en verwijderen met bevestiging. Een kolom die in elke zichtbare rij leeg is, valt weg.

Bij **Urenstaten** kies je de gewerkte tijd met een draaiwiel, van 0:00 tot 24:00 per minuut: veeg of scroll naar het uur en de minuten, of tik erop. Daaronder staat altijd de pauze, met één knop per keuze: geen, 15, 30, 45 minuten of een uur, of zelf in minuten. Een nieuwe regel begint op 8:00 met 30 minuten pauze. In de lijst staat de tijd zoals op een urenbriefje (7:30) en de pauze ernaast; de uren-CSV heeft een kolom Pauze (min). De pauze wordt niet van de uren afgetrokken.

Personeel heeft naam, functie, contactgegevens en lokale bestandsbijlagen achter de rij-actie **Bestanden**. Sla eerst de medewerker op, voeg vervolgens een cv (PDF/DOC/DOCX) of certificaat (PDF/JPG/PNG) toe. Maximaal 10 MB per bestand; certificaten ondersteunen naam en optionele geldigheidsdatum. Bestanden zijn te downloaden en met bevestiging te verwijderen. Een medewerker of project kan niet worden verwijderd zolang er uren- of inzetregistraties aan hangen; verwijder bij personeel eerst alle bijlagen, zodat geen persoonsgegevens achterblijven zonder zichtbare eigenaar.

**Rapportages** is de plek voor documenten en rapporten per project. Links staan de projecten (lopende bovenaan, met het aantal documenten), rechts de documenten van het gekozen project. Een document voeg je toe met een bestand (PDF, Word, Excel, JPG of PNG, tot 25 MB), een titel, een datum en een soort: Rapport, Inspectierapport, Tekening, Foto of Overig. Je opent, downloadt of verwijdert het later met één knop. Op de projectpagina staan dezelfde documenten. Een project met documenten kan pas weg als de documenten weg zijn. De documenten gaan mee in de back-up met bestanden. Op de telefoon kies je het project uit een lijst.

**Hulp** (proef) beantwoordt vragen over het dashboard via Claude van Anthropic, een Amerikaans bedrijf. Er staat geen sleutel in de code: ieder vult op zijn eigen apparaat een eigen API-sleutel in, die alleen in deze browser blijft (`qunited.assistantKey`) en niet in een back-up meegaat. Standaard gaat alleen de vraag naar Anthropic; met een vinkje gaan ook de werkruimtegegevens mee, zonder telefoonnummers, e-mailadressen en bestanden. Het gesprek wordt niet bewaard. Alles van de hulp staat in `src/claude.js` en `src/Assistant.jsx`, zodat het in één keer te vervangen of weg te halen is.

**Back-up** zet de hele werkruimte in één JSON-bestand, desgewenst inclusief cv's en certificaten, en leest zo'n bestand weer in. Dezelfde pagina kan de werkruimte in deze browser volledig wissen.

## Vormgeving

De huisstijl volgt [qunited.eu](https://qunited.eu): het donkerblauw (#122941), het limoengroen uit de Q (#afe100) en het warme crème (#ede8e4), gemeten op de site zelf. Het logo is nagetekend als vectorbestand (`src/Logo.jsx`), zodat het op elk scherm scherp blijft; de app-iconen zijn uit dezelfde Q gemaakt.

Voor het dashboard staat een **inlogpagina** in de stijl van de site: een crème kaart met het logo, een begroeting die bij het tijdstip past en één knop, op een gedimde luchtfoto van een offshoreplatform. Een wachtwoord of e-mailadres is nog niet nodig; wie op Inloggen klikt, blijft ingelogd tot hij op **Uitloggen** (onderaan het menu) klikt. Dit is een voorportaal, geen beveiliging: echte accounts komen pas met centrale opslag.

In het dashboard draagt het crème frame de zijbalk en de bovenbalk; het werk staat op een wit blad. Tekst en knoppen zijn donkerblauw, het limoengroen staat op de data (de bezettingsbalken en de grafieken) en als streepje bij het actieve menu-item. Koppen staan in Poppins, geometrisch zoals het woordmerk; al het andere in Inter, met vaste cijferbreedtes zodat bedragen, uren en datums onder elkaar uitlijnen. Beide lettertypen staan gesubset in deze repo (`src/fonts/`, OFL-licenties ernaast) en worden niet extern geladen.

De achtergrond van de inlogpagina is een luchtfoto van een offshoreplatform met een bevoorradingsschip (`public/login-achtergrond.jpg`), onder een donkerblauwe laag zodat de tekst leesbaar blijft. Hoe donker, staat op één plek in `src/styles.css` (`.login::before`).

## Attentiepunten

Het dashboard leidt attentiepunten uitsluitend af uit datums die je zelf hebt ingevuld, en splitst ze in verstreken en binnenkort aflopend: projecteinddatums en einde inzet, volgende inspectie van inventaris, benodigd-op van materiaal dat nog nodig is, herzieningsdatum van actuele procedures, een inzet die al begonnen is maar nog op Gepland staat, en de geldigheidsdatum van certificaten. Er worden geen trends, voorspellingen of externe bronnen gebruikt.

## Opslag en grenzen

De huidige opslag, wat er gedaan wordt om verlies te voorkomen, en wat centrale opslag met accounts zou vragen, staan in [OPSLAG.md](OPSLAG.md). Kort: de site vraagt de browser de gegevens te bewaren, kan op het beginscherm van een iPhone, waarschuwt als een browser niets toezegt, en herinnert aan een back-up. Gegevens staan nog wel op één apparaat.

- **Alleen opgeslagen in deze browser.** Tekstgegevens staan in localStorage (`qunited.records.v1`); bestanden als blobs in IndexedDB (`qunited-files`). Geen base64-bestanden in localStorage.
- Geen backend, accounts, autorisatie, synchronisatie of centrale upload. Persoonsgegevens worden niet verzonden, behalve naar de hulp als je daar zelf het vinkje voor zet, en vertrekadres en projectlocatie naar de routedienst om de reistijd te berekenen. Geen externe fonts of analytics. Documentlinks openen alleen wanneer je er zelf op klikt.
- Browsergegevens zijn niet versleuteld door deze app. Gebruik geen gedeeld browserprofiel voor vertrouwelijke personeelsinformatie. Houd zelf originele bestanden/back-ups bij. Wissen van browsergegevens, privévensters of een andere origin/browser kan gegevens onbereikbaar maken of verwijderen.
- Een back-upbestand is niet versleuteld en bevat personeelsgegevens leesbaar; bewaar het als vertrouwelijk. Terugzetten vervangt alles in deze browser en kan niet ongedaan worden gemaakt. Bijlagen zonder bijbehorende medewerker in dezelfde back-up worden overgeslagen, net als bestanden met een niet-toegestaan type of boven 10 MB.
- Geen centrale back-up of gelijktijdige bewerking: gebruik één tabblad tegelijk. Downloads bewaren losse bestanden, niet de volledige administratie.
- Opslagfouten worden zichtbaar gemeld; niet-opgeslagen formulieren blijven staan. Ongeldige opgeslagen gegevens worden niet automatisch overschreven; herstel de browseropslag via browserbeheer of gebruik een schoon profiel. Bestandslimieten en typechecks zijn geen antivirusscan.
- Facturatie zit niet meer in de app. Facturen die al in een browser stonden, blijven daar ongemoeid in de opslag staan; ze worden niet gewist, maar ook niet meer getoond of in een back-up meegenomen. IT-meldingen worden niet bij een helpdesk afgeleverd. Materiaalregistratie plaatst geen bestelling. Inzet plant niemand in en bericht niemand. Procedures bevatten geen vooraf ingevulde veiligheidsinstructies.
- Actieve projecten: Planning/In uitvoering. Lopende inzet en bezetting: status Gepland/Actief waarvan de periode vandaag omvat. Beschikbaar personeel: actieve medewerkers zonder zo’n lopende inzet. Materiaal in gebruik: som van ingevulde aantallen met status In gebruik. IT: alle niet-opgeloste registraties. Geen historische trends.

De Playwright-suite telt 94 tests en dekt CRUD, zoeken/statusfilters en herladen voor alle modules, navigatie en geschiedenis, het opgevouwen menu op de telefoon, validatie, opslagfouten, cv-/certificaat upload, download en verwijdering, de afgeleide attentiepunten, de bezettingsbalk en -rapportage, de detailpagina's, de volledige back-up heen en terug inclusief geweigerde en beschadigde bestanden, en de hulp (met een nagebootste Anthropic-dienst: welke gegevens wel en niet meegaan, foutmeldingen, en dat de sleutel niet in een back-up belandt). `tests/cover.test.js` rekent de bezetting zonder browser na: dubbele inzet, aansluitende inzet, afwezigheid, datumgrenzen en de zomertijd. `tests/helpers.js` bevat de gedeelde grepen: een werkruimte klaarzetten, een gegevensrij zoeken, het menu openen, op status filteren en de bestanden van een medewerker openklappen.
