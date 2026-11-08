import { isoToday, shiftDays } from './alerts';
import { formatDate, formatHours, formatMinutes } from './format';

export const WINDOW_DAYS = 28;

const DAY_NAMES = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
const dayOfWeek = iso => new Date(`${iso}T00:00:00Z`).getUTCDay();
const dayNumber = iso => Number(iso.slice(8, 10));
const between = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
export const isWeekend = iso => [0, 6].includes(dayOfWeek(iso));

/** Een inzet telt mee zolang hij loopt en niet is afgesloten. */
export const assignmentRuns = (record, iso) => ['Gepland', 'Actief'].includes(record.status)
 && (!record.start || record.start <= iso) && (!record.end || record.end >= iso);

/** Een afwezigheid telt mee zolang ze is vastgelegd of aangevraagd; vervallen niet. */
export const absenceRuns = (record, iso) => ['Aangevraagd', 'Vastgelegd'].includes(record.status)
 && (!record.start || record.start <= iso) && (!record.end || record.end >= iso);

/** Het venster begint op de maandag van de week waarin `from` valt. */
export function coverWindow(from = isoToday(), length = WINDOW_DAYS, today = isoToday()) {
 const start = shiftDays(from, -((dayOfWeek(from) + 6) % 7));
 const days = [], weekends = [];
 for (let index = 0; index < length; index += 1) {
  const day = shiftDays(start, index);
  if (isWeekend(day)) weekends.push(index);
  days.push({ label: `${DAY_NAMES[dayOfWeek(day)]} ${dayNumber(day)}`, short: String(dayNumber(day)), iso: day });
 }
 const todayIndex = between(start, today);
 return { start, end: days.at(-1).iso, days, weekends, today: todayIndex >= 0 && todayIndex < length ? todayIndex : null };
}

// Elke soort registratie zijn eigen mark, zodat ziek en gepland op één blik verschillen.
export const COVER_KINDS = {
 actief: { label: 'Ingezet', mark: 'hue', code: 'I' },
 gepland: { label: 'Gepland', mark: 'outline', code: 'G', dash: true },
 afgerond: { label: 'Afgerond', mark: 'step', code: 'A' },
 afwezig: { label: 'Afwezig', mark: 'hatch', code: 'X' },
};
const KIND_OF = { Actief: 'actief', Gepland: 'gepland', Afgerond: 'afgerond' };

/** Loopt deze medewerker vandaag op een project? Meerdere inzetten tellen als één. */
export const isDeployed = (data, personId, iso) =>
 data.inzet.some(item => item.employeeId === personId && assignmentRuns(item, iso));

export const isAbsent = (data, personId, iso) =>
 data.afwezigheid.some(item => item.employeeId === personId && absenceRuns(item, iso));

/**
 * Bezetting van vandaag. Iemand telt één keer, ook met twee inzetten op dezelfde dag.
 * Afwezig is een eigen categorie: niet ingezet, maar ook niet inzetbaar.
 */
export function occupancy(data, iso = isoToday()) {
 const active = data.personeel.filter(person => person.status === 'Actief');
 const deployed = active.filter(person => isDeployed(data, person.id, iso));
 const absent = active.filter(person => !isDeployed(data, person.id, iso) && isAbsent(data, person.id, iso));
 const available = active.filter(person => !isDeployed(data, person.id, iso) && !isAbsent(data, person.id, iso));
 return {
  active, deployed, absent, available,
  rate: active.length ? Math.round((deployed.length / active.length) * 100) : null,
 };
}

/**
 * De eerste dag waarop iemand werkelijk vrij is: na het einde van de lopende inzet,
 * en dan doorschuiven over aansluitende inzet en bekende afwezigheid. Een aflopende
 * opdracht betekent niet dat iemand daarna beschikbaar is.
 */
export function freeFrom(data, personId, iso = isoToday(), horizon = 180) {
 for (let step = 0; step <= horizon; step += 1) {
  const day = shiftDays(iso, step);
  if (!isDeployed(data, personId, day) && !isAbsent(data, personId, day)) return day;
 }
 return '';
}

