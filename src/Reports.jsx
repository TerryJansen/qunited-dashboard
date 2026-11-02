import React, { useState } from 'react';
import { modules, reference } from './modules';
import { runsOn, isoToday } from './alerts';
import { number, money, formatDate, formatDateLong } from './format';

const hours = rows => rows.reduce((sum, r) => sum + Math.round(Number(r.hours) * 100), 0) / 100;

// Quote every cell and neutralize spreadsheet formulas, including leading whitespace.
const csvCell = value => { let text = String(value ?? ''); if (/^[\s]*[=+@-]|^[\t\r\n]/.test(text)) text = `'${text}`; return `"${text.replaceAll('"', '""')}"`; };

function downloadCsv(filename, table) {
 const content = table.map(row => row.map(csvCell).join(';')).join('\r\n');
 const url = URL.createObjectURL(new Blob(['﻿', content], { type: 'text/csv;charset=utf-8' }));
 const link = document.createElement('a');
 link.href = url; link.download = filename; link.click();
 setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function Summary({ title, columns, rows }) {
 return <section className="record">
  <h2>{title}</h2>
  <table aria-label={title}>
   <thead><tr><th>{columns[0]}</th><th>{columns[1]}</th></tr></thead>
   <tbody>{rows.map(([key, value]) => <tr key={key}><td>{key}</td><td>{number(value)}</td></tr>)}</tbody>
  </table>
  {!rows.length && <p className="muted">Geen gegevens.</p>}
 </section>;
}

export default function Reports({ data }) {
 const [from, setFrom] = useState(''), [to, setTo] = useState('');
 const [project, setProject] = useState(''), [employee, setEmployee] = useState('');

 const invalid = from && to && from > to;
 const rows = invalid ? [] : data.urenstaten.filter(r =>
  (!from || r.date >= from) && (!to || r.date <= to) && (!project || r.projectId === project) && (!employee || r.employeeId === employee));

 const grouped = (key, records) => [...new Set(rows.map(r => r[key]))]
  .map(id => [reference(records, id), hours(rows.filter(r => r[key] === id))]);

 const iso = isoToday();
 const running = data.inzet.filter(record => runsOn(record, iso));
 const occupancy = data.personeel.filter(person => person.status === 'Actief').map(person => {
  const assignments = running.filter(record => record.employeeId === person.id);
  return {
   id: person.id,
   name: person.name,
   projects: assignments.map(record => reference(data.projecten, record.projectId)),
   until: assignments.map(record => record.end).filter(Boolean).sort()[0] || '',
  };
 });
 const available = occupancy.filter(row => !row.projects.length);

 function downloadHours() {
  downloadCsv('qunited-uren.csv', [
   ['Werkdatum', 'Project', 'Medewerker', 'Omschrijving', 'Uren', 'Status'],
   ...rows.map(r => [r.date, reference(data.projecten, r.projectId), reference(data.personeel, r.employeeId), r.name, String(r.hours).replace('.', ','), r.status]),
  ]);
 }

 function downloadAssignments() {
  downloadCsv('qunited-inzet.csv', [
   ['Medewerker', 'Project', 'Rol', 'Van', 'Tot en met', 'Uren per week', 'Status'],
   ...data.inzet.map(r => [reference(data.personeel, r.employeeId), reference(data.projecten, r.projectId), r.role || '', r.start || '', r.end || '', r.hoursPerWeek || '', r.status]),
  ]);
 }

 return <>
  <div className="heading">
   <div>
    <h1>Rapportages</h1>
    <p>Overzichten op basis van je eigen lokale registraties.</p>
   </div>
   <button className="primary" disabled={!rows.length || invalid} onClick={downloadHours}>Download uren CSV</button>
  </div>

  <h2>Urenoverzicht</h2>
  <p className="muted">Filters gelden alleen voor uren en de uren-CSV. Alle interne statussen tellen mee. Datums zijn inclusief.</p>
  <div className="filters report-filters">
   <label>Vanaf<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
   <label>Tot en met<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
   <label>Projectfilter
    <select value={project} onChange={e => setProject(e.target.value)}>
     <option value="">Alle projecten</option>
     {data.projecten.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
    </select>
   </label>
   <label>Medewerkerfilter
    <select value={employee} onChange={e => setEmployee(e.target.value)}>
     <option value="">Alle medewerkers</option>
     {data.personeel.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
    </select>
   </label>
   <button onClick={() => { setFrom(''); setTo(''); setProject(''); setEmployee(''); }}>Filters wissen</button>
  </div>
  {invalid && <p role="alert" className="error">Einddatum mag niet vóór de begindatum liggen.</p>}
  <section className="metric-grid">
   <div className="metric"><span>Totaal uren in selectie</span><strong data-testid="hours-total">{number(hours(rows))}</strong></div>
   <div className="metric"><span>Urenregistraties in selectie</span><strong>{rows.length}</strong></div>
  </section>
  {!rows.length && <p className="empty">Geen uren voor deze selectie.</p>}
  <div className="report-grid">
   <Summary title="Uren per project" columns={['Project', 'Uren']} rows={grouped('projectId', data.projecten)} />
   <Summary title="Uren per medewerker" columns={['Medewerker', 'Uren']} rows={grouped('employeeId', data.personeel)} />
  </div>

  <div className="heading">
   <div>
    <h2>Bezetting vandaag ({formatDateLong(iso)})</h2>
    <p className="muted">Actieve medewerkers met een inzet waarvan de periode vandaag omvat. De urenfilters hierboven gelden hier niet.</p>
   </div>
   <button disabled={!data.inzet.length} onClick={downloadAssignments}>Download inzet CSV</button>
  </div>
  <section className="metric-grid">
   <div className="metric"><span>Bezet vandaag</span><strong data-testid="occupied-count">{occupancy.length - available.length}</strong></div>
   <div className="metric"><span>Beschikbaar vandaag</span><strong data-testid="available-today">{available.length}</strong></div>
  </section>
  <section className="record">
   <table aria-label="Bezetting vandaag">
    <thead><tr><th>Medewerker</th><th>Project</th><th>Tot en met</th></tr></thead>
    <tbody>{occupancy.map(row => <tr key={row.id}>
     <td>{row.name}</td>
     <td>{row.projects.length ? row.projects.join(', ') : 'Beschikbaar'}</td>
     <td>{row.until ? formatDate(row.until) : '—'}</td>
    </tr>)}</tbody>
   </table>
   {!occupancy.length && <p className="muted">Nog geen actieve medewerkers.</p>}
  </section>

  <h2>Volledig werkruimteoverzicht</h2>
  <p className="muted">Projectstatussen en openstaande facturen: alle registraties, onafhankelijk van de urenfilters. Facturen hebben geen project- of medewerkerkoppeling.</p>
  <div className="report-grid">
   <Summary title="Projectstatussen" columns={['Status', 'Projecten']} rows={modules.projecten.states.map(status => [status, data.projecten.filter(r => r.status === status).length])} />
   <Summary title="Inzetstatussen" columns={['Status', 'Inzet']} rows={modules.inzet.states.map(status => [status, data.inzet.filter(r => r.status === status).length])} />
   <section className="metric">
    <span>Openstaande facturen — alle registraties</span>
    <strong data-testid="report-invoices">{money(data.facturatie.filter(r => r.status === 'Open').reduce((sum, r) => sum + Math.round(Number(r.amount) * 100), 0) / 100)}</strong>
   </section>
  </div>
 </>;
}
