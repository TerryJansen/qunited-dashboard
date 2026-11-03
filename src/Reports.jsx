import React, { useState } from 'react';
import { modules, reference } from './modules';
import { runsOn, isoToday, shiftDays } from './alerts';
import { number, money, formatDate, formatDateLong, plural } from './format';
import Chart from './Chart';

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

function Summary({ title, columns, rows, format = number }) {
 return <section className="panel">
  <header><h2>{title}</h2></header>
  {rows.length
   ? <table aria-label={title}>
    <thead><tr><th>{columns[0]}</th><th className="n">{columns[1]}</th></tr></thead>
    <tbody>{rows.map(([key, value]) => <tr key={key}><td>{key}</td><td className="n num">{format(value)}</td></tr>)}</tbody>
   </table>
   : <div className="empty"><p>Geen gegevens in deze selectie.</p></div>}
 </section>;
}

export default function Reports({ data }) {
 const [from, setFrom] = useState(''), [to, setTo] = useState('');
 const [project, setProject] = useState(''), [employee, setEmployee] = useState('');

 const invalid = from && to && from > to;
 const rows = invalid ? [] : data.urenstaten.filter(r =>
  (!from || r.date >= from) && (!to || r.date <= to) && (!project || r.projectId === project) && (!employee || r.employeeId === employee));

 const grouped = (key, records) => [...new Set(rows.map(r => r[key]))]
  .map(id => [reference(records, id), hours(rows.filter(r => r[key] === id))])
  .sort((a, b) => b[1] - a[1]);

 // Per week schrijven tegenover de optelsom: dezelfde x-as, gelijke breedte.
 const weeks = (() => {
  const dates = rows.map(r => r.date).filter(Boolean).sort();
  if (!dates.length) return { labels: [], perWeek: [], running: [] };
  const first = dates[0], start = shiftDays(first, -((new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7));
  const labels = [], perWeek = [], running = [];
  let total = 0;
  for (let week = 0; ; week += 1) {
   const open = shiftDays(start, week * 7), close = shiftDays(start, week * 7 + 6);
   if (open > dates.at(-1)) break;
   const inWeek = hours(rows.filter(r => r.date >= open && r.date <= close));
   total = Math.round((total + inWeek) * 100) / 100;
   labels.push(`${open.slice(8, 10)}-${open.slice(5, 7)}`);
   perWeek.push(inWeek); running.push(total);
   if (week > 103) break;
  }
  return { labels, perWeek, running };
 })();

 const iso = isoToday();
 const running = data.inzet.filter(record => runsOn(record, iso));
 const occupancy = data.personeel.filter(person => person.status === 'Actief').map(person => {
  const assignments = running.filter(record => record.employeeId === person.id);
  return {
   id: person.id,
   name: person.name,
   role: person.role || '',
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
  <div className="title-row">
   <div>
    <h1>Rapportages</h1>
    <p className="sub">De filters hieronder gelden voor de uren en de uren-CSV; bezetting en werkruimteoverzicht tellen alle registraties.</p>
   </div>
   <div className="title-actions">
    <button className="primary" disabled={!rows.length || invalid} onClick={downloadHours}>Download uren CSV</button>
   </div>
  </div>

  <div className="toolbar report-filters">
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

  <section className="kpis" aria-label="Uren in selectie">
   <div className="kpi">
    <span className="kpi-label">Totaal uren in selectie</span>
    <strong className="kpi-value" data-testid="hours-total">{number(hours(rows))}</strong>
    <p className="kpi-note">{from || to ? `${from ? formatDate(from) : 'begin'} tot en met ${to ? formatDate(to) : 'nu'}` : 'alle datums'}</p>
   </div>
   <div className="kpi">
    <span className="kpi-label">Urenregistraties in selectie</span>
    <strong className="kpi-value">{number(rows.length)}</strong>
    <p className="kpi-note">van {plural(data.urenstaten.length, 'registratie', 'registraties')} in totaal</p>
   </div>
   <div className="kpi">
    <span className="kpi-label">Openstaande facturen</span>
    <strong className="kpi-value" data-testid="report-invoices">{money(data.facturatie.filter(r => r.status === 'Open').reduce((sum, r) => sum + Math.round(Number(r.amount) * 100), 0) / 100)}</strong>
    <p className="kpi-note">alle registraties, los van de filters</p>
   </div>
  </section>

  <div className="report-pair">
   <section className="panel">
    <div className="chart-head"><h3>Uren per week</h3><span className="meta">in de selectie</span></div>
    {weeks.labels.length
     ? <Chart label="Uren per week" deps={[JSON.stringify(weeks)]}
      draw={(Charts, host) => Charts.bars(host, { labels: weeks.labels, values: weeks.perWeek, format: Charts.fmt.dec(1), height: 190 })} />
     : <div className="empty"><p>Geen uren voor deze selectie.</p></div>}
   </section>
   <section className="panel">
    <div className="chart-head"><h3>Uren opgeteld</h3><span className="meta">zelfde weken</span></div>
    {weeks.labels.length
     ? <Chart label="Uren opgeteld" deps={[JSON.stringify(weeks)]}
      draw={(Charts, host) => Charts.line(host, { labels: weeks.labels, series: [{ name: 'Uren opgeteld', values: weeks.running }], format: Charts.fmt.dec(1), height: 190, endLabel: true })} />
     : <div className="empty"><p>Geen uren om op te tellen.</p></div>}
   </section>
  </div>

  <div className="report-pair">
   <Summary title="Uren per project" columns={['Project', 'Uren']} rows={grouped('projectId', data.projecten)} />
   <Summary title="Uren per medewerker" columns={['Medewerker', 'Uren']} rows={grouped('employeeId', data.personeel)} />
  </div>

  <div className="title-row">
   <div>
    <h2>Bezetting vandaag ({formatDateLong(iso)})</h2>
    <p className="sub">Actieve medewerkers met een inzet waarvan de periode vandaag omvat. {available.length ? `${plural(available.length, 'medewerker is', 'medewerkers zijn')} vandaag beschikbaar.` : 'Iedereen staat vandaag op een project.'}</p>
   </div>
   <div className="title-actions">
    <button disabled={!data.inzet.length} onClick={downloadAssignments}>Download inzet CSV</button>
   </div>
  </div>
  <section className="panel">
   {occupancy.length
    ? <table aria-label="Bezetting vandaag">
     <thead><tr><th>Medewerker</th><th>Project</th><th className="n">Tot en met</th></tr></thead>
     <tbody>{occupancy.map(row => <tr key={row.id}>
      <td className="identity">{row.name}{row.role && <span className="sub">{row.role}</span>}</td>
      <td>{row.projects.length ? row.projects.join(', ') : <span className="pill">Beschikbaar</span>}</td>
      <td className="n num">{row.until ? formatDate(row.until) : '—'}</td>
     </tr>)}</tbody>
    </table>
    : <div className="empty"><p>Nog geen actieve medewerkers.</p></div>}
  </section>

  <div className="report-pair">
   <Summary title="Projectstatussen" columns={['Status', 'Projecten']} rows={modules.projecten.states.map(status => [status, data.projecten.filter(r => r.status === status).length])} />
   <Summary title="Inzetstatussen" columns={['Status', 'Inzet']} rows={modules.inzet.states.map(status => [status, data.inzet.filter(r => r.status === status).length])} />
  </div>
 </>;
}
