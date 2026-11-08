import React, { useEffect, useRef, useState } from 'react';
import { isoToday, shiftDays } from './alerts';
import { week, dayInfo } from './agenda';
import { modules } from './modules';
import useNarrow from './useNarrow';
import { DurationWheel, formatHours } from './TimeWheel';

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

/** Het venster om iemand in te plannen of een inzet te wijzigen. Zo weinig velden als het kan. */
function PlanDialog({ data, plan, today, onClose, onSave, onDelete }) {
 const ref = useRef(null);
 const [draft, setDraft] = useState(plan.record);
 const [message, setMessage] = useState('');
 const editing = !!plan.record.id;
 const set = (key, value) => setDraft(current => ({ ...current, [key]: value }));
 const people = data.personeel.filter(person => person.status === 'Actief' || person.id === draft.employeeId);
 const project = data.projecten.find(p => p.id === draft.projectId);

 useEffect(() => {
  const dialog = ref.current;
  if (dialog && !dialog.open) dialog.showModal?.();
  // Staat de medewerker al vast, dan is het project de eerste vraag.
  dialog?.querySelector(plan.record.employeeId ? 'select[name="project"]' : 'select[name="employee"]')?.focus();
 }, []);

 function submit(event) {
  event.preventDefault();
  if (!draft.employeeId) { setMessage('Kies een medewerker.'); return; }
  if (!draft.projectId) { setMessage('Kies een project.'); return; }
  if (!draft.start) { setMessage('Vul in vanaf welke dag.'); return; }
  if (draft.end && draft.end < draft.start) { setMessage('"Tot en met" mag niet vóór "Van" liggen.'); return; }
  if (!(Number(draft.hoursPerDay) > 0)) { setMessage('Kies hoeveel uur per dag, meer dan 0:00.'); return; }
  const clean = { ...draft, role: (draft.role || '').trim() };
  if (clean.status !== 'Geannuleerd') clean.status = statusFor(clean, today);
  clean.name = modules.inzet.derivedName(clean, data);
  if (onSave(clean)) onClose();
 }

 return <dialog ref={ref} className="plan-dialog" aria-labelledby="plan-title" onCancel={event => { event.preventDefault(); onClose(); }}>
  <form onSubmit={submit} noValidate>
   <h2 id="plan-title">{editing ? 'Inzet wijzigen' : 'Inzet plannen'}</h2>
   {!data.projecten.length
    ? <p className="plan-empty">Er is nog geen project om iemand op te zetten. <a href="#/projecten/nieuw">Maak eerst een project aan</a>.</p>
    : <>
     <label>Medewerker
      <select name="employee" aria-label="Medewerker" value={draft.employeeId || ''} onChange={event => set('employeeId', event.target.value)}>
       <option value="" disabled hidden>Kies medewerker</option>
       {people.map(person => <option key={person.id} value={person.id}>{person.name}{person.role ? ` · ${person.role}` : ''}</option>)}
      </select>
     </label>
     <label>Project
      <select name="project" aria-label="Project" value={draft.projectId || ''} onChange={event => set('projectId', event.target.value)}>
       <option value="" disabled hidden>Kies project</option>
       {data.projecten.filter(p => !['Afgerond', 'Geannuleerd'].includes(p.status) || p.id === draft.projectId)
        .map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
     <DurationWheel label="Uren per dag" value={draft.hoursPerDay ?? ''} onChange={value => set('hoursPerDay', value)} />
     <label><span>Rol op project <span className="plan-optional">(mag leeg)</span></span>
      <input type="text" maxLength={200} value={draft.role || ''} onChange={event => set('role', event.target.value)} />
     </label>
     <p className="plan-summary" aria-live="polite">
      {draft.start ? <>Van {longDate(draft.start)} {draft.end ? <>tot en met {longDate(draft.end)}</> : 'zonder einddatum'}{Number(draft.hoursPerDay) > 0 ? <>, {formatHours(draft.hoursPerDay)} uur per dag</> : ''}.</> : ''}
     </p>
    </>}
   {message && <p role="alert" className="error">{message}</p>}
   <div className="actions">
    {!!data.projecten.length && <button className="primary" type="submit">Opslaan</button>}
    <button type="button" onClick={onClose}>Annuleren</button>
    {editing && <button type="button" className="danger plan-delete" onClick={() => { if (onDelete(draft)) onClose(); }}>Verwijderen</button>}
   </div>
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

 const addFor = (employeeId, iso) => setPlan({ record: { employeeId: employeeId || '', projectId: '', start: iso, end: iso, role: '', hoursPerDay: '8' } });
 // Een inzet van vóór de uren per dag begint op 8:00; je ziet het in het wiel en past het aan.
 const edit = id => { const record = data.inzet.find(item => item.id === id); if (record) setPlan({ record: { hoursPerDay: '8', ...record } }); };
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
