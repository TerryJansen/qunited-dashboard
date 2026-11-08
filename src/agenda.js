// De weekagenda: per medewerker per dag wat hij doet, met aaneengesloten dagen samengevoegd
// tot één blok, zodat "ma t/m vr op Platform K14" één balk met de naam erin is.
import { coverWindow, coverRows } from './cover';
import { shiftDays } from './alerts';

const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const DAY_LONG = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const DAY_SHORT = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
const PRIORITY = { afwezig: 0, actief: 1, gepland: 2, afgerond: 3 };

const asDate = iso => new Date(`${iso}T00:00:00Z`);

/** ISO-weeknummer, zoals in elke Nederlandse agenda. */
export function weekNumber(iso) {
 const date = asDate(iso);
 const thursday = new Date(date);
 thursday.setUTCDate(date.getUTCDate() + 3 - ((date.getUTCDay() + 6) % 7));
 const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
 return 1 + Math.round(((thursday - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

/** "9 t/m 15 november 2026", of over een maandgrens "30 november t/m 6 december 2026". */
export function weekRange(start, end) {
 const a = asDate(start), b = asDate(end);
 const left = a.getUTCMonth() === b.getUTCMonth() ? `${a.getUTCDate()}` : `${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]}${a.getUTCFullYear() !== b.getUTCFullYear() ? ` ${a.getUTCFullYear()}` : ''}`;
 return `${left} t/m ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
}

export function dayInfo(iso, today) {
 const date = asDate(iso);
 return {
  iso,
  short: DAY_SHORT[date.getUTCDay()],
  long: DAY_LONG[date.getUTCDay()],
  date: `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()].slice(0, 3)}`,
  number: date.getUTCDate(),
  weekend: [0, 6].includes(date.getUTCDay()),
  today: iso === today,
 };
}

/** Wat iemand op dag `index` doet: de belangrijkste eerst (afwezig gaat voor). */
function entriesOn(bars, index) {
 return bars.filter(bar => bar.from <= index && bar.to >= index)
  .sort((a, b) => PRIORITY[a.kind] - PRIORITY[b.kind] || a.label.localeCompare(b.label, 'nl'));
}
const keyOf = entries => entries.map(entry => `${entry.kind}|${entry.href}`).join(',');

/**
 * De week van `offset` weken na deze week. Elke rij heeft segmenten met een `span` in dagen;
 * een leeg segment is een vrije periode.
 */
export function week(data, today, offset = 0) {
 const window = coverWindow(shiftDays(today, offset * 7), 7, today);
 const days = window.days.map(day => dayInfo(day.iso, today));
 const people = coverRows(data, window, today).sort((a, b) => a.label.localeCompare(b.label, 'nl'));
 const rows = people.map(person => {
  const segments = [];
  for (let index = 0; index < 7; index += 1) {
   const entries = entriesOn(person.bars, index);
   const last = segments.at(-1);
   // Een vrije werkdag loopt niet door in het weekend: zaterdag en zondag zijn hun eigen blok.
   const sameFreeKind = last && !entries.length && !last.entries.length && last.weekend === days[index].weekend;
   if (last && entries.length && keyOf(last.entries) === keyOf(entries)) last.span += 1;
   else if (sameFreeKind) last.span += 1;
   else segments.push({ start: index, span: 1, entries, weekend: days[index].weekend });
  }
  return { id: person.id, name: person.label, role: person.sub, href: person.href, segments, perDay: days.map((_, i) => entriesOn(person.bars, i)) };
 });
 return {
  start: window.start, end: window.end, days, rows,
  number: weekNumber(window.start),
  range: weekRange(window.start, window.end),
  todayIndex: window.today,
 };
}
