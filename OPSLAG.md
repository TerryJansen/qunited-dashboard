# Opslag: hoe het nu werkt en wat centrale opslag zou kosten

Dit document hoort bij punt 10 van de verbeteropdracht. Het beschrijft de huidige situatie
feitelijk, en wat er nodig is voor centrale opslag met accounts. **Er is nog geen backend
gebouwd.** Zolang dat zo is, blijft de melding "alleen opgeslagen in deze browser" op het
scherm staan, want die klopt.

## Hoe het nu werkt

| Wat | Waar | Sleutel |
| --- | --- | --- |
| Alle tekstgegevens (projecten, inzet, urenstaten, personeel, afwezigheid, materiaal, inventaris, facturatie, support, procedures) | `localStorage` van de browser | `qunited.records.v1` |
| Cv's en certificaten | `IndexedDB`, als blob | database `qunited-files`, store `files` |

Gevolgen, zonder omhaal:

- De gegevens staan **per browserprofiel op één apparaat**. Een collega op een andere laptop
  ziet een lege werkruimte. Jij op je telefoon ook.
- Er is **geen gebruikersaccount en geen rechten**. Wie de browser kan openen, ziet alles,
  inclusief cv's en certificaten.
- Er is **geen automatische back-up**. Browsergegevens wissen, een privévenster, een nieuw
  profiel of een andere browser maakt de werkruimte onbereikbaar.
- De gegevens zijn **niet versleuteld** door de app zelf.
- GitHub Pages serveert alleen statische bestanden. Er draait dus niets aan de serverkant
  dat gegevens kan bewaren of een login kan controleren.

Wat er wél al is: **Back-up** maakt één JSON-bestand van de hele werkruimte, desgewenst
inclusief de bestanden, en kan dat weer inlezen. Terugzetten vervangt de werkruimte in één
keer en voegt niets toe, dus hetzelfde bestand twee keer inlezen geeft geen dubbele
registraties. Een back-upbestand is niet versleuteld en bevat personeelsgegevens leesbaar.

## Wat er nodig is voor centrale opslag

De app blijft op GitHub Pages staan; de opslag verhuist naar een externe dienst die de
browser aanroept. Dat vraagt drie dingen die ik niet zelf kan nemen:

1. **Een keuze voor een dienst.** Reële kandidaten zijn Supabase (Postgres, accounts,
   rechten per rij, bestandsopslag) en Firebase (Firestore, accounts, bestandsopslag).
   Beide hebben een gratis instapniveau en betaalde niveaus; controleer de actuele prijzen
   zelf, die veranderen.
2. **Een account en configuratie** bij die dienst, met de gegevens in een **EU-regio**.
3. **Een verwerkersovereenkomst.** Je zet cv's, certificaten en contactgegevens van
   medewerkers bij een derde partij. Dat is precies waar de AVG een verwerkersovereenkomst
   en een bewaartermijn voor vraagt. Dit is geen technische hobbel maar een zakelijke
   beslissing, en de belangrijkste van de drie.

## Volgorde die de gegevens heel laat

1. **Eerst exporteren.** Maak op elk apparaat dat nu gegevens heeft een back-up via het
   Back-up-scherm. Dit bestaat al en werkt.
2. **Schema opzetten** dat de modules uit `src/modules.js` één op één volgt, plus een tabel
   voor bestanden.
3. **Accounts en rechten** inrichten: inloggen per gebruiker, en lezen/schrijven alleen voor
   wie bij de werkruimte hoort.
4. **Import met validatie en een bronmerk.** Elk back-upbestand krijgt een eigen id; een
   tweede import van hetzelfde bestand wordt geweigerd in plaats van dubbel ingelezen.
5. **Schakelaar in de app.** De app leest en schrijft centraal óf lokaal, niet half. De
   lokale modus blijft werken tot de centrale is gecontroleerd met echte gegevens.
6. **Pas daarna** de melding op het scherm aanpassen en automatische back-ups aanzetten.

Wat hier nooit gebeurt: een geheime sleutel in de frontend of in deze repository. De
publieke sleutel van zo'n dienst mag in de frontend staan, maar alleen als de rechten aan
de serverkant zijn dichtgezet; de beheersleutel hoort daar niet.

## Wat jij moet beslissen

- Welke dienst, en wie betaalt het abonnement.
- Hoeveel mensen een account krijgen, en wie wat mag zien. Cv's en certificaten zijn niet
  voor iedereen.
- Of er een verwerkersovereenkomst wordt afgesloten en welke bewaartermijn geldt.

Geef die drie antwoorden en de rest is uitvoering.
