import React, { useState } from 'react';
import { shiftDays } from './alerts';
import { mondayOf } from './hours';
import { weekNumber } from './agenda';
import Icon from './Icon';

// Het weekoverzicht van de urenstaten: per medewerker de uren per status, opgeteld uit de losse regels.

const pad = n => String(n).padStart(2, '0');
/** Minuten als "40:00". */
export const clock = minutes => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
const dmy = iso => `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}`;
export const inWeek = (record, monday) => !!record.date && record.date >= monday && record.date <= shiftDays(monday, 6);
const minutesOf = record => Math.max(0, Math.round(Number(record.hours) * 60) || 0);

/** Eén regel per medewerker: iedereen die actief is, plus wie in deze week uren heeft. */
export function weekRows(data, monday) {
 const lines = data.urenstaten.filter(record => inWeek(record, monday));
 const ids = [...new Set([...data.personeel.filter(person => person.status === 'Actief').map(person => person.id), ...lines.map(line => line.employeeId || '')])];
 return ids.map(id => {
  const person = data.personeel.find(p => p.id === id);
  const own = lines.filter(line => (line.employeeId || '') === id);
  const sum = test => own.filter(test).reduce((total, line) => total + minutesOf(line), 0);
  const total = sum(() => true);
  // Een regel zonder soort telt als facturabel: dat is ook wat het formulier vooraf invult.
  const billable = sum(line => line.kind !== 'Indirect');
  const contract = Math.round(Number(person?.contractHours) * 60) || 0;
  return {
   id, number: person?.number || '', name: person?.name || 'Onbekende medewerker',
   concept: sum(line => line.status === 'Concept'), ingediend: sum(line => line.status === 'Ingediend'),
   goedgekeurd: sum(line => line.status === 'Goedgekeurd'), afgekeurd: sum(line => line.status === 'Afgekeurd'),
   facturabel: billable, indirect: total - billable, share: total ? Math.round(billable / total * 100) : null, total, contract,
  };
 });
}

const COLUMNS = [
 ['number', 'Nummer'], ['name', 'Naam'], ['concept', 'Concept'], ['ingediend', 'Ingediend'], ['goedgekeurd', 'Goedgekeurd'],
 ['afgekeurd', 'Afgekeurd'], ['facturabel', 'Facturabel'], ['indirect', 'Indirect'], ['share', '% Facturabel'], ['total', 'Aantal uur'],
];
const TEXT = new Set(['number', 'name']);

