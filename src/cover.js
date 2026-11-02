import { isoToday, shiftDays, runsOn } from './alerts';
import { formatDate } from './format';

export const WINDOW_DAYS = 28;

const DAY_NAMES = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
const dayOfWeek = iso => new Date(`${iso}T00:00:00Z`).getUTCDay();
const dayNumber = iso => Number(iso.slice(8, 10));
const between = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);

/** Het venster begint op de maandag van deze week, zodat de weken herkenbaar blijven. */
export function coverWindow(iso = isoToday(), length = WINDOW_DAYS) {
 const start = shiftDays(iso, -((dayOfWeek(iso) + 6) % 7));
 const days = [], weekends = [];
 for (let index = 0; index < length; index += 1) {
  const day = shiftDays(start, index);
  const dow = dayOfWeek(day);
  if (dow === 0 || dow === 6) weekends.push(index);
  days.push({ label: `${DAY_NAMES[dow]} ${dayNumber(day)}`, short: String(dayNumber(day)), iso: day });
 }
 return { start, end: days.at(-1).iso, days, weekends, today: between(start, iso) };
}

// Elke soort inzet zijn eigen mark, zodat gepland op één blik van actief te onderscheiden is.
export const COVER_KINDS = {
 actief: { label: 'Actief', mark: 'hue', code: 'A' },
 gepland: { label: 'Gepland', mark: 'outline', code: 'G', dash: true },
 afgerond: { label: 'Afgerond', mark: 'step', code: 'R' },
};
const KIND_OF = { Actief: 'actief', Gepland: 'gepland', Afgerond: 'afgerond' };

/**
 * Eén rij per actieve medewerker, met een balk per inzet. Medewerkers zonder lopende inzet staan
 * bovenaan en daarna wie het eerst vrijkomt: dat is de volgorde waarin de planner ze nodig heeft.
 */
export function coverRows(data, window, iso = isoToday()) {
 const rows = data.personeel.filter(person => person.status === 'Actief').map(person => {
  const assignments = data.inzet.filter(item => item.employeeId === person.id && KIND_OF[item.status]);
  const bars = assignments.map(item => {
   const from = item.start ? between(window.start, item.start) : 0;
   const to = item.end ? between(window.start, item.end) : window.days.length - 1;
   const project = data.projecten.find(p => p.id === item.projectId);
   return {
    from, to, kind: KIND_OF[item.status],
    label: project?.name || 'Verwijderd project',
    note: [item.role, item.hoursPerWeek ? `${item.hoursPerWeek} uur per week` : ''].filter(Boolean).join(' · '),
   };
  }).filter(bar => bar.to >= 0 && bar.from < window.days.length);
  const running = assignments.filter(item => runsOn(item, iso));
  return {
   label: person.name,
   sub: person.role || '',
   bars,
   free: !running.length,
   freeOn: running.map(item => item.end).filter(Boolean).sort()[0] || '',
  };
 });
 return rows.sort((a, b) =>
  Number(b.free) - Number(a.free)
  || (a.freeOn || '9999').localeCompare(b.freeOn || '9999')
  || a.label.localeCompare(b.label, 'nl'));
}

/** Wie komt er binnen het venster vrij, en wanneer. */
export function comingFree(data, window, iso = isoToday()) {
 return coverRows(data, window, iso)
  .filter(row => !row.free && row.freeOn && row.freeOn <= window.end)
  .map(row => ({ name: row.label, role: row.sub, on: row.freeOn }));
}

/** De ene bevinding, berekend uit de data en met de maatstaf in dezelfde zin. */
export function coverFinding(data, iso = isoToday()) {
 const active = data.personeel.filter(person => person.status === 'Actief');
 if (!active.length) return 'Nog geen actieve medewerkers vastgelegd.';
 const running = data.inzet.filter(item => runsOn(item, iso));
 if (!running.length) {
  return `Nog geen lopende inzet: alle ${active.length} actieve medewerkers staan nergens op.`;
 }
 const free = active.filter(person => !running.some(item => item.employeeId === person.id));
 const soonest = running.filter(item => item.end).sort((a, b) => a.end.localeCompare(b.end))[0];
 const who = soonest && data.personeel.find(person => person.id === soonest.employeeId)?.name;
 const head = free.length
  ? `${free.length} van de ${active.length} actieve medewerkers ${free.length === 1 ? 'staat' : 'staan'} nu nergens op`
  : `Alle ${active.length} actieve medewerkers staan op een project`;
 const tail = soonest && who
  ? `${who} komt als eerste vrij op ${formatDate(soonest.end)}.`
  : 'geen enkele lopende inzet heeft een einddatum.';
 return `${head}; ${tail}`;
}
