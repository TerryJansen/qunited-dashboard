import { modules, reference, resolveReference } from './modules';
import { isoToday, shiftDays } from './alerts';
import { assignmentRuns, isWeekend, staffing } from './cover';
import { formatDate, money } from './format';

const CERTIFICATE_HORIZON = 60;
const TIMESHEET_LOOKBACK = 7;
export const URGENCY = { hoog: 0, middel: 1, laag: 2 };

// Een verantwoordelijke is een verwijzing naar een medewerker: toon de naam, nooit het interne id.
function ownerName(data, value) {
 if (!value) return '';
 const link = resolveReference(data, 'personeel', value);
 return link.kind === 'record' ? link.record.name : link.kind === 'tekst' ? link.text : '';
}

const daysBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);

/** "3 dagen te laat" of "over 5 dagen", altijd met de maatstaf erbij. */
export function dueText(date, iso) {
 if (!date) return '';
 const days = daysBetween(iso, date);
 if (days < 0) return `${Math.abs(days)} ${Math.abs(days) === 1 ? 'dag' : 'dagen'} te laat`;
 if (days === 0) return 'vandaag';
 if (days === 1) return 'morgen';
 return `over ${days} dagen`;
}

// Datumvelden die aandacht vragen zodra ze verstrijken of binnen hun horizon vallen.
const DATE_RULES = [
 { module: 'facturatie', field: 'due', horizon: 7, states: ['Open'], what: 'Factuur vervalt', overdueWhat: 'Factuur is vervallen', urgent: true },
 { module: 'projecten', field: 'due', horizon: 14, states: ['Planning', 'In uitvoering'], what: 'Project loopt af', overdueWhat: 'Einddatum project verstreken' },
 { module: 'inventaris', field: 'due', horizon: 30, states: ['Beschikbaar', 'In gebruik', 'Onderhoud'], what: 'Inspectie nodig', overdueWhat: 'Inspectie verlopen' },
 { module: 'materiaal', field: 'due', horizon: 14, states: ['Nodig'], what: 'Materiaal nodig', overdueWhat: 'Materiaal te laat' },
 { module: 'procedures', field: 'due', horizon: 30, states: ['Actueel'], what: 'Procedure herzien', overdueWhat: 'Herziening verstreken' },
];

const titleOf = (key, record, data) => modules[key].derivedName ? modules[key].derivedName(record, data) : record.name;

/**
 * Eén concrete actielijst. Elk punt noemt wat er moet gebeuren, wie of wat het betreft,
 * de deadline, de urgentie en waar je het doet. Niets wordt verzonnen: elk punt komt uit
 * een datum of een status die de gebruiker zelf heeft ingevuld.
 */
