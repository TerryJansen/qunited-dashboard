import React, { useEffect, useState } from 'react';
import { getAllAttachments } from './files';
import { isoToday, shiftDays } from './alerts';
import { weekHours, mondayOf, formatDuration, change } from './hours';
import Icon from './Icon';
import { coverWindow, coverRows, occupancy, staffing } from './cover';
import { collectActions, hasSourceData } from './actions';
import { number, formatDate, plural } from './format';
import { StorageNotice, BackupReminder } from './StorageNotice';
import useNarrow from './useNarrow';

const VISIBLE_ACTIONS = 4;
const VISIBLE_PROJECTS = 3;

const SERIES = ['var(--lime)', 'var(--chart-2)', 'var(--navy)'];

/** Eén kaart: kop met pictogram, titel en uitleg, de inhoud, en onderaan één link naar het hele scherm. */
function Card({ icon, title, sub, control, footer, label, className = '', children }) {
 return <section className={`card ${className}`} aria-label={label || title}>
  <header className="card-head">
   <span className="card-icon"><Icon name={icon} /></span>
   <div className="card-title"><h2>{title}</h2>{sub && <p>{sub}</p>}</div>
   {control && <div className="card-control">{control}</div>}
  </header>
  <div className="card-body">{children}</div>
  {footer && <a className="card-foot" href={footer.href}><span>{footer.label}</span><Icon name="pijl" /></a>}
 </section>;
}

/** Gewerkte uren per dag. Klik een dag aan om te zien op welke projecten de uren zijn geschreven. */
function HoursCard({ data, iso }) {
 const [previous, setPrevious] = useState(false);
 const monday = shiftDays(mondayOf(iso), previous ? -7 : 0);
 const week = weekHours(data, monday, iso);
 const before = weekHours(data, shiftDays(monday, -7), iso);
 const diff = change(week.total, before.total);
 const fallback = week.days.findIndex(day => day.today) >= 0 && week.days.find(day => day.today).minutes
  ? week.days.findIndex(day => day.today)
  : week.days.reduce((best, day, index) => day.minutes > week.days[best].minutes ? index : best, 0);
 const [picked, setPicked] = useState(null);
 const chosen = week.days[picked ?? fallback];
 const top = Math.max(8, Math.ceil(Math.max(...week.days.map(day => day.minutes)) / 120) * 2);
 const ticks = [1, 0.75, 0.5, 0.25, 0].map(part => top * part);

 return <Card icon="urenstaten" title="Gewerkte uren" sub="Alle uren uit de urenstaten, per dag" label="Gewerkte uren"
  control={<div className="seg" role="group" aria-label="Welke week">
   <button type="button" aria-pressed={!previous} onClick={() => { setPrevious(false); setPicked(null); }}>Deze week</button>
   <button type="button" aria-pressed={previous} onClick={() => { setPrevious(true); setPicked(null); }}>Vorige week</button>
  </div>}
  footer={{ href: '#/urenstaten', label: 'Bekijk de urenstaten' }}>
  <p className="big-figure">
   <b data-testid="hours-total">{formatDuration(week.total)}</b>
   {diff !== null && <span className={diff < 0 ? 'down' : 'up'}>{diff < 0 ? '↓' : '↑'} {Math.abs(diff)}% <i>t.o.v. de week ervoor</i></span>}
  </p>
  {week.total
   ? <div className="bars-wrap">
    <div className="bars" role="group" aria-label="Uren per dag">
     <div className="bars-grid" aria-hidden="true">{ticks.map(tick => <span key={tick}><i>{tick}u</i></span>)}</div>
     {week.days.map((day, index) => <button key={day.iso} type="button" className={`bar-col${day === chosen ? ' is-picked' : ''}`}
      aria-pressed={day === chosen} onClick={() => setPicked(index)}
      aria-label={`${formatDate(day.iso)}: ${day.minutes ? formatDuration(day.minutes) : 'geen uren'}`}>
      <span className="bar" style={{ height: `${Math.min(100, day.minutes / (top * 60) * 100)}%` }}>
       {day === chosen && day.parts.map((part, i) => <i key={part.id} style={{ flexGrow: part.minutes, background: SERIES[i] }} />)}
      </span>
      <span className={`bar-day${day.today ? ' is-today' : ''}`}>{day.short}</span>
     </button>)}
    </div>
    <div className="bars-detail" aria-live="polite">
     <b>{formatDate(chosen.iso)}</b>
     {chosen.parts.length
      ? <ul>{chosen.parts.map((part, i) => <li key={part.id}><i style={{ background: SERIES[i] }} /><span>{part.name}</span><b>{formatDuration(part.minutes)}</b></li>)}</ul>
      : <p>Geen uren geschreven.</p>}
    </div>
   </div>
   : <p className="empty-line">{previous ? 'Vorige week zijn er geen uren geschreven.' : 'Deze week zijn er nog geen uren geschreven.'} <a href="#/urenstaten/nieuw">Uren toevoegen</a></p>}
 </Card>;
}

