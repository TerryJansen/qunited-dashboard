import React, { useEffect, useRef, useState } from 'react';
import { isoToday, shiftDays } from './alerts';
import { week, dayInfo } from './agenda';
import { modules } from './modules';
import useNarrow from './useNarrow';
import { DurationWheel, PauseChoice, formatHours, formatMinutes } from './TimeWheel';
import { drive, RouteError } from './route';

const KIND = { actief: 'Ingezet', gepland: 'Gepland', afgerond: 'Afgerond', afwezig: 'Afwezig' };

/** De status volgt uit de datums: niemand hoeft hem zelf bij te houden. */
export function statusFor(record, today) {
 if (record.end && record.end < today) return 'Afgerond';
 if (record.start && record.start <= today) return 'Actief';
 return 'Gepland';
}

// Maandag is 0, vrijdag 4; in het weekend blijft het die ene dag.
const fridayOf = iso => shiftDays(iso, Math.max(0, 4 - (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7));
const longDate = iso => { const d = dayInfo(iso, ''); return `${d.long} ${d.date}`; };

/** Reistijd: berekend van het vertrekpunt naar de projectlocatie, niet gekozen. */
function Travel({ person, project, draft, set }) {
 const [state, setState] = useState({ status: 'idle', text: '' });
 const home = (person?.home || '').trim();
 const fromKind = draft.travelFromKind || (home ? 'huis' : 'adres');
 const fromAddress = fromKind === 'huis' ? home : (draft.travelFrom || '');
 const target = (project?.location || '').trim();

 useEffect(() => {
  if (!project) { setState({ status: 'idle', text: '' }); return undefined; }
  if (!target) { setState({ status: 'geen-locatie', text: '' }); return undefined; }
  if (!fromAddress.trim()) {
   // Geen vertrekpunt: dan ook geen oude reistijd laten staan.
   if (draft.travel) set({ travel: '', travelOneWay: '', distanceKm: '' });
   setState({ status: 'idle', text: '' });
   return undefined;
  }
  if (draft.travelFrom === fromAddress && draft.travelTo === target && draft.travel) { setState({ status: 'klaar', text: '' }); return undefined; }
  let stop = false;
  setState({ status: 'bezig', text: '' });
  const timer = setTimeout(() => {
   drive(fromAddress, target).then(trip => {
    if (stop) return;
    set({ travelFromKind: fromKind, travelFrom: fromAddress, travelTo: target, travelOneWay: String(trip.minutes), travel: String(trip.minutes * 2), distanceKm: String(trip.km) });
    setState({ status: 'klaar', text: '' });
   }).catch(error => {
    if (stop) return;
    set({ travelFromKind: fromKind, travelFrom: fromAddress, travelTo: target, travelOneWay: '', travel: '', distanceKm: '' });
    setState({ status: 'fout', text: error instanceof RouteError ? error.message : 'De reistijd kon niet worden berekend.' });
   });
  }, 600);
  return () => { stop = true; clearTimeout(timer); };
 }, [fromKind, fromAddress, target, project?.id]);

 return <div className="plan-travel" role="group" aria-labelledby="travel-title">
  <span className="field-label" id="travel-title">Reistijd</span>
  {!project
   ? <p className="plan-travel-note">Kies eerst een project.</p>
   : <>
    <div className="chips" role="radiogroup" aria-label="Vertrek vanaf">
     <label className={`chip${fromKind === 'huis' ? ' is-on' : ''}${home ? '' : ' is-off'}`}>
      <input type="radio" name="vertrek" checked={fromKind === 'huis'} disabled={!home} onChange={() => set({ travelFromKind: 'huis' })} />
      {home ? `Huis · ${home}` : 'Huis (nog geen adres)'}
     </label>
     <label className={`chip${fromKind === 'adres' ? ' is-on' : ''}`}>
      <input type="radio" name="vertrek" checked={fromKind === 'adres'} onChange={() => set({ travelFromKind: 'adres', travelFrom: draft.travelFromKind === 'adres' ? draft.travelFrom : '' })} />
      Ander adres
     </label>
    </div>
    {fromKind === 'adres' && <label className="plan-from">Vertrekadres
     <input type="text" maxLength={200} placeholder="Straat en plaats, of postcode" value={draft.travelFromKind === 'adres' ? draft.travelFrom || '' : ''}
      onChange={event => set({ travelFromKind: 'adres', travelFrom: event.target.value })} />
    </label>}
    {!home && person && fromKind === 'huis' && <p className="plan-travel-note">Vul bij {person.name} een vertrekadres in om vanaf huis te rekenen.</p>}
    <p className="plan-route">
     <span>{fromAddress || 'Vertrekpunt'}</span><span aria-hidden="true"> → </span><span>{target || 'locatie van het project'}</span>
    </p>
    <div className={`plan-travel-result is-${state.status}`} aria-live="polite" data-testid="travel-result">
     {state.status === 'geen-locatie' && <>Dit project heeft nog geen locatie. <a href={`#/projecten/${project.id}`}>Locatie invullen</a></>}
     {state.status === 'bezig' && 'Reistijd berekenen…'}
     {state.status === 'fout' && state.text}
     {state.status === 'klaar' && draft.travel && <>
      <b>{formatMinutes(draft.travel)}</b> per dag heen en terug
      <span>enkele reis {formatMinutes(draft.travelOneWay)} · {draft.distanceKm} km met de auto, zonder file</span>
     </>}
     {state.status === 'idle' && !fromAddress && 'Kies waar de medewerker vandaan rijdt.'}
    </div>
    {state.status === 'klaar' && <p className="plan-credit">Route: © OpenStreetMap-bijdragers</p>}
   </>}
 </div>;
}

/** Het venster om iemand in te plannen of een inzet te wijzigen: links wie en wanneer, rechts de werkdag. */
function PlanDialog({ data, plan, today, onClose, onSave, onDelete }) {
 const ref = useRef(null);
 const [draft, setDraft] = useState(plan.record);
 const [message, setMessage] = useState(null);
 const editing = !!plan.record.id;
 // Een melding is een korte pop-up: weg zodra je iets aanpast, en anders na een paar seconden.
 const set = (key, value) => { setMessage(null); setDraft(current => typeof key === 'object' ? { ...current, ...key } : { ...current, [key]: value }); };
 useEffect(() => {
  if (!message) return undefined;
  const timer = setTimeout(() => setMessage(null), 3500);
  return () => clearTimeout(timer);
 }, [message]);
 // Zet de cursor in het veld dat nog ontbreekt, zodat je meteen ziet waar het om gaat.
 function warn(text, field) {
  setMessage({ text, id: Date.now() });
  if (field) ref.current?.querySelector(field)?.focus();
 }
 const people = data.personeel.filter(person => person.status === 'Actief' || person.id === draft.employeeId);
 const person = data.personeel.find(p => p.id === draft.employeeId);
 const project = data.projecten.find(p => p.id === draft.projectId);

 useEffect(() => {
  const dialog = ref.current;
  if (dialog && !dialog.open) dialog.showModal?.();
  // Staat de medewerker al vast, dan is het project de eerste vraag.
  dialog?.querySelector(plan.record.employeeId ? 'select[name="project"]' : 'select[name="employee"]')?.focus();
 }, []);

 function submit(event) {
  event.preventDefault();
  if (!draft.employeeId) { warn('Kies een medewerker.', 'select[name="employee"]'); return; }
  if (!draft.projectId) { warn('Kies een project.', 'select[name="project"]'); return; }
  if (!draft.start) { warn('Vul in vanaf welke dag.', 'input[type="date"]'); return; }
  if (draft.end && draft.end < draft.start) { warn('"Tot en met" mag niet vóór "Van" liggen.'); return; }
  if (!(Number(draft.hoursPerDay) > 0)) { warn('Kies hoeveel uur per dag, meer dan 0:00.'); return; }
  const clean = { ...draft, role: (draft.role || '').trim() };
  if (clean.status !== 'Geannuleerd') clean.status = statusFor(clean, today);
  clean.name = modules.inzet.derivedName(clean, data);
  if (onSave(clean)) onClose();
 }

 const summary = draft.start ? [
  `${longDate(draft.start)}${draft.end ? (draft.end !== draft.start ? ` t/m ${longDate(draft.end)}` : '') : ', zonder einddatum'}`,
  Number(draft.hoursPerDay) > 0 ? `${formatHours(draft.hoursPerDay)} uur` : '',
  Number(draft.pause) > 0 ? `${formatMinutes(draft.pause)} pauze` : '',
  Number(draft.travel) > 0 ? `${formatMinutes(draft.travel)} reistijd` : '',
 ].filter(Boolean).join(' · ') : '';

 return <dialog ref={ref} className="plan-dialog" aria-labelledby="plan-title" onCancel={event => { event.preventDefault(); onClose(); }}>
  <form onSubmit={submit} noValidate>
   <header className="plan-head">
    <h2 id="plan-title">{editing ? 'Inzet wijzigen' : 'Inzet plannen'}</h2>
    <button type="button" className="plan-close" onClick={onClose} aria-label="Sluiten">×</button>
   </header>
   {!data.projecten.length
    ? <p className="plan-empty">Er is nog geen project om iemand op te zetten. <a href="#/projecten/nieuw">Maak eerst een project aan</a>.</p>
    : <div className="plan-body">
     <section className="plan-col" aria-label="Wie en wanneer">
      <label>Medewerker
       <select name="employee" aria-label="Medewerker" value={draft.employeeId || ''} onChange={event => set('employeeId', event.target.value)}>
        <option value="" disabled hidden>Kies medewerker</option>
        {people.map(p => <option key={p.id} value={p.id}>{p.name}{p.role ? ` · ${p.role}` : ''}</option>)}
       </select>
      </label>
      <label>Project
       <select name="project" aria-label="Project" value={draft.projectId || ''} onChange={event => set('projectId', event.target.value)}>
        <option value="" disabled hidden>Kies project</option>
        {data.projecten.filter(p => !['Afgerond', 'Geannuleerd'].includes(p.status) || p.id === draft.projectId)
         .map(p => <option key={p.id} value={p.id}>{p.name}{p.location ? ` · ${p.location}` : ''}</option>)}
       </select>
      </label>
      <div className="plan-dates">
       <label>Van
        <input type="date" value={draft.start || ''} onChange={event => set('start', event.target.value)} />
       </label>
       <label>Tot en met
        <input type="date" value={draft.end || ''} min={draft.start || undefined} onChange={event => set('end', event.target.value)} />
       </label>
      </div>
      {draft.start && <div className="plan-quick" role="group" aria-label="Snel kiezen tot wanneer">
       <button type="button" onClick={() => set('end', draft.start)}>Alleen deze dag</button>
       <button type="button" onClick={() => set('end', fridayOf(draft.start))}>T/m vrijdag</button>
       <button type="button" onClick={() => set('end', shiftDays(draft.start, 13))}>2 weken</button>
       <button type="button" onClick={() => set('end', '')}>Nog onbekend</button>
      </div>}
      <label><span>Rol op project <span className="plan-optional">(mag leeg)</span></span>
       <input type="text" maxLength={200} value={draft.role || ''} onChange={event => set('role', event.target.value)} />
      </label>
     </section>
     <section className="plan-col plan-workday" aria-label="Werkdag">
      <div className="plan-day">
       <DurationWheel label="Uren per dag" rows={3} value={draft.hoursPerDay ?? ''} onChange={value => set('hoursPerDay', value)} />
       <PauseChoice label="Pauze per dag" value={draft.pause ?? ''} onChange={value => set('pause', value)} />
      </div>
      <Travel person={person} project={project} draft={draft} set={set} />
     </section>
    </div>}
   {message && <p key={message.id} role="alert" className="plan-toast">{message.text}</p>}
   <footer className="plan-foot">
    <p className="plan-summary" aria-live="polite">{summary}</p>
    <div className="actions">
     {editing && <button type="button" className="danger" onClick={() => { if (onDelete(draft)) onClose(); }}>Verwijderen</button>}
     <button type="button" onClick={onClose}>Annuleren</button>
     {!!data.projecten.length && <button className="primary" type="submit">Opslaan</button>}
    </div>
   </footer>
   {editing && project && <p className="plan-link"><a href={`#/projecten/${project.id}`}>Project {project.name} openen</a></p>}
  </form>
 </dialog>;
}

/** Een blok in de agenda. Inzet opent het venster om te wijzigen; afwezigheid gaat naar haar eigen pagina. */
function Block({ entry, compact, onEdit }) {
 const body = <>
  <b>{entry.label}</b>
  {!compact && entry.kind !== 'actief' && <span className="agenda-kind">{KIND[entry.kind]}</span>}
  {!compact && entry.note && entry.kind !== 'afwezig' && <span className="agenda-note">{entry.note}</span>}
 </>;
 if (entry.inzetId) return <button type="button" className={`agenda-block is-${entry.kind}`} onClick={() => onEdit(entry.inzetId)}
  aria-label={`${entry.label}${entry.kind !== 'actief' ? `, ${KIND[entry.kind].toLowerCase()}` : ''} — wijzigen`}>{body}</button>;
 return <a className={`agenda-block is-${entry.kind}`} href={entry.href}>{body}</a>;
}

function WeekNav({ offset, setOffset }) {
 return <div className="period agenda-nav">
  <button type="button" onClick={() => setOffset(value => value - 1)}>Vorige week</button>
  <button type="button" onClick={() => setOffset(0)} disabled={offset === 0}>Deze week</button>
  <button type="button" onClick={() => setOffset(value => value + 1)}>Volgende week</button>
 </div>;
}

export default function Planning({ data, save }) {
 const today = isoToday();
 const narrow = useNarrow();
 const [offset, setOffset] = useState(0);
 const [plan, setPlan] = useState(null);
 const view = week(data, today, offset);
 const [picked, setPicked] = useState(view.todayIndex ?? 0);
 const day = Math.min(picked, 6);

 const addFor = (employeeId, iso) => setPlan({ record: { employeeId: employeeId || '', projectId: '', start: iso, end: iso, role: '', hoursPerDay: '8', pause: '30' } });
 // Een inzet van vóór de uren per dag begint op 8:00; je ziet het in het wiel en past het aan.
 const edit = id => { const record = data.inzet.find(item => item.id === id); if (record) setPlan({ record: { hoursPerDay: '8', pause: '30', ...record } }); };
 function store(record) {
  const exists = data.inzet.some(item => item.id === record.id);
  const next = exists ? data.inzet.map(item => item.id === record.id ? record : item) : [...data.inzet, { ...record, id: crypto.randomUUID() }];
  return save(next);
 }
 function remove(record) {
  if (!confirm(`Deze inzet verwijderen? ${record.name}`)) return false;
  return save(data.inzet.filter(item => item.id !== record.id));
 }

 const dialog = plan && <PlanDialog key={plan.record.id || `${plan.record.employeeId}-${plan.record.start}`} data={data} plan={plan} today={today}
  onClose={() => setPlan(null)} onSave={store} onDelete={remove} />;

 const header = <div className="title-row">
  <div>
   <h1>Planning</h1>
   <p className="sub agenda-when">Week {view.number} · {view.range}</p>
  </div>
  {!!view.rows.length && <div className="title-actions">
   <button type="button" className="primary" onClick={() => addFor('', view.todayIndex !== null ? today : view.start)}>Iemand inplannen</button>
  </div>}
 </div>;

 if (!view.rows.length) return <>
  {header}
  <p className="empty-line">Nog geen actieve medewerkers. <a href="#/personeel/nieuw">Medewerker toevoegen</a></p>
 </>;

 if (narrow) {
  const current = view.days[day];
  return <>
   {header}
   <WeekNav offset={offset} setOffset={setOffset} />
   <div className="agenda-days" role="tablist" aria-label="Kies een dag">
    {view.days.map((d, i) => <button key={d.iso} type="button" role="tab" aria-selected={i === day}
     className={`agenda-day${d.today ? ' is-today' : ''}${d.weekend ? ' is-weekend' : ''}`} onClick={() => setPicked(i)}
     aria-label={`${d.long} ${d.date}${d.today ? ', vandaag' : ''}`}>
     <span>{d.short}</span><b>{d.number}</b>
    </button>)}
   </div>
   <h2 className="agenda-dayname">{current.today ? `Vandaag, ${current.long}` : current.long.charAt(0).toUpperCase() + current.long.slice(1)} {current.date}</h2>
   <ul className="agenda-list" aria-label={`Wie staat waar op ${current.long}`}>
    {view.rows.map(row => {
     const entries = row.perDay[day];
     return <li key={row.id}>
      <a className="agenda-person" href={row.href}>{row.name}</a>
      {row.role && <span className="agenda-role">{row.role}</span>}
      <div className="agenda-what">
       {entries.map(entry => <Block key={entry.href + entry.kind} entry={entry} onEdit={edit} />)}
       {!entries.length && <button type="button" className="agenda-add" onClick={() => addFor(row.id, current.iso)}
        aria-label={`${row.name} inplannen op ${current.long} ${current.date}`}>
        <span className="agenda-free">{current.weekend ? 'Weekend' : 'Vrij'}</span><span className="agenda-plus">Inplannen</span>
       </button>}
      </div>
     </li>;
    })}
   </ul>
   {dialog}
  </>;
 }

 return <>
  {header}
  <WeekNav offset={offset} setOffset={setOffset} />
  <div className="table-wrap agenda-wrap" tabIndex={0}>
   <table className="agenda" aria-label={`Planning week ${view.number}`}>
    <colgroup><col className="agenda-col-person" />{view.days.map(d => <col key={d.iso} />)}</colgroup>
    <thead><tr>
     <th scope="col">Medewerker</th>
     {view.days.map(d => <th key={d.iso} scope="col" className={`${d.today ? 'is-today' : ''}${d.weekend ? ' is-weekend' : ''}`}>
      <span className="agenda-dayshort">{d.short}</span> <span className="num">{d.date}</span>
      {d.today && <span className="agenda-todaytag">vandaag</span>}
     </th>)}
    </tr></thead>
    <tbody>{view.rows.map(row => <tr key={row.id}>
     <th scope="row"><a href={row.href}>{row.name}</a>{row.role && <span className="sub">{row.role}</span>}</th>
     {row.segments.map(segment => {
      const d = view.days[segment.start];
      return <td key={segment.start} colSpan={segment.span} className={segment.weekend && !segment.entries.length ? 'is-weekend' : undefined}>
       {segment.entries.length
        ? <div className="agenda-stack">{segment.entries.map(entry => <Block key={entry.href + entry.kind} entry={entry} onEdit={edit}
         compact={segment.span === 1 && segment.entries.length > 1} />)}</div>
        : <button type="button" className="agenda-add" onClick={() => addFor(row.id, d.iso)} aria-label={`${row.name} inplannen op ${d.long} ${d.date}`}>
         {!d.weekend && <span className="agenda-free">Vrij</span>}<span className="agenda-plus">+ Inplannen</span>
        </button>}
      </td>;
     })}
    </tr>)}</tbody>
   </table>
  </div>
  <p className="agenda-legend">
   <span><i className="agenda-swatch is-actief" />Ingezet</span>
   <span><i className="agenda-swatch is-gepland" />Gepland</span>
   <span><i className="agenda-swatch is-afwezig" />Afwezig</span>
   <span><i className="agenda-swatch is-afgerond" />Afgerond</span>
   <span className="muted">Klik op een vrije dag om iemand in te plannen, of op een blok om het te wijzigen.</span>
  </p>
  {dialog}
 </>;
}