export function collectActions(data, certificates = [], iso = isoToday()) {
 const actions = [];
 const push = action => actions.push({ urgency: 'middel', ...action });

 // 1. Urenstaten die beoordeeld moeten worden.
 const submitted = data.urenstaten.filter(sheet => sheet.status === 'Ingediend');
 if (submitted.length) {
  const oldest = submitted.map(sheet => sheet.date).filter(Boolean).sort()[0];
  push({
   id: 'uren-beoordelen',
   urgency: submitted.length > 5 ? 'hoog' : 'middel',
   what: `${submitted.length} ${submitted.length === 1 ? 'urenstaat wacht' : 'urenstaten wachten'} op beoordeling`,
   context: oldest ? `oudste werkdatum ${formatDate(oldest)}` : 'zonder werkdatum',
   date: oldest || '',
   href: '#/urenstaten?status=Ingediend',
   action: 'Beoordelen',
  });
 }

 // 2. Ontbrekende urenstaten: een werkdag met lopende inzet waarop niets is geschreven.
 for (const person of data.personeel.filter(p => p.status === 'Actief')) {
  const missing = [];
  for (let back = 1; back <= TIMESHEET_LOOKBACK; back += 1) {
   const day = shiftDays(iso, -back);
   if (isWeekend(day)) continue;
   const onProject = data.inzet.some(item => item.employeeId === person.id && item.status === 'Actief' && assignmentRuns(item, day));
   if (!onProject) continue;
   const absent = data.afwezigheid.some(item => item.employeeId === person.id && item.status !== 'Vervallen'
    && (!item.start || item.start <= day) && (!item.end || item.end >= day));
   if (absent) continue;
   if (!data.urenstaten.some(sheet => sheet.employeeId === person.id && sheet.date === day)) missing.push(day);
  }
  if (missing.length) {
   push({
    id: `uren-ontbreekt-${person.id}`,
    urgency: missing.length >= 3 ? 'hoog' : 'middel',
    what: `${missing.length} ${missing.length === 1 ? 'werkdag zonder' : 'werkdagen zonder'} urenstaat`,
    context: person.name,
    date: missing.sort()[0],
    href: `#/urenstaten?zoek=${encodeURIComponent(person.name)}`,
    action: 'Aanvullen',
   });
  }
 }

 // 3. Projecten met onvervulde personeelsbehoefte.
 for (const project of data.projecten.filter(p => ['Planning', 'In uitvoering'].includes(p.status))) {
  const { filled, needed, short } = staffing(data, project, iso);
  if (!needed || !short) continue;
  push({
   id: `bezetting-${project.id}`,
   urgency: project.start && project.start <= shiftDays(iso, 14) ? 'hoog' : 'middel',
   what: `${short} van de ${needed} plekken nog niet ingevuld`,
   context: `${project.name}${project.client ? ` · ${project.client}` : ''} · ${filled} ingepland`,
   date: project.start || '',
   href: `#/projecten/${project.id}`,
   action: 'Inzet plannen',
  });
 }

 // 4. Certificaten die verlopen.
 for (const certificate of certificates) {
  if (certificate.kind !== 'Certificaat' || !certificate.expiry) continue;
  const overdue = certificate.expiry < iso;
  if (!overdue && certificate.expiry > shiftDays(iso, CERTIFICATE_HORIZON)) continue;
  const person = reference(data.personeel, certificate.personId);
  push({
   id: `certificaat-${certificate.id}`,
   urgency: overdue ? 'hoog' : 'middel',
   what: `${overdue ? 'Certificaat verlopen' : 'Certificaat verloopt'}: ${certificate.title || certificate.name}`,
   context: person,
   date: certificate.expiry,
   href: certificate.personId ? `#/personeel/${certificate.personId}` : '#/personeel',
   action: 'Bekijken',
  });
 }

 // 5. Datumregels: vervallen facturen, aflopende projecten, inspecties, materiaal, procedures.
 for (const rule of DATE_RULES) {
  for (const record of data[rule.module]) {
   const date = record[rule.field];
   if (!date || !rule.states.includes(record.status)) continue;
   const overdue = date < iso;
   if (!overdue && date > shiftDays(iso, rule.horizon)) continue;
   const extra = rule.module === 'facturatie' ? ` · ${money(Number(record.amount))}` : '';
   push({
    id: `${rule.module}-${record.id}`,
    urgency: overdue ? (rule.urgent ? 'hoog' : 'middel') : 'laag',
    what: `${overdue ? rule.overdueWhat : rule.what}: ${titleOf(rule.module, record, data)}`,
    context: `${record.client || ownerName(data, record.owner) || modules[rule.module].title}${extra}`,
    date,
    href: `#/${rule.module}/${record.id}`,
    action: 'Openen',
   });
  }
 }

 return actions
  .map(action => ({ ...action, due: dueText(action.date, iso), overdue: !!action.date && action.date < iso }))
  .sort((a, b) =>
   URGENCY[a.urgency] - URGENCY[b.urgency]
   || (a.date || '9999').localeCompare(b.date || '9999')
   || a.what.localeCompare(b.what, 'nl'));
}

/** Zijn er genoeg gegevens om iets zinnigs over actiepunten te zeggen? */
export const hasSourceData = data =>
 !!(data.personeel.length || data.projecten.length || data.inzet.length || data.urenstaten.length || data.facturatie.length);
