import React, { useEffect, useState } from 'react';
import { modules } from './modules';
import { getAllAttachments } from './files';
import { collectAlerts, availableStaff, runsOn, isoToday } from './alerts';
import { money, plural } from './format';

const VISIBLE_ALERTS = 8;

export default function Dashboard({ data }) {
 const [certificates, setCertificates] = useState([]);

 useEffect(() => {
  // Certificaatdatums staan bij de bestanden in IndexedDB; lukt dat niet, dan tonen we gewoon de rest.
  getAllAttachments().then(setCertificates).catch(() => setCertificates([]));
 }, []);

 const iso = isoToday();
 const alerts = collectAlerts(data, certificates, iso);
 const overdue = alerts.filter(alert => alert.level === 'verlopen').length;
 const available = availableStaff(data, iso);
 const running = data.inzet.filter(record => runsOn(record, iso));

 const metrics = [
  { label: 'Actieve projecten', value: data.projecten.filter(r => ['Planning', 'In uitvoering'].includes(r.status)).length, testid: 'project-count' },
  { label: 'Lopende inzet', value: running.length, testid: 'assignment-count' },
  { label: 'Beschikbaar personeel', value: available.length, testid: 'available-count' },
  { label: 'Openstaande facturen', value: money(data.facturatie.filter(r => r.status === 'Open').reduce((sum, r) => sum + Math.round(Number(r.amount) * 100), 0) / 100), testid: 'invoice-total' },
  { label: 'Materiaal in gebruik', value: data.materiaal.filter(r => r.status === 'In gebruik').reduce((sum, r) => sum + Number(r.quantity || 0), 0) },
  { label: 'Open IT-meldingen', value: data.support.filter(r => r.status !== 'Opgelost').length },
 ];

 return <>
  <div className="heading">
   <div>
    <h1>Dashboard</h1>
    <p>Overzicht van je eigen registraties.</p>
   </div>
   <a className="primary" href="#/projecten">Naar projecten</a>
  </div>

  <section className="metric-grid" aria-label="Overzicht">
   {metrics.map(metric => <div className="metric" key={metric.label}>
    <span>{metric.label}</span>
    <strong data-testid={metric.testid}>{metric.value}</strong>
   </div>)}
  </section>

  <h2>Attentiepunten</h2>
  <p className="muted">
   Uitsluitend op basis van datums die je zelf hebt ingevuld: verstreken datums en datums die binnenkort aflopen.
   {overdue > 0 && ` ${overdue} ${overdue === 1 ? 'punt is' : 'punten zijn'} al verstreken.`}
  </p>
  {alerts.length
   ? <section className="alerts" aria-label="Attentiepunten">
    {alerts.slice(0, VISIBLE_ALERTS).map(alert => <a className={`alert alert-${alert.level}`} key={alert.id} href={`#/${alert.route}`}>
     <span className="badge">{alert.level === 'verlopen' ? 'Verstreken' : 'Binnenkort'}</span>
     <b>{alert.text}</b>
     <span className="muted">{alert.module}</span>
    </a>)}
    {alerts.length > VISIBLE_ALERTS && <p className="muted" data-testid="alerts-more">
     Nog {plural(alerts.length - VISIBLE_ALERTS, 'attentiepunt', 'attentiepunten')} in de modules zelf.
    </p>}
   </section>
   : <div className="empty" data-testid="alerts-empty">
    <h2>Geen attentiepunten</h2>
    <p>Geen verstreken of binnenkort aflopende datums in je registraties.</p>
   </div>}

  <h2>Snel naar</h2>
  <section className="quick-grid">
   {Object.entries(modules).map(([key, m]) => <a className="quick-link" href={`#/${key}`} key={key}>
    <b>{m.title}</b>
    <span>{plural(data[key].length, 'registratie', 'registraties')}</span>
   </a>)}
   <a className="quick-link" href="#/rapportages"><b>Rapportages</b><span>Uren en bezetting</span></a>
   <a className="quick-link" href="#/backup"><b>Back-up</b><span>Downloaden en terugzetten</span></a>
  </section>
  <p className="muted">Geen externe gegevensbronnen. Alleen wat je zelf toevoegt verschijnt hier.</p>
 </>;
}
