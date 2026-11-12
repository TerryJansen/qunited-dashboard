import React, { useEffect, useRef, useState } from 'react';
import { DurationWheel, PauseChoice } from './TimeWheel';
import { formatMinutes } from './format';
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
    <tbody>{rows.map(row => <tr key={row.id} className={selected === row.id ? 'is-picked' : undefined} onClick={() => onSelect(row.id)}>
     <td className="num">{row.number || '—'}</td>
     <td><button type="button" className="text-action week-name" aria-haspopup="dialog" aria-label={`${row.name}, week openen`} onClick={event => { event.stopPropagation(); onSelect(row.id); }}>{row.name}</button></td>
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

const DAY = { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'UTC' };
const dayName = iso => new Date(`${iso}T00:00:00Z`).toLocaleDateString('nl-NL', DAY);
/** Eindtijd: begintijd plus gewerkte tijd plus pauze. */
function endTime(line) {
 if (!/^\d{2}:\d{2}$/.test(line.from || '')) return '';
 const start = Number(line.from.slice(0, 2)) * 60 + Number(line.from.slice(3));
 const end = start + minutesOf(line) + (Number(line.pause) || 0);
 return `${pad(Math.floor(end / 60) % 24)}:${pad(end % 60)}`;
}

/** Het invulformulier voor één urenregel: project, kopje, tijden en omschrijving. */
function LineForm({ data, draft, setDraft, kopjes, onSave, onCancel }) {
 const ref = useRef(null);
 const [message, setMessage] = useState('');
 const set = (key, value) => { setMessage(''); setDraft(current => ({ ...current, [key]: value })); };
 useEffect(() => { ref.current?.querySelector('select[name="project"]')?.focus(); ref.current?.scrollIntoView?.({ block: 'nearest' }); }, []);
 function submit(event) {
  event.preventDefault();
  if (!draft.projectId) { setMessage('Kies een project.'); ref.current?.querySelector('select[name="project"]')?.focus(); return; }
  if (!(Number(draft.hours) > 0)) { setMessage('Kies hoeveel uur je hebt gewerkt, meer dan 0:00.'); return; }
  onSave(draft);
 }
 const projects = data.projecten.filter(project => !['Afgerond', 'Geannuleerd'].includes(project.status) || project.id === draft.projectId);
 return <form ref={ref} className="week-form" onSubmit={submit} noValidate aria-label={draft.id ? 'Uren wijzigen' : 'Uren invullen'}>
  <p className="week-form-title">{draft.id ? 'Uren wijzigen' : 'Uren invullen'} · {dayName(draft.date)}</p>
  <div className="week-form-grid">
   <label>Project
    <select name="project" aria-label="Project" value={draft.projectId || ''} onChange={event => set('projectId', event.target.value)}>
     <option value="" disabled hidden>Kies project</option>
     {projects.map(project => <option key={project.id} value={project.id}>{project.name}{project.client ? ` · ${project.client}` : ''}</option>)}
    </select>
   </label>
   <label><span>Kopje <span className="plan-optional">(soort werk)</span></span>
    <input type="text" aria-label="Kopje" list="kopjes" maxLength={120} placeholder="Bijvoorbeeld: Inspectie" value={draft.activity || ''} onChange={event => set('activity', event.target.value)} />
    <datalist id="kopjes">{kopjes.map(kopje => <option key={kopje} value={kopje} />)}</datalist>
   </label>
   <label><span>Begintijd <span className="plan-optional">(mag leeg)</span></span>
    <input type="time" aria-label="Begintijd" value={draft.from || ''} onChange={event => set('from', event.target.value)} />
   </label>
   <label>Soort uren
    <select aria-label="Soort uren" value={draft.kind || 'Facturabel'} onChange={event => set('kind', event.target.value)}>
     <option>Facturabel</option><option>Indirect</option>
    </select>
   </label>
   <label className="wide"><span>Omschrijving <span className="plan-optional">(mag leeg)</span></span>
    <input type="text" aria-label="Omschrijving" maxLength={300} value={draft.name || ''} onChange={event => set('name', event.target.value)} />
   </label>
  </div>
  <div className="plan-day">
   <DurationWheel label="Uren" rows={3} value={draft.hours ?? ''} onChange={value => set('hours', value)} />
   <PauseChoice label="Pauze" name="weekpauze" value={draft.pause ?? ''} onChange={value => set('pause', value)} />
  </div>
  {message && <p role="alert" className="error">{message}</p>}
  <div className="actions">
   <button className="primary" type="submit">Opslaan</button>
   <button type="button" onClick={onCancel}>Annuleren</button>
  </div>
 </form>;
}

/** Het weekvenster van één medewerker: per dag de regels, en per dag uren invullen. */
export function WeekDialog({ data, personId, monday, today, onWeek, onClose, onSave, onRemove }) {
 const ref = useRef(null);
 const [draft, setDraft] = useState(null);
 const person = data.personeel.find(p => p.id === personId);
 const lines = data.urenstaten.filter(line => inWeek(line, monday) && (line.employeeId || '') === personId);
 const kopjes = [...new Set(data.urenstaten.map(line => (line.activity || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'nl'));
 const total = lines.reduce((sum, line) => sum + minutesOf(line), 0);
 useEffect(() => { const dialog = ref.current; if (dialog && !dialog.open) dialog.showModal?.(); }, []);
 useEffect(() => { setDraft(null); }, [monday]);

 const start = date => setDraft({ employeeId: personId, date, status: 'Concept', hours: '8', pause: '30', kind: 'Facturabel' });
 function store(clean) {
  const project = data.projecten.find(p => p.id === clean.projectId);
  const record = { ...clean, activity: (clean.activity || '').trim(), name: (clean.name || '').trim() || (clean.activity || '').trim() || project?.name || 'Uren' };
  if (onSave(record)) setDraft(null);
 }

 return <dialog ref={ref} className="plan-dialog week-dialog" aria-labelledby="week-title" onCancel={event => { event.preventDefault(); onClose(); }}>
  <div className="week-dialog-inner">
   <header className="week-dialog-head">
    <div>
     <h2 id="week-title">{person?.name || 'Onbekende medewerker'}</h2>
     <p>{person?.number ? `${person.number} · ` : ''}Uren week {weekNumber(monday)}</p>
    </div>
    <WeekPicker monday={monday} today={today} onChange={onWeek} />
    <div className="week-dialog-actions">
     <button type="button" className="primary" onClick={() => start(inWeek({ date: today }, monday) ? today : monday)}>Uren toevoegen</button>
     <button type="button" className="plan-close" onClick={onClose} aria-label="Sluiten">×</button>
    </div>
   </header>

   <div className="week-dialog-body">
    {!data.projecten.length && <p className="empty-line">Er is nog geen project om uren op te schrijven. <a href="#/projecten/nieuw">Maak eerst een project aan</a>.</p>}
    {Array.from({ length: 7 }, (_, index) => shiftDays(monday, index)).map(date => {
     const own = lines.filter(line => line.date === date).sort((a, b) => (a.from || '99').localeCompare(b.from || '99'));
     const sum = own.reduce((minutes, line) => minutes + minutesOf(line), 0);
     const adding = draft && !draft.id && draft.date === date;
     return <section key={date} className={`week-day${date === today ? ' is-today' : ''}`} aria-label={dayName(date)}>
      <header>
       <h3>{dayName(date)}</h3>
       <span className="week-day-total">Totaal: <b>{clock(sum)}</b></span>
       <button type="button" aria-label={`Uren toevoegen op ${dayName(date)}`} onClick={() => start(date)} disabled={!data.projecten.length}>Toevoegen</button>
      </header>
      {own.length > 0 && <ul>{own.map(line => {
       const project = data.projecten.find(p => p.id === line.projectId);
       if (draft?.id === line.id) return <li key={line.id} className="is-editing"><LineForm data={data} draft={draft} setDraft={setDraft} kopjes={kopjes} onSave={store} onCancel={() => setDraft(null)} /></li>;
       return <li key={line.id}>
        <div className="week-line-time">
         {line.from && <><span>{line.from}</span><span>{endTime(line)}</span></>}
         {Number(line.pause) > 0 && <small>{formatMinutes(line.pause)} pauze</small>}
        </div>
        <div className="week-line-what">
         <b>{project?.name || 'Zonder project'}{project?.client ? <span> · {project.client}</span> : ''}</b>
         {line.activity && <span>{line.activity}</span>}
         {line.name && line.name !== line.activity && line.name !== project?.name && <span>{line.name}</span>}
        </div>
        <div className="week-line-hours"><b>{clock(minutesOf(line))}</b><span>{line.status}{line.kind === 'Indirect' ? ' · indirect' : ''}</span></div>
        <div className="week-line-actions">
         <button type="button" className="text-action" onClick={() => setDraft({ ...line })}>Bewerken</button>
         <button type="button" className="text-action danger" onClick={() => onRemove(line)}>Verwijderen</button>
        </div>
       </li>;
      })}</ul>}
      {adding && <LineForm data={data} draft={draft} setDraft={setDraft} kopjes={kopjes} onSave={store} onCancel={() => setDraft(null)} />}
     </section>;
    })}
   </div>

   <footer className="week-dialog-foot"><span>Totaal: <b data-testid="dialog-total">{clock(total)}</b></span><button type="button" onClick={onClose}>Sluiten</button></footer>
  </div>
 </dialog>;
}