function download(rows, monday) {
 const cell = value => `"${String(value).replace(/"/g, '""')}"`;
 const lines = [COLUMNS.map(([, label]) => cell(label)).join(';'), ...rows.map(row => [
  row.number, row.name, clock(row.concept), clock(row.ingediend), clock(row.goedgekeurd), clock(row.afgekeurd),
  clock(row.facturabel), clock(row.indirect), row.share === null ? '' : `${row.share}%`,
  row.contract ? `${clock(row.total)} / ${clock(row.contract)}` : clock(row.total),
 ].map(cell).join(';'))];
 // Met BOM en puntkomma's opent Excel het bestand in Nederland meteen goed.
 const url = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
 const link = document.createElement('a');
 link.href = url; link.download = `urenstaten-week-${weekNumber(monday)}-${monday.slice(0, 4)}.csv`; link.click();
 setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** Vorige week, vandaag, de gekozen week, volgende week. */
export function WeekPicker({ monday, today, onChange }) {
 const current = mondayOf(today);
 return <div className="week-picker" role="group" aria-label="Kies een week">
  <button type="button" aria-label="Vorige week" onClick={() => onChange(shiftDays(monday, -7))}><Icon name="terug" /></button>
  <button type="button" onClick={() => onChange(current)} aria-pressed={monday === current}>Vandaag</button>
  <span className="week-range" aria-live="polite">{dmy(monday)} - {dmy(shiftDays(monday, 6))} <span>({weekNumber(monday)})</span></span>
  <button type="button" aria-label="Volgende week" onClick={() => onChange(shiftDays(monday, 7))}><Icon name="verder" /></button>
 </div>;
}

export function WeekOverview({ data, monday, selected, onSelect }) {
 const [size, setSize] = useState(10);
 const [page, setPage] = useState(0);
 const [query, setQuery] = useState('');
 const [sort, setSort] = useState({ key: 'name', up: true });

 const all = weekRows(data, monday);
 const needle = query.trim().toLocaleLowerCase('nl');
 const found = all.filter(row => `${row.number} ${row.name}`.toLocaleLowerCase('nl').includes(needle));
 const sorted = [...found].sort((a, b) => {
  const order = TEXT.has(sort.key) ? String(a[sort.key]).localeCompare(String(b[sort.key]), 'nl', { numeric: true }) : (a[sort.key] ?? -1) - (b[sort.key] ?? -1);
  return (sort.up ? order : -order) || a.name.localeCompare(b.name, 'nl');
 });
 const pages = Math.max(1, Math.ceil(sorted.length / size));
 const at = Math.min(page, pages - 1);
 const rows = sorted.slice(at * size, at * size + size);

 return <section className="card week-card" aria-label="Weekoverzicht">
  <div className="week-tools">
   <label>Toon <select aria-label="Aantal rijen" value={size} onChange={event => { setSize(Number(event.target.value)); setPage(0); }}>
    {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
   </select> rijen</label>
   <span className="week-tools-right">
    <label><span aria-hidden="true">Zoeken:</span> <input type="search" aria-label="Zoek medewerker" value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} /></label>
    <button type="button" onClick={() => download(sorted, monday)} disabled={!sorted.length}>Exporteren</button>
   </span>
  </div>

  {rows.length
   ? <div className="table-wrap" tabIndex={0}><table className="week-table" aria-label="Uren per medewerker">
    <thead><tr>{COLUMNS.map(([key, label]) => <th key={key} className={TEXT.has(key) ? undefined : 'n'}
     aria-sort={sort.key === key ? (sort.up ? 'ascending' : 'descending') : 'none'}>
     <button type="button" className="sort" onClick={() => setSort(old => ({ key, up: old.key === key ? !old.up : true }))}>{label}<i aria-hidden="true" /></button>
    </th>)}</tr></thead>
    <tbody>{rows.map(row => <tr key={row.id} className={selected === row.id ? 'is-picked' : undefined}>
     <td className="num">{row.number || '—'}</td>
     <td><button type="button" className="text-action week-name" aria-pressed={selected === row.id} onClick={() => onSelect(selected === row.id ? '' : row.id)}>{row.name}</button></td>
     {['concept', 'ingediend', 'goedgekeurd', 'afgekeurd', 'facturabel', 'indirect'].map(key => <td key={key} className={`n num${row[key] ? '' : ' zero'}`}>{clock(row[key])}</td>)}
     <td className="n">{row.share === null ? <span className="zero">—</span> : <span className={`pill solid ${row.share === 0 ? 'neg' : 'pos'}`}>{row.share}%</span>}</td>
     <td className="n"><span className={`pill solid num ${row.contract ? (row.total >= row.contract ? 'pos' : 'warn') : ''}`} data-testid="week-total">
      {row.contract ? `${clock(row.total)} / ${clock(row.contract)}` : clock(row.total)}
     </span></td>
    </tr>)}</tbody>
    <tfoot><tr>{COLUMNS.map(([key, label]) => <td key={key} className={TEXT.has(key) ? undefined : 'n'}>{label}</td>)}</tr></tfoot>
   </table></div>
   : <p className="empty-line">{all.length ? 'Geen medewerker gevonden met deze zoekterm.' : 'Nog geen actieve medewerkers en geen uren in deze week.'}</p>}

  <div className="week-foot">
   <span>Toont {sorted.length ? at * size + 1 : 0} tot {Math.min(sorted.length, at * size + size)} van {sorted.length} rijen</span>
   <span className="pager" role="group" aria-label="Pagina's">
    <button type="button" disabled={at === 0} onClick={() => setPage(at - 1)}>Vorige</button>
    {Array.from({ length: pages }, (_, i) => <button key={i} type="button" aria-current={i === at ? 'page' : undefined} onClick={() => setPage(i)}>{i + 1}</button>)}
    <button type="button" disabled={at >= pages - 1} onClick={() => setPage(at + 1)}>Volgende</button>
   </span>
  </div>
 </section>;
}
