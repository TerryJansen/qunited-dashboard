// Hulp via Claude (Anthropic). Een proef: alles wat met de dienst te maken heeft staat in dit
// bestand en in Assistant.jsx, zodat het later in één keer om te zetten of weg te halen is.
//
// Er staat bewust geen sleutel in de code. Ieder vult zijn eigen API-sleutel in; die blijft in
// deze browser (localStorage, eigen sleutel buiten de werkruimte) en gaat niet mee in een back-up.
import { modules, resolveReference } from './modules';

export const KEY_STORAGE = 'qunited.assistantKey';
export const API_URL = 'https://api.anthropic.com/v1/messages';
export const MODEL = 'claude-haiku-5-5';
const MAX_TOKENS = 1024;
// Contactgegevens zijn voor een vraag over het dashboard nooit nodig; die gaan nooit mee.
const NEVER_SEND = new Set(['email', 'phone']);

export function getKey() {
 try { return localStorage.getItem(KEY_STORAGE) || ''; } catch { return ''; }
}
export function setKey(key) {
 try { localStorage.setItem(KEY_STORAGE, key.trim()); return true; } catch { return false; }
}
export function clearKey() {
 try { localStorage.removeItem(KEY_STORAGE); } catch { /* niets te wissen */ }
}

/** Wat elk scherm doet, afgeleid uit dezelfde moduledefinities als de app zelf, zodat het klopt. */
function appDescription() {
 const lines = Object.values(modules).filter(m => !m.hidden).map(m =>
  `- ${m.title}: ${m.description} Velden: ${m.fields.map(field => field.label + (field.required ? ' (verplicht)' : '')).join(', ')}. Statussen: ${m.states.join(', ')}.`);
 return lines.join('\n');
}

export function systemPrompt(today) {
 return `Je bent de hulp in het Qunited-dashboard, een werkruimte van een Nederlands detacheringsbedrijf.
De mensen die je vragen stellen zijn vaak oudere vakmensen die weinig met computers doen. Vandaag is het ${today}.

Hoe je antwoordt:
- Altijd in eenvoudig Nederlands. Korte zinnen. Geen vakjargon.
- Bij een "hoe doe ik"-vraag: genummerde stappen, maximaal zes, en noem knoppen en menu-items precies zoals ze heten, tussen aanhalingstekens.
- Gewone tekst, geen opmaak: geen sterretjes, hekjes of tabellen.
- Kort. Liever drie goede zinnen dan een lap tekst.
- Verzin nooit gegevens. Weet je iets niet, of staat het niet in de meegestuurde werkruimte, zeg dat dan gewoon.
- Je kunt zelf niets in het dashboard veranderen; je legt uit hoe de gebruiker het doet.
- Gaat een vraag over iets buiten het dashboard, help dan kort als je kunt, maar zeg erbij dat je vooral voor het dashboard bent.

Hoe het dashboard werkt:
- Links staat het menu (op de telefoon achter de knop "Menu"), in groepen: Overzicht (Dashboard, Rapportages), Werk (Projecten, Planning, Urenstaten), Mensen (Personeel, Afwezigheid), Middelen (Materiaal, Inventaris), Administratie (Facturatie, IT & support, Procedures). Onderaan staan "Back-up" en "Hulp".
- Elk onderdeel is een lijst. Bovenaan staat de knop "Toevoegen". Daaronder tabbladen per status, een zoekveld en "Filters wissen". Per regel staan "Bewerken" en "Verwijderen". Klik op de naam om alles van die regel te zien.
- Een medewerker voeg je één keer toe bij Personeel; daarna kies je hem overal uit een lijst. Cv's en certificaten voeg je toe bij Personeel via "Bestanden" (eerst de medewerker opslaan).
- Planning is de weekagenda. Klik op een vrije dag bij een medewerker om hem op een project te zetten (project, van, tot en met, rol). Klik op een blok om die inzet te wijzigen of te verwijderen. Bladeren met "Vorige week" en "Volgende week".
- Het Dashboard toont wie waar ingezet is, wie beschikbaar is, actiepunten, lopende projecten en wie binnenkort vrijkomt.
- Rapportages toont uren per week, per project en per medewerker, met CSV-downloads.
- Back-up maakt één bestand van alle gegevens ("Back-up downloaden") en kan dat weer terugzetten. Gegevens staan alleen in deze browser op dit apparaat; een back-up op een USB-stick is verstandig.
- Er zijn geen accounts en er is geen centrale opslag. Wat je op de telefoon invoert, staat niet op de laptop.

De onderdelen:
${appDescription()}`;
}