/** Drie ringen: ingezet, afwezig en beschikbaar, elk als deel van alle actieve medewerkers. */
function Rings({ parts, total }) {
 return <svg className="rings" viewBox="0 0 120 120" role="img" aria-label={parts.map(part => `${part.label} ${part.value} van ${total}`).join(', ')}>
  {parts.map((part, index) => {
   const r = 52 - index * 15, length = 2 * Math.PI * r, share = total ? part.value / total : 0;
   return <g key={part.label} transform="rotate(-90 60 60)">
    <circle cx="60" cy="60" r={r} fill="none" stroke="var(--chart-track)" strokeWidth="8" />
    {share > 0 && <circle cx="60" cy="60" r={r} fill="none" stroke={part.color} strokeWidth="8" strokeLinecap="round"
     strokeDasharray={`${Math.max(0.01, share * length - (share < 1 ? 8 : 0))} ${length}`} />}
   </g>;
  })}
 </svg>;
}

/** Voortgang als rij streepjes: gevuld tot waar het project nu is. */
function Ticks({ share, label }) {
 const filled = Math.round(Math.max(0, Math.min(1, share)) * 36);
 return <span className="ticks" role="img" aria-label={label}>{Array.from({ length: 36 }, (_, i) => <i key={i} className={i < filled ? 'on' : ''} />)}</span>;
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

 const count = status => data.urenstaten.filter(sheet => sheet.status === status).length;
 const sheetStates = [
  { name: 'Concept', label: 'Concept', count: count('Concept'), color: 'var(--chart-muted)' },
  { name: 'Ingediend', label: 'Te beoordelen', count: count('Ingediend'), color: 'var(--chart-2)' },
  { name: 'Goedgekeurd', label: 'Goedgekeurd', count: count('Goedgekeurd'), color: 'var(--lime)' },
 ];
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

  <div className="dash">
   <div className="dash-main">
    <HoursCard data={data} iso={iso} />

    <div className="dash-pair">
    <Card icon="mensen" title="Wie staat waar vandaag" sub="Per medewerker het project en tot wanneer" label="Vandaag"
     control={<div className="seg" role="group" aria-label="Wie tonen">
      <button type="button" aria-pressed={!onlyAvailable} onClick={() => setOnlyAvailable(false)}>Iedereen</button>
      <button type="button" aria-pressed={onlyAvailable} onClick={() => setOnlyAvailable(true)}>Alleen beschikbaar</button>
     </div>}
     footer={{ href: '#/planning', label: 'Hele planning bekijken' }}>
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
    </Card>

    <Card icon="projecten" title="Projecten" label="Lopende en geplande projecten"
     sub={<><a href="#/projecten?status=In uitvoering"><span data-testid="project-count">{number(running.length)}</span> in uitvoering</a> · {number(starting.length)} in planning</>}
     footer={{ href: '#/projecten', label: 'Alle projecten bekijken' }}>
     {projects.length
      ? <ul className="project-list">
       {projects.slice(0, VISIBLE_PROJECTS).map(project => {
        const { filled, needed, short } = staffing(data, project, iso);
        const span = project.start && project.due && project.due > project.start
         ? (Date.parse(iso) - Date.parse(project.start)) / (Date.parse(project.due) - Date.parse(project.start)) : null;
        return <li key={project.id}>
         <div className="project-head"><a href={`#/projecten/${project.id}`}>{project.name}</a><span className={project.status === 'In uitvoering' ? 'state on' : 'state'}>{project.status}</span></div>
         {span !== null && <Ticks share={span} label={`${Math.round(Math.max(0, Math.min(1, span)) * 100)}% van de looptijd voorbij`} />}
         <p>
          {project.due ? <>tot <span className="num">{formatDate(project.due)}</span> · </> : ''}
          <span className={short ? 'shortfall' : ''}>{needed === null ? `${number(filled)} ingezet` : `${number(filled)} / ${number(needed)} bezet`}</span>
          {short ? <span className="shortfall"> · {short} tekort</span> : ''}
         </p>
        </li>;
       })}
      </ul>
      : <p className="empty-line">Geen projecten met status Planning of In uitvoering. <a href="#/projecten/nieuw">Project aanmaken</a></p>}
     {projects.length > VISIBLE_PROJECTS && <p className="card-note">{projects.length - VISIBLE_PROJECTS} meer onder Projecten.</p>}
    </Card>
    </div>
   </div>

   <div className="dash-side">
    <Card icon="planning" title="Bezetting vandaag" sub={rate === null ? 'Nog geen actieve medewerkers' : `${rate}% van de actieve medewerkers is ingezet`}
     footer={{ href: '#/planning', label: 'Bekijk de planning' }}>
     <div className="activity">
      <dl>
       <div style={{ '--mark': 'var(--lime)' }}><dt>Ingezet</dt><dd><b data-testid="deployed-count">{number(deployed.length)}</b><span>/{number(active.length)}</span></dd></div>
       <div style={{ '--mark': 'var(--chart-2)' }}><dt>Afwezig</dt><dd><b>{number(absent.length)}</b><span>/{number(active.length)}</span></dd></div>
       <div style={{ '--mark': 'var(--navy)' }}><dt>Beschikbaar</dt><dd><b data-testid="available-count">{number(available.length)}</b><span>/{number(active.length)}</span></dd></div>
      </dl>
      <Rings total={active.length} parts={[
       { label: 'Ingezet', value: deployed.length, color: 'var(--lime)' },
       { label: 'Afwezig', value: absent.length, color: 'var(--chart-2)' },
       { label: 'Beschikbaar', value: available.length, color: 'var(--navy)' },
      ]} />
     </div>
     <p className="card-note">{absent.length ? `${plural(absent.length, 'medewerker', 'medewerkers')} afwezig` : 'Niemand afwezig'}</p>
    </Card>

    <Card icon="acties" title="Actiepunten" sub={urgent.length ? plural(urgent.length, 'urgent punt', 'urgente punten') : 'Niets urgents'} label="Actiepunten">
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
       {actions.length > (narrow ? 3 : VISIBLE_ACTIONS) && <p className="card-note" data-testid="actions-more">
        Nog {plural(actions.length - (narrow ? 3 : VISIBLE_ACTIONS), 'actiepunt', 'actiepunten')} in de modules zelf.
       </p>}
      </>
      : empty
       ? <p className="empty-line" data-testid="actions-unknown">Nog geen gegevens om actiepunten uit af te leiden.</p>
       : <p className="empty-line" data-testid="actions-empty">Geen openstaande acties uit de datums en statussen die je hebt ingevuld.</p>}
    </Card>

    <Card icon="rapportages" title="Urenstaten" sub="Verdeling over de statussen" footer={{ href: '#/urenstaten', label: 'Bekijk de urenstaten' }}>
     {data.urenstaten.length > 0 && <span className="split" aria-hidden="true">
      {sheetStates.filter(state => state.count).map(state => <i key={state.name} style={{ flexGrow: state.count, background: state.color }} />)}
     </span>}
     <ul className="split-legend">
      {sheetStates.map(state => <li key={state.name}>
       <a href={`#/urenstaten?status=${state.name}`}><i style={{ background: state.color }} /><span>{state.label}</span>
        <b data-testid={state.name === 'Ingediend' ? 'submitted-count' : undefined}>{number(state.count)}</b></a>
      </li>)}
     </ul>
    </Card>
   </div>
  </div>
 </>;
}
