import React, { useEffect, useState } from 'react';
import { getAllAttachments } from './files';
import { isoToday, shiftDays } from './alerts';
import { coverWindow, coverRows, coverFinding, comingFree, occupancy, staffing, COVER_KINDS } from './cover';
import { collectActions, hasSourceData } from './actions';
import { money, number, formatDate, formatDateLong, plural } from './format';
import Chart from './Chart';

const VISIBLE_ACTIONS = 6;
const VISIBLE_PROJECTS = 5;
const VISIBLE_FREE = 5;

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

/** Een kerncijfer dat doorklikt naar het overzicht waar het vandaan komt. */
function Kpi({ label, value, note, period, href, onClick, testid, active }) {
 const body = <>
  <span className="kpi-label">{label}</span>
  <strong className="kpi-value" data-testid={testid}>{value}</strong>
  <span className="kpi-note">{note}</span>
  <span className="kpi-period">{period}</span>
 </>;
 if (onClick) return <button type="button" className={`kpi kpi-link${active ? ' is-active' : ''}`} aria-pressed={active} onClick={onClick}>{body}</button>;
 return <a className="kpi kpi-link" href={href}>{body}</a>;
}

export default function Dashboard({ data }) {
 const [certificates, setCertificates] = useState([]);
 const [fileError, setFileError] = useState('');
 const [weeks, setWeeks] = useState(4);
 const [offset, setOffset] = useState(0);
 const [onlyAvailable, setOnlyAvailable] = useState(false);
 const narrow = useNarrow();

 useEffect(() => {
  getAllAttachments().then(setCertificates)
   .catch(() => setFileError('De certificaatdatums konden niet worden gelezen, dus certificaten ontbreken in deze lijst.'));
 }, []);

 const iso = isoToday();
 const length = narrow ? 7 : weeks * 7;
 const window = coverWindow(shiftDays(iso, offset * length), length, iso);
 const rows = coverRows(data, window, iso, { onlyAvailable });
 const allRows = coverRows(data, window, iso);

 const { active, deployed, available, absent, rate } = occupancy(data, iso);
 const actions = collectActions(data, certificates, iso);
 const urgent = actions.filter(action => action.urgency === 'hoog');
 const free = comingFree(data, iso);

 const submitted = data.urenstaten.filter(sheet => sheet.status === 'Ingediend');
 const openInvoices = data.facturatie.filter(invoice => invoice.status === 'Open');
 const openTotal = openInvoices.reduce((sum, invoice) => sum + Math.round(Number(invoice.amount) * 100), 0) / 100;
 const lateInvoices = openInvoices.filter(invoice => invoice.due && invoice.due < iso);
 const lateTotal = lateInvoices.reduce((sum, invoice) => sum + Math.round(Number(invoice.amount) * 100), 0) / 100;

 const projects = data.projecten
  .filter(project => ['Planning', 'In uitvoering'].includes(project.status))
  .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));

 const empty = !hasSourceData(data);
 const steps = [
  { done: !!data.personeel.length, label: 'Voeg een medewerker toe', href: '#/personeel/nieuw' },
  { done: !!data.projecten.length, label: 'Maak een project aan', href: '#/projecten/nieuw' },
  { done: !!data.inzet.length, label: 'Plan de eerste inzet', href: '#/inzet/nieuw' },
 ];

 return <>
  <div className="title-row">
   <div>
    <h1>Overzicht</h1>
    <p className="sub">{coverFinding(data, iso)}</p>
   </div>
   <div className="title-actions">
    <NewMenu />
    <a className="primary" href="#/inzet/nieuw">Inzet toevoegen</a>
   </div>
  </div>

  {fileError && <p role="alert" className="notice warn">{fileError}</p>}

  {!steps.every(step => step.done) && <section className="panel checklist" aria-label="Werkruimte inrichten">
   <header><h2>Werkruimte inrichten</h2><span className="meta">{steps.filter(s => s.done).length} van {steps.length} klaar</span></header>
   <ol className="steps">
    {steps.map(step => <li key={step.label} className={step.done ? 'done' : ''}>
     {step.done ? <span>{step.label}</span> : <a href={step.href}>{step.label}</a>}
    </li>)}
   </ol>
  </section>}

  <section className="kpis" aria-label="Kerncijfers">
   <Kpi
    label="Ingezet vandaag" testid="deployed-count" href="#/inzet?status=Actief"
    value={<>{number(deployed.length)}<small>/ {number(active.length)}</small></>}
    note={rate === null ? 'nog geen actieve medewerkers' : `${rate}% bezetting`}
    period={`vandaag, ${formatDate(iso)}`} />
   <Kpi
    label="Beschikbaar vandaag" testid="available-count"
    value={number(available.length)}
    note={absent.length ? `${plural(absent.length, 'medewerker', 'medewerkers')} afwezig` : 'niemand afwezig'}
    period={`vandaag, ${formatDate(iso)}`}
    active={onlyAvailable}
    onClick={() => setOnlyAvailable(value => !value)} />
   <Kpi
    label="Te beoordelen urenstaten" testid="submitted-count" href="#/urenstaten?status=Ingediend"
    value={number(submitted.length)}
    note={submitted.length ? 'status Ingediend' : 'niets in behandeling'}
    period="alle datums" />
   <Kpi
    label="Openstaande facturen" testid="invoice-total" href="#/facturatie?status=Open"
    value={money(openTotal)}
    note={lateInvoices.length ? `${plural(lateInvoices.length, 'factuur', 'facturen')} vervallen · ${money(lateTotal)}` : 'niets vervallen'}
    period="alle datums" />
  </section>

  <div className="overview-grid">
   <section className="panel" aria-label="Bezettingsplanning">
    <header>
     <h2>Bezettingsplanning</h2>
     <div className="period">
      <div className="segmented" role="group" aria-label="Lengte van de periode">
       <button type="button" aria-pressed={weeks === 1} onClick={() => setWeeks(1)}>1 week</button>
       <button type="button" aria-pressed={weeks === 4} onClick={() => setWeeks(4)}>4 weken</button>
      </div>
      <button type="button" onClick={() => setOffset(value => value - 1)} aria-label="Vorige periode">Vorige</button>
      <button type="button" onClick={() => setOffset(0)} disabled={offset === 0}>Vandaag</button>
      <button type="button" onClick={() => setOffset(value => value + 1)} aria-label="Volgende periode">Volgende</button>
     </div>
    </header>
    <p className="panel-period">
     {formatDate(window.start)} tot en met {formatDate(window.end)}
     {onlyAvailable && <> · <button type="button" className="text-action" onClick={() => setOnlyAvailable(false)}>toon alle medewerkers</button></>}
    </p>
    {allRows.length
     ? rows.length
      ? <Chart
       legend
       label={`Bezetting van ${rows.length} medewerkers over ${window.days.length} dagen`}
       deps={[JSON.stringify(rows), window.start, window.days.length]}
       draw={(Charts, host, legendHost) => Charts.timeline(host, rows, COVER_KINDS, {
        days: window.days, weekends: window.weekends, today: window.today, legend: legendHost, extras: false,
        onSelect: (bar) => { if (bar.href) location.hash = bar.href.slice(1); },
       })}
      />
      : <p className="empty-line">Geen medewerker voldoet aan dit filter.</p>
     : <p className="empty-line">Nog geen actieve medewerkers. <a href="#/personeel/nieuw">Medewerker toevoegen</a></p>}
    {!!allRows.length && <p className="kpi-note">
     De gekleurde lijn is vandaag. Klik een balk om de registratie te openen.
     {!data.afwezigheid.length && ' Afwezigheid is nog niet vastgelegd, dus iedereen zonder inzet telt als beschikbaar.'}
    </p>}
   </section>

   <section className="panel" aria-label="Actiepunten">
    <header>
     <h2>Actiepunten</h2>
     <span className="meta">{urgent.length ? `${plural(urgent.length, 'urgent punt', 'urgente punten')}` : 'niets urgents'}</span>
    </header>
    {actions.length
     ? <>
      <ul className="actions-list">
       {actions.slice(0, VISIBLE_ACTIONS).map(action => <li key={action.id} className={`action action-${action.urgency}`}>
        <a href={action.href}>
         <b>{action.what}</b>
         <span className="action-context">{action.context}</span>
         {action.due && <span className={`action-due${action.overdue ? ' is-overdue' : ''}`}>{action.due}</span>}
        </a>
       </li>)}
      </ul>
      {actions.length > VISIBLE_ACTIONS && <p className="kpi-note" data-testid="actions-more">
       Nog {plural(actions.length - VISIBLE_ACTIONS, 'actiepunt', 'actiepunten')} in de modules zelf.
      </p>}
     </>
     : empty
      ? <p className="empty-line" data-testid="actions-unknown">Nog geen gegevens om actiepunten uit af te leiden.</p>
      : <p className="empty-line" data-testid="actions-empty">Geen openstaande acties uit de datums en statussen die je hebt ingevuld.</p>}
   </section>
  </div>

  <div className="overview-grid lower">
   <section className="panel">
    <header>
     <h2>Lopende en geplande projecten</h2>
     <a className="card-link" href="#/projecten">Alle projecten bekijken</a>
    </header>
    {projects.length
     ? narrow
      ? <ul className="stack" aria-label="Lopende en geplande projecten">
       {projects.slice(0, VISIBLE_PROJECTS).map(project => {
        const { filled, needed, short } = staffing(data, project, iso);
        return <li key={project.id}>
         <div className="stack-head">
          <a href={`#/projecten?zoek=${encodeURIComponent(project.name)}`}>{project.name}</a>
          <span className="pill">{project.status}</span>
         </div>
         {project.client && <p className="stack-sub">{project.client}</p>}
         <p className="stack-sub">
          <span className="num">{project.start ? formatDate(project.start) : '—'}</span> tot{' '}
          <span className="num">{project.due ? formatDate(project.due) : '—'}</span> ·{' '}
          <span className={short ? 'shortfall' : 'num'}>{number(filled)} / {needed === null ? '—' : number(needed)}</span>
          {short ? <span className="shortfall"> · {short} tekort</span> : ''}
         </p>
        </li>;
       })}
      </ul>
      : <div className="table-wrap" tabIndex={0}><table aria-label="Lopende en geplande projecten">
      <thead><tr><th>Project</th><th>Status</th><th className="n">Start</th><th className="n">Einde</th><th className="n">Bezetting</th></tr></thead>
      <tbody>{projects.slice(0, VISIBLE_PROJECTS).map(project => {
       const { filled, needed, short } = staffing(data, project, iso);
       return <tr key={project.id}>
        <td className="identity">
         <a href={`#/projecten?zoek=${encodeURIComponent(project.name)}`}>{project.name}</a>
         {project.client && <span className="sub">{project.client}</span>}
        </td>
        <td><span className="pill">{project.status}</span></td>
        <td className="n num">{project.start ? formatDate(project.start) : '—'}</td>
        <td className="n num">{project.due ? formatDate(project.due) : '—'}</td>
        <td className="n num">
         {needed === null
          ? <>{number(filled)} / —</>
          : short
           ? <span className="shortfall">{number(filled)} / {number(needed)}<span className="sub">{short} tekort</span></span>
           : <>{number(filled)} / {number(needed)}</>}
        </td>
       </tr>;
      })}</tbody>
     </table></div>
     : <p className="empty-line">Geen projecten met status Planning of In uitvoering. <a href="#/projecten/nieuw">Project aanmaken</a></p>}
    {projects.length > VISIBLE_PROJECTS && <p className="kpi-note">{projects.length - VISIBLE_PROJECTS} meer onder Projecten.</p>}
    {projects.length > 0 && !projects.some(p => staffing(data, p, iso).needed !== null)
     && <p className="kpi-note">Vul “Benodigde bezetting” bij een project in om een personeelstekort te zien.</p>}
   </section>

   <section className="panel">
    <header>
     <h2>Komt binnenkort vrij</h2>
     <span className="meta">binnen 4 weken</span>
    </header>
    {free.length
     ? narrow
      ? <ul className="stack" aria-label="Medewerkers die binnenkort vrijkomen">
       {free.slice(0, VISIBLE_FREE).map(person => <li key={person.id}>
        <div className="stack-head">
         <a href={`#/personeel?zoek=${encodeURIComponent(person.name)}`}>{person.name}</a>
         <span className="num">inzetbaar {person.freeOn ? formatDate(person.freeOn) : 'niet binnen 6 maanden'}</span>
        </div>
        {person.role && <p className="stack-sub">{person.role}</p>}
        <p className="stack-sub">{person.project} · inzet eindigt <span className="num">{formatDate(person.endsOn)}</span></p>
       </li>)}
      </ul>
      : <div className="table-wrap" tabIndex={0}><table aria-label="Medewerkers die binnenkort vrijkomen">
      <thead><tr><th>Medewerker</th><th>Huidig project</th><th className="n">Inzet eindigt</th><th className="n">Inzetbaar</th></tr></thead>
      <tbody>{free.slice(0, VISIBLE_FREE).map(person => <tr key={person.id}>
       <td className="identity">
        <a href={`#/personeel?zoek=${encodeURIComponent(person.name)}`}>{person.name}</a>
        {person.role && <span className="sub">{person.role}</span>}
       </td>
       <td>{person.project}</td>
       <td className="n num">{formatDate(person.endsOn)}</td>
       <td className="n num">{person.freeOn ? formatDate(person.freeOn) : 'niet binnen 6 maanden'}</td>
      </tr>)}</tbody>
     </table></div>
     : <p className="empty-line">
      {deployed.length
       ? 'Geen inzet die binnen vier weken eindigt.'
       : 'Niemand staat vandaag op een project.'}
     </p>}
    {free.length > VISIBLE_FREE && <p className="kpi-note">{free.length - VISIBLE_FREE} meer onder Inzet.</p>}
   </section>
  </div>
 </>;
}

/** Eén compacte knop naar de bestaande invoerschermen; geen eigen formulier. */
function NewMenu() {
 const [open, setOpen] = useState(false);
 useEffect(() => {
  if (!open) return;
  const close = () => setOpen(false);
  addEventListener('hashchange', close);
  addEventListener('click', close);
  return () => { removeEventListener('hashchange', close); removeEventListener('click', close); };
 }, [open]);
 return <div className="menu-wrap" onClick={event => event.stopPropagation()}>
  <button type="button" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(value => !value)}>Nieuw</button>
  {open && <div className="menu" role="menu">
   <a role="menuitem" href="#/personeel/nieuw">Medewerker</a>
   <a role="menuitem" href="#/projecten/nieuw">Project</a>
   <a role="menuitem" href="#/inzet/nieuw">Inzet</a>
   <a role="menuitem" href="#/urenstaten/nieuw">Urenstaat</a>
  </div>}
 </div>;
}
