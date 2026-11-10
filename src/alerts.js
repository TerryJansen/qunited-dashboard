import { modules, reference } from './modules';
import { formatDate } from './format';

export const isoToday = () => new Date().toLocaleDateString('sv-SE');

export function shiftDays(iso, days) {
 const date = new Date(`${iso}T00:00:00Z`);
 date.setUTCDate(date.getUTCDate() + days);
 return date.toISOString().slice(0, 10);
}

export const titleOf = (key, record, data) => modules[key].derivedName ? modules[key].derivedName(record, data) : record.name;

// Een inzet loopt vandaag als de periode vandaag omvat en de registratie niet is afgesloten.
export const runsOn = (record, iso) => ['Gepland', 'Actief'].includes(record.status)
 && (!record.start || record.start <= iso) && (!record.end || record.end >= iso);

export const availableStaff = (data, iso = isoToday()) => data.personeel
 .filter(person => person.status === 'Actief' && !data.inzet.some(item => item.employeeId === person.id && runsOn(item, iso)));

// Datumvelden die aandacht vragen: verstreken, of binnen de horizon van die module.
const DATE_RULES = [
 { module: 'projecten', field: 'due', horizon: 14, states: ['Planning', 'In uitvoering'], label: 'einddatum' },
 { module: 'inzet', field: 'end', horizon: 30, states: ['Gepland', 'Actief'], label: 'einde inzet' },
 { module: 'inventaris', field: 'due', horizon: 30, states: ['Beschikbaar', 'In gebruik', 'Onderhoud'], label: 'volgende inspectie' },
 { module: 'materiaal', field: 'due', horizon: 14, states: ['Nodig'], label: 'benodigd op' },
 { module: 'procedures', field: 'due', horizon: 30, states: ['Actueel'], label: 'herzien op' },
];

const CERTIFICATE_HORIZON = 60;

/**
 * Bouwt de attentiepunten uit de eigen registraties. Geen externe bronnen, geen voorspellingen:
 * elk punt verwijst naar een datum die de gebruiker zelf heeft ingevuld.
 */
export function collectAlerts(data, certificates = [], iso = isoToday()) {
 const alerts = [];

 for (const rule of DATE_RULES) {
  for (const record of data[rule.module]) {
   const date = record[rule.field];
   if (!date || !rule.states.includes(record.status)) continue;
   const overdue = date < iso;
   if (!overdue && date > shiftDays(iso, rule.horizon)) continue;
   alerts.push({
    id: `${rule.module}-${rule.field}-${record.id}`,
    level: overdue ? 'verlopen' : 'binnenkort',
    module: modules[rule.module].title,
    route: rule.module,
    text: `${titleOf(rule.module, record, data)} — ${rule.label} ${overdue ? 'was' : 'is'} ${formatDate(date)}`,
    date,
   });
  }
 }

 for (const record of data.inzet) {
  if (record.status !== 'Gepland' || !record.start || record.start > iso) continue;
  alerts.push({
   id: `inzet-start-${record.id}`,
   level: 'binnenkort',
   module: modules.inzet.title,
   route: 'inzet',
   text: `${titleOf('inzet', record, data)} — startdatum ${formatDate(record.start)} is geweest, status staat nog op Gepland`,
   date: record.start,
  });
 }

 for (const certificate of certificates) {
  if (certificate.kind !== 'Certificaat' || !certificate.expiry) continue;
  const overdue = certificate.expiry < iso;
  if (!overdue && certificate.expiry > shiftDays(iso, CERTIFICATE_HORIZON)) continue;
  alerts.push({
   id: `certificaat-${certificate.id}`,
   level: overdue ? 'verlopen' : 'binnenkort',
   module: 'Certificaten',
   route: 'personeel',
   text: `${certificate.title || certificate.name} van ${reference(data.personeel, certificate.personId)} — geldig tot ${formatDate(certificate.expiry)}`,
   date: certificate.expiry,
  });
 }

 const order = { verlopen: 0, binnenkort: 1 };
 return alerts.sort((a, b) => order[a.level] - order[b.level] || a.date.localeCompare(b.date) || a.text.localeCompare(b.text));
}