/** Rijen voor de bezettingsbalk: vrije medewerkers bovenaan, daarna wie het eerst vrijkomt. */
export function coverRows(data, window, iso = isoToday(), { onlyAvailable = false } = {}) {
 const rows = data.personeel.filter(person => person.status === 'Actief').map(person => {
  const bars = [
   ...data.inzet.filter(item => item.employeeId === person.id && KIND_OF[item.status]).map(item => {
    const project = data.projecten.find(p => p.id === item.projectId);
    return {
     from: item.start ? between(window.start, item.start) : 0,
     to: item.end ? between(window.start, item.end) : window.days.length - 1,
     kind: KIND_OF[item.status],
     label: project?.name || 'Verwijderd project',
     note: [
      item.role,
      item.hoursPerDay ? `${formatHours(item.hoursPerDay)} uur per dag` : '',
      item.pause && Number(item.pause) > 0 ? `${formatMinutes(item.pause)} pauze` : '',
      item.travel && Number(item.travel) > 0 ? `${formatMinutes(item.travel)} reistijd` : '',
     ].filter(Boolean).join(' · '),
     href: project ? `#/projecten/${project.id}` : `#/inzet/${item.id}`,
     inzetId: item.id,
    };
   }),
   ...data.afwezigheid.filter(item => item.employeeId === person.id && item.status !== 'Vervallen').map(item => ({
    from: item.start ? between(window.start, item.start) : 0,
    to: item.end ? between(window.start, item.end) : window.days.length - 1,
    kind: 'afwezig',
    label: item.kind || 'Afwezig',
    note: item.status,
    href: `#/afwezigheid/${item.id}`,
   })),
  ].filter(bar => bar.to >= 0 && bar.from < window.days.length);

  const deployed = isDeployed(data, person.id, iso);
  const absent = !deployed && isAbsent(data, person.id, iso);
  return {
   id: person.id,
   label: person.name,
   sub: person.role || '',
   bars,
   state: deployed ? 'ingezet' : absent ? 'afwezig' : 'beschikbaar',
   freeOn: deployed ? freeFrom(data, person.id, iso) : iso,
   href: `#/personeel/${person.id}`,
  };
 });
 const order = { beschikbaar: 0, afwezig: 1, ingezet: 2 };
 const sorted = rows.sort((a, b) =>
  order[a.state] - order[b.state]
  || (a.freeOn || '9999').localeCompare(b.freeOn || '9999')
  || a.label.localeCompare(b.label, 'nl'));
 return onlyAvailable ? sorted.filter(row => row.state !== 'ingezet') : sorted;
}

/** Wie komt er binnen het venster vrij, met de eerstvolgende werkelijke beschikbaarheid. */
export function comingFree(data, iso = isoToday(), days = 28) {
 const until = shiftDays(iso, days);
 return data.personeel
  .filter(person => person.status === 'Actief' && isDeployed(data, person.id, iso))
  .map(person => {
   const current = data.inzet
    .filter(item => item.employeeId === person.id && assignmentRuns(item, iso) && item.end)
    .sort((a, b) => a.end.localeCompare(b.end))[0];
   return {
    id: person.id,
    name: person.name,
    role: person.role || '',
    project: current ? (data.projecten.find(p => p.id === current.projectId)?.name || 'Verwijderd project') : '',
    endsOn: current?.end || '',
    freeOn: freeFrom(data, person.id, iso),
   };
  })
  .filter(person => person.endsOn && person.endsOn <= until)
  .sort((a, b) => (a.freeOn || '9999').localeCompare(b.freeOn || '9999') || a.name.localeCompare(b.name, 'nl'));
}

/** Ingevulde tegenover benodigde bezetting; alleen zinvol als de behoefte is ingevuld. */
export function staffing(data, project, iso = isoToday()) {
 const filled = new Set(data.inzet
  .filter(item => item.projectId === project.id && ['Gepland', 'Actief'].includes(item.status))
  .map(item => item.employeeId)).size;
 const needed = Number(project.needed);
 const known = project.needed !== '' && project.needed !== undefined && Number.isFinite(needed) && needed > 0;
 return { filled, needed: known ? needed : null, short: known ? Math.max(0, needed - filled) : null };
}

/** De ene bevinding, berekend uit de data en met de maatstaf in dezelfde zin. */
export function coverFinding(data, iso = isoToday()) {
 const { active, deployed, available, absent, rate } = occupancy(data, iso);
 if (!active.length) return 'Nog geen actieve medewerkers vastgelegd.';
 if (!data.inzet.length) return `Nog geen inzet vastgelegd: alle ${active.length} actieve medewerkers staan nergens op.`;
 const next = comingFree(data, iso)[0];
 const parts = [`${deployed.length} van de ${active.length} actieve medewerkers ${deployed.length === 1 ? 'staat' : 'staan'} vandaag op een project (${rate}%)`];
 if (available.length) parts.push(`${available.length} ${available.length === 1 ? 'is' : 'zijn'} inzetbaar`);
 if (absent.length) parts.push(`${absent.length} ${absent.length === 1 ? 'is' : 'zijn'} afwezig`);
 const tail = next ? ` ${next.name} is weer inzetbaar vanaf ${formatDate(next.freeOn)}.` : '';
 return `${parts.join(', ')}.${tail}`;
}