/** De werkruimte als leesbare tekst: verwijzingen als naam, zonder contactgegevens. */
export function workspaceSummary(data) {
 const out = {};
 for (const [key, m] of Object.entries(modules)) {
  const records = data[key] || [];
  if (!records.length) continue;
  out[m.title] = records.map(record => {
   const row = {};
   if (m.derivedName) row.Naam = m.derivedName(record, data);
   for (const field of m.fields) {
    const value = record[field.key];
    if (value === undefined || value === '' || NEVER_SEND.has(field.key)) continue;
    if (field.source) {
     const link = resolveReference(data, field.source, value);
     row[field.label] = link.kind === 'record' ? link.record.name : link.kind === 'tekst' ? link.text : '(verwijderd)';
    } else row[field.label] = value;
   }
   row.Status = record.status;
   return row;
  });
 }
 return Object.keys(out).length ? JSON.stringify(out) : '';
}

export class AssistantError extends Error {}

/** Wat er misging, in woorden die iemand kan gebruiken. */
export function explain(status, body) {
 const message = body?.error?.message || '';
 if (status === 401 || status === 403) return 'De sleutel wordt niet geaccepteerd. Controleer of je hem helemaal goed hebt geplakt, of maak een nieuwe aan.';
 if (status === 400 && /credit|balance|billing/i.test(message)) return 'Het tegoed bij Anthropic is op. Vul het tegoed aan in de Claude Console.';
 if (status === 429) return 'Er zijn even te veel vragen tegelijk gesteld. Wacht een minuut en probeer het opnieuw.';
 if (status === 529 || status >= 500) return 'De dienst van Anthropic is even overbelast of niet bereikbaar. Probeer het straks opnieuw.';
 return 'De vraag kon niet worden beantwoord. Probeer het opnieuw.';
}

/**
 * Stel een vraag. `history` is [{role:'user'|'assistant', text}], de laatste is de nieuwe vraag.
 * Werkruimtegegevens gaan alleen mee als `data` is meegegeven.
 */
export async function ask({ key, history, data, today, fetchImpl = fetch }) {
 let system = systemPrompt(today);
 const workspace = data ? workspaceSummary(data) : '';
 if (data) system += workspace
  ? `\n\nDe gebruiker heeft de huidige gegevens van de werkruimte meegestuurd (JSON):\n${workspace}`
  : '\n\nDe gebruiker heeft de werkruimte meegestuurd, maar die is nog leeg.';

 let response;
 try {
  response = await fetchImpl(API_URL, {
   method: 'POST',
   headers: {
    'content-type': 'application/json',
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
    // Nodig om vanuit een browser te mogen bellen. De naam waarschuwt terecht: de sleutel is in
    // de browser leesbaar. Daarom vult ieder zijn eigen sleutel in en staat er geen in de code.
    'anthropic-dangerous-direct-browser-access': 'true',
   },
   body: JSON.stringify({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages: history.map(turn => ({ role: turn.role, content: turn.text })),
   }),
  });
 } catch {
  throw new AssistantError('Er is geen verbinding met de hulp. Controleer of je internet hebt.');
 }

 let body = null;
 try { body = await response.json(); } catch { /* geen JSON: de status zegt genoeg */ }
 if (!response.ok) throw new AssistantError(explain(response.status, body));
 const text = (body?.content || []).filter(block => block.type === 'text').map(block => block.text).join('\n').trim();
 if (!text) throw new AssistantError('Er kwam geen antwoord terug. Probeer het opnieuw.');
 // Opmaaktekens die toch doorglippen, weghalen: het antwoord wordt als gewone tekst getoond.
 return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#+\s*/gm, '');
}
