import React, { useEffect, useState } from 'react';
import { getAllAttachments } from './files';
import { collectAlerts, availableStaff, runsOn, isoToday, shiftDays } from './alerts';
import { coverWindow, coverRows, coverFinding, comingFree, COVER_KINDS } from './cover';
import { money, number, formatDate, plural } from './format';
import Chart from './Chart';

const VISIBLE_ALERTS = 5;

/** Op een telefoon is een venster van vier weken onleesbaar smal; dan tonen we er twee. */
function useNarrow() {
 const [narrow, setNarrow] = useState(() => typeof matchMedia === 'function' && matchMedia('(max-width: 860px)').matches);
 useEffect(() => {
  const query = matchMedia('(max-width: 860px)');
  const change = () => setNarrow(query.matches);
  query.addEventListener('change', change);
  return () => query.removeEventListener('change', change);
 }, []);
 return narrow;
}

export default function Dashboard({ data }) {
 const [certificates, setCertificates] = useState([]);
 const narrow = useNarrow();

 useEffect(() => {
  // De geldigheidsdatums staan bij de bestanden in IndexedDB; lukt dat niet, dan tonen we de rest.
  getAllAttachments().then(setCertificates).catch(() => setCertificates([]));
 }, []);

 const iso = isoToday();
 const window = coverWindow(iso, narrow ? 14 : 28);
 const rows = coverRows(data, window, iso);
 const alerts = collectAlerts(data, certificates, iso);
 const overdue = alerts.filter(alert => alert.level === 'verlopen');
 const available = availableStaff(data, iso);
 const activeStaff = data.personeel.filter(person => person.status === 'Actief');
 const free = comingFree(data, window, iso);

 // De laatste zeven dagen tot en met vandaag: altijd een volle week, met de maatstaf in het bijschrift.
 const weekStart = shiftDays(iso, -6);
 const weekSheets = data.urenstaten.filter(sheet => sheet.date >= weekStart && sheet.date <= iso);
 const weekHours = weekSheets.reduce((sum, sheet) => sum + Math.round(Number(sheet.hours) * 100), 0) / 100;

 const openInvoices = data.facturatie.filter(invoice => invoice.status === 'Open');
 const openTotal = openInvoices.reduce((sum, invoice) => sum + Math.round(Number(invoice.amount) * 100), 0) / 100;
 const lateInvoices = openInvoices.filter(invoice => invoice.due && invoice.due < iso);

 const runningProjects = data.projecten
  .filter(project => ['Planning', 'In uitvoering'].includes(project.status))
  .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));

 return <>
  <div className="title-row">
   <div>
    <h1>Overzicht</h1>
    <p className="sub">{coverFinding(data, iso)}</p>
   </div>
   <div className="title-actions">
    <a className="primary" href="#/inzet/nieuw">Inzet toevoegen</a>
   </div>
  </div>

  <div className="overview-grid">
   <div className="overview-main">
    <section className="kpis" aria-label="Kerncijfers">
     <div className="kpi">
      <span className="kpi-label">Bezet vandaag</span>
      <strong className="kpi-value" data-testid="assignment-count">{number(activeStaff.length - available.length)}</strong>
      <p className="kpi-note">van {plural(activeStaff.length, 'actieve medewerker', 'actieve medewerkers')}</p>
     </div>
     <div className="kpi">
      <span className="kpi-label">Beschikbaar vandaag</span>
      <strong className="kpi-value" data-testid="available-count">{number(available.length)}</strong>
      <p className="kpi-note">{free.length ? `${plural(free.length, 'medewerker komt', 'medewerkers komen')} vrij binnen 4 weken` : 'geen einddatum binnen 4 weken'}</p>
     </div>
     <div className="kpi">
      <span className="kpi-label">Uren laatste 7 dagen</span>
      <strong className="kpi-value" data-testid="week-hours">{number(weekHours)}</strong>
      <p className="kpi-note">vanaf {formatDate(weekStart)}</p>
     </div>
     <div className="kpi">
      <span className="kpi-label">Open facturen</span>
      <strong className="kpi-value" data-testid="invoice-total">{money(openTotal)}</strong>
      <p className="kpi-note">{lateInvoices.length ? `waarvan ${plural(lateInvoices.length, 'factuur', 'facturen')} vervallen` : 'geen vervallen facturen'}</p>
     </div>
    </section>

    <section className="panel">
     <header>
      <h2>Bezetting</h2>
      <span className="meta">{formatDate(window.start)} tot en met {formatDate(window.end)}</span>
     </header>
     {rows.length
      ? <Chart
       legend
       label={`Bezetting van ${rows.length} medewerkers over ${window.days.length} dagen`}
       deps={[JSON.stringify(rows), window.start]}
       draw={(Charts, host, legendHost) => Charts.timeline(host, rows, COVER_KINDS, {
        days: window.days,
        weekends: window.weekends,
        today: window.today,
        legend: legendHost,
        extras: false,
       })}
      />
      : <div className="empty">
       <p>Nog geen actieve medewerkers.</p>
       <p><a href="#/personeel">Medewerkers toevoegen</a></p>
      </div>}
     {!!rows.length && <p className="kpi-note">De oranje lijn is vandaag. Medewerkers zonder lopende inzet staan bovenaan.</p>}
    </section>

    <section className="panel">
     <header>
      <h2>Projecten in uitvoering</h2>
       <span className="meta">{plural(runningProjects.length, 'project', 'projecten')}</span>
      </header>
      {runningProjects.length
       ? <table aria-label="Projecten in uitvoering">
        <thead><tr><th>Project</th><th className="n">Einddatum</th><th className="n">Voortgang</th></tr></thead>
        <tbody>{runningProjects.map(project => <tr key={project.id}>
         <td className="identity">{project.name}{project.client && <span className="sub">{project.client}</span>}</td>
         <td className="n num">{project.due ? formatDate(project.due) : '—'}</td>
         <td className="n num">{project.progress === '' || project.progress === undefined ? '—' : `${number(Number(project.progress))}%`}</td>
        </tr>)}</tbody>
       </table>
       : <div className="empty"><p>Geen projecten met status Planning of In uitvoering.</p></div>}
    </section>
   </div>

   <div className="overview-rail">
    <h2 className="rail-head">Attentiepunten</h2>
    <section className="panel" aria-label="Attentiepunten">
     {alerts.length
      ? <>
       <div className="alerts">
        {alerts.slice(0, VISIBLE_ALERTS).map(alert => <a className={`alert alert-${alert.level}`} key={alert.id} href={`#/${alert.route}`}>
         <b>{alert.text}</b>
         <span className="when">{alert.module}</span>
        </a>)}
       </div>
       <p className="kpi-note alerts-foot" data-testid="alerts-more">
        {overdue.length ? `${plural(overdue.length, 'punt is', 'punten zijn')} al verstreken` : 'Niets verstreken'}
        {alerts.length > VISIBLE_ALERTS ? ` · nog ${plural(alerts.length - VISIBLE_ALERTS, 'punt', 'punten')} in de modules` : ''}
       </p>
      </>
      : <div className="empty" data-testid="alerts-empty">
       <p>Geen verstreken of binnenkort aflopende datums.</p>
      </div>}
    </section>

    <h2 className="rail-head">Komt binnenkort vrij</h2>
    <section className="panel" aria-label="Komt binnenkort vrij">
     {free.length
      ? <table aria-label="Medewerkers die binnenkort vrijkomen">
       <thead><tr><th>Medewerker</th><th className="n">Vrij op</th></tr></thead>
       <tbody>{free.slice(0, 6).map(person => <tr key={person.name}>
        <td className="identity">{person.name}{person.role && <span className="sub">{person.role}</span>}</td>
        <td className="n num">{formatDate(person.on)}</td>
       </tr>)}</tbody>
      </table>
      : <div className="empty">
       <p>{available.length ? `${plural(available.length, 'medewerker staat', 'medewerkers staan')} nu al zonder inzet.` : 'Geen einddatum binnen vier weken.'}</p>
      </div>}
    </section>
   </div>
  </div>
 </>;
}
