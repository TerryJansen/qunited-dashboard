import React, { useEffect, useState } from 'react';
import { getAllAttachments } from './files';
import { isoToday } from './alerts';
import { coverWindow, coverRows, comingFree, occupancy, staffing } from './cover';
import { collectActions, hasSourceData } from './actions';
import { money, number, formatDate, formatDateLong, plural } from './format';
import { StorageNotice, BackupReminder } from './StorageNotice';
import useNarrow from './useNarrow';

const VISIBLE_ACTIONS = 4;
const VISIBLE_PROJECTS = 5;
const VISIBLE_FREE = 5;

/** Een kerncijfer dat doorklikt naar het overzicht waar het vandaan komt. */
function Kpi({ label, value, note, href, onClick, testid, active }) {
 const body = <>
  <span className="kpi-label">{label}</span>
  <strong className="kpi-value" data-testid={testid}>{value}</strong>
  <span className="kpi-note">{note}</span>
 </>;
 if (onClick) return <button type="button" className={`kpi kpi-link${active ? ' is-active' : ''}`} aria-pressed={active} onClick={onClick}>{body}</button>;
 return <a className="kpi kpi-link" href={href}>{body}</a>;
}

export default function Dashboard({ data }) {
 const [certificates, setCertificates] = useState([]);
 const [fileError, setFileError] = useState('');
 const [onlyAvailable, setOnlyAvailable] = useState(false);
 const narrow = useNarrow();

 useEffect(() => {
  getAllAttachments().then(setCertificates)
   .catch(() => setFileError('De certificaatdatums konden niet worden gelezen, dus certificaten ontbreken in deze lijst.'));
 }, []);

 const iso = isoToday();
 // Het venster loopt vanaf deze maandag; vandaag ligt erin, zodat "t/m" een echte datum is.
 const window = coverWindow(iso, 183, iso);
 const rows = coverRows(data, window, iso, { onlyAvailable });
 const allRows = coverRows(data, window, iso);

 const { active, deployed, available, absent, rate } = occupancy(data, iso);
 const actions = collectActions(data, certificates, iso);
 const urgent = actions.filter(action => action.urgency === 'hoog');
 const free = comingFree(data, iso);

 const submitted = data.urenstaten.filter(sheet => sheet.status === 'Ingediend');
 const running = data.projecten.filter(project => project.status === 'In uitvoering');
 const starting = data.projecten.filter(project => project.status === 'Planning');

 const projects = data.projecten
  .filter(project => ['Planning', 'In uitvoering'].includes(project.status))
  .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));

 const empty = !hasSourceData(data);
 const steps = [
  { done: !!data.personeel.length, label: 'Voeg een medewerker toe', href: '#/personeel/nieuw' },
  { done: !!data.projecten.length, label: 'Maak een project aan', href: '#/projecten/nieuw' },
  { done: !!data.inzet.length, label: 'Plan de eerste inzet', href: '#/planning' },
 ];

 return <>
  <div className="title-row">
   <div>
    <h1>Overzicht</h1>
   </div>
   <div className="title-actions">
    <a className="primary" href="#/planning">Planning openen</a>
   </div>
  </div>

  <StorageNotice />
  <BackupReminder hasData={!empty} />
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
    label="Ingezet vandaag" testid="deployed-count" href="#/planning"
    value={<>{number(deployed.length)}<small>/ {number(active.length)}</small></>}
    note={rate === null ? 'nog geen actieve medewerkers' : `${rate}% bezetting`} />
   <Kpi
    label="Beschikbaar vandaag" testid="available-count"
    value={number(available.length)}
    note={absent.length ? `${plural(absent.length, 'medewerker', 'medewerkers')} afwezig` : 'niemand afwezig'}
    active={onlyAvailable}
    onClick={() => setOnlyAvailable(value => !value)} />
   <Kpi
    label="Te beoordelen urenstaten" testid="submitted-count" href="#/urenstaten?status=Ingediend"
    value={number(submitted.length)}
    note={submitted.length ? 'status Ingediend' : 'niets in behandeling'} />
   <Kpi
    label="Lopende projecten" testid="project-count" href="#/projecten?status=In uitvoering"
    value={number(running.length)}
    note={starting.length ? `${plural(starting.length, 'project', 'projecten')} in planning` : 'niets in planning'} />
  </section>

  <div className="overview-grid">
   <section className="panel" aria-label="Vandaag">
    <header>
     <h2>Wie staat waar vandaag</h2>
     <a className="card-link" href="#/planning">Hele planning bekijken</a>
    </header>
    {onlyAvailable && <p className="panel-period">Alleen wie vandaag niet ingezet is · <button type="button" className="text-action" onClick={() => setOnlyAvailable(false)}>toon alle medewerkers</button></p>}
    {allRows.length
     ? rows.length
      ? <ul className="stack today-list" aria-label="Wie staat waar vandaag">
       {rows.map(row => {
        const now = row.bars.find(bar => window.today !== null && bar.from <= window.today && bar.to >= window.today);
        const until = now && now.to < window.days.length ? window.days[now.to].iso : '';
        return <li key={row.id}>
         <div className="stack-head">
          <span className="today-who"><a href={row.href}>{row.label}</a>{row.sub && <span className="sub">{row.sub}</span>}</span>
          <span className={`pill${row.state === 'beschikbaar' ? ' pos' : ''}`}>
           {row.state === 'ingezet' ? 'Ingezet' : row.state === 'afwezig' ? 'Afwezig' : 'Beschikbaar'}
          </span>
         </div>
         <p className="stack-sub">
          {now
           ? <><a href={now.href}>{now.label}</a>{until && <> · t/m <span className="num">{formatDate(until)}</span></>}</>
           : 'Geen inzet vandaag'}
         </p>
        </li>;
       })}
      </ul>
      : <p className="empty-line">Iedereen is vandaag ingezet.</p>
     : <p className="empty-line">Nog geen actieve medewerkers. <a href="#/personeel/nieuw">Medewerker toevoegen</a></p>}
   </section>

   <section className="panel" aria-label="Actiepunten">
    <header>
     <h2>Actiepunten</h2>
     <span className="meta">{urgent.length ? `${plural(urgent.length, 'urgent punt', 'urgente punten')}` : 'niets urgents'}</span>
    </header>
    {actions.length
     ? <>
      <ul className="actions-list">
       {actions.slice(0, narrow ? 3 : VISIBLE_ACTIONS).map(action => <li key={action.id} className={`action action-${action.urgency}`}>
        <a href={action.href}>
         <b>{action.what}</b>
         <span className="action-context">{action.context}</span>
         {action.due && <span className={`action-due${action.overdue ? ' is-overdue' : ''}`}>{action.due}</span>}
        </a>
       </li>)}
      </ul>
      {actions.length > (narrow ? 3 : VISIBLE_ACTIONS) && <p className="kpi-note" data-testid="actions-more">
       Nog {plural(actions.length - (narrow ? 3 : VISIBLE_ACTIONS), 'actiepunt', 'actiepunten')} in de modules zelf.
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
          <a href={`#/projecten/${project.id}`}>{project.name}</a>
          <span className="pill">{project.status}</span>
         </div>
         {project.client && <p className="stack-sub">{project.client}</p>}
         <p className="stack-sub">
          tot <span className="num">{project.due ? formatDate(project.due) : '—'}</span> ·{' '}
          <span className={short ? 'shortfall' : 'num'}>{number(filled)} / {needed === null ? '—' : number(needed)}</span>
          {short ? <span className="shortfall"> · {short} tekort</span> : ''}
         </p>
        </li>;
       })}
      </ul>
      : <div className="table-wrap" tabIndex={0}><table aria-label="Lopende en geplande projecten">
      <thead><tr><th>Project</th><th>Status</th><th className="n">Einddatum</th><th className="n">Bezetting</th></tr></thead>
      <tbody>{projects.slice(0, VISIBLE_PROJECTS).map(project => {
       const { filled, needed, short } = staffing(data, project, iso);
       return <tr key={project.id}>
        <td className="identity">
         <a href={`#/projecten/${project.id}`}>{project.name}</a>
         {project.client && <span className="sub">{project.client}</span>}
        </td>
        <td><span className="pill">{project.status}</span></td>
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
         <a href={`#/personeel/${person.id}`}>{person.name}</a>
         <span className="num">inzetbaar {person.freeOn ? formatDate(person.freeOn) : 'niet binnen 6 maanden'}</span>
        </div>
        <p className="stack-sub">{person.project}</p>
       </li>)}
      </ul>
      : <div className="table-wrap" tabIndex={0}><table aria-label="Medewerkers die binnenkort vrijkomen">
      <thead><tr><th>Medewerker</th><th>Huidig project</th><th className="n">Inzetbaar vanaf</th></tr></thead>
      <tbody>{free.slice(0, VISIBLE_FREE).map(person => <tr key={person.id}>
       <td className="identity">
        <a href={`#/personeel/${person.id}`}>{person.name}</a>
        {person.role && <span className="sub">{person.role}</span>}
       </td>
       <td>{person.project}</td>
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
