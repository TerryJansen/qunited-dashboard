import React, { useEffect, useState } from 'react';
import { modules, looksLikeId } from './modules';
import { DurationWheel, PauseChoice, formatHours, formatPause } from './TimeWheel';

/** Dezelfde validatie voor elke module, zodat een lijst en een detailpagina niet uit elkaar lopen. */
export function problemWith(id, record, data) {
 const m = modules[id];
 for (const field of m.fields) {
  const value = record[field.key];
  if (field.required && !value) return 'Vul alle verplichte velden in.';
  if (field.type === 'duration' && value !== '' && value !== undefined) {
   const amount = Number(value);
   if (!Number.isFinite(amount) || amount < (field.min ?? 0) || amount > (field.max ?? 24)) return `Kies bij ${field.label} een tijd groter dan 0:00, tot en met 24:00.`;
  }
  if (field.type === 'number' && value !== '' && value !== undefined) {
   const amount = Number(value);
   const min = field.min ?? -Infinity, max = field.max ?? Infinity;
   if (!Number.isFinite(amount) || amount < min || amount > max) {
    return `Vul bij ${field.label} een getal in van ${field.min ?? '0'} tot ${field.max ?? 'de toegestane waarde'}.`;
   }
  }
  // Tekst van vóór dit veld een keuzelijst werd blijft toegestaan; een id dat niet bestaat niet.
  if (field.source && value && looksLikeId(value) && !data[field.source].some(option => option.id === value)) {
   return `Kies een bestaande ${modules[field.source].singular}.`;
  }
 }
 if (m.period && record[m.period.start] && record[m.period.end] && record[m.period.end] < record[m.period.start]) {
  return 'Einddatum mag niet vóór de startdatum liggen.';
 }
 return m.validate ? m.validate(record, data) : '';
}

const TIME_TYPES = ['duration', 'pause'];

/** Het invoerscherm van één registratie. Geeft de schone registratie terug aan `onSave`. */
export default function RecordForm({ id, data, draft, setDraft, onSave, onCancel }) {
 const m = modules[id];
 const [message, setMessage] = useState('');
 // Pas je iets aan, dan is de oude melding niet meer van toepassing.
 useEffect(() => { setMessage(''); }, [draft]);

 function submit(event) {
  event.preventDefault();
  const clean = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]));
  const problem = problemWith(id, clean, data);
  if (problem) { setMessage(problem); return; }
  if (m.derivedName) clean.name = m.derivedName(clean, data);
  if (onSave(clean)) setMessage('');
 }

 return <form onSubmit={submit} className="editor" noValidate>
  <h2>{draft.id ? 'Registratie bewerken' : 'Nieuwe registratie'}</h2>
  <p className="muted">Velden met * zijn verplicht.</p>
  <div className="form-grid">
   {m.fields.filter(field => !TIME_TYPES.includes(field.type)).map(field => <label key={field.key}>
    {field.label}{field.required && <span aria-hidden="true"> *</span>}
    {field.type === 'reference'
     ? <select aria-label={field.label} required={field.required} value={draft[field.key] || ''} onChange={event => setDraft({ ...draft, [field.key]: event.target.value })}>
      {/* De tekst "Kies …" staat in het gesloten veld, maar niet bovenaan de lijst die openklapt. */}
      <option value="" disabled hidden>Kies {field.label.toLowerCase()}</option>
      {data[field.source].map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
      {!field.required && draft[field.key] && <option value="">Geen {field.label.toLowerCase()}</option>}
      {draft[field.key] && !looksLikeId(draft[field.key]) && !data[field.source].some(option => option.id === draft[field.key])
       && <option value={draft[field.key]}>{draft[field.key]} (eerder ingetypt)</option>}
     </select>
     : field.type === 'textarea'
      ? <textarea aria-label={field.label} value={draft[field.key] || ''} onChange={event => setDraft({ ...draft, [field.key]: event.target.value })} />
      : field.type === 'select'
       ? <select aria-label={field.label} value={draft[field.key] || field.options[0]} onChange={event => setDraft({ ...draft, [field.key]: event.target.value })}>
        {field.options.map(option => <option key={option}>{option}</option>)}
       </select>
       : <input aria-label={field.label} type={field.type} required={field.required} min={field.min} max={field.max} step={field.step} maxLength={1000}
        value={draft[field.key] ?? ''} onChange={event => setDraft({ ...draft, [field.key]: event.target.value })} />}
    {field.hint && <span className="field-hint">{field.hint}</span>}
   </label>)}
   <label>Status
    <select aria-label="Status" value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value })}>
     {m.states.map(state => <option key={state}>{state}</option>)}
    </select>
   </label>
  </div>
  {/* Tijd en pauze samen in één rustige strook onder de gewone velden, in plaats van verspreid over het raster. */}
  {m.fields.some(field => TIME_TYPES.includes(field.type)) && <div className="form-time">
   {m.fields.filter(field => field.type === 'duration').map(field =>
    <DurationWheel key={field.key} label={field.label} required={field.required} value={draft[field.key] ?? ''} onChange={value => setDraft({ ...draft, [field.key]: value })} />)}
   <div className="form-time-choices">
    {m.fields.filter(field => field.type === 'pause').map(field =>
     <PauseChoice key={field.key} name={field.key} options={field.options} label={field.label} required={field.required} value={draft[field.key] ?? ''} onChange={value => setDraft({ ...draft, [field.key]: value })} />)}
    <p className="form-time-summary" aria-live="polite">{m.fields.filter(field => TIME_TYPES.includes(field.type) && draft[field.key] !== undefined && draft[field.key] !== '')
     .map(field => field.type === 'duration' ? `${formatHours(draft[field.key])} uur` : `${formatPause(draft[field.key]).toLowerCase()} ${field.label.toLowerCase()}`).join(', ')}</p>
   </div>
  </div>}
  {message && <p role="alert" className="error">{message}</p>}
  <div className="actions">
   <button className="primary" type="submit">Opslaan</button>
   <button type="button" onClick={() => { setMessage(''); onCancel(); }}>Annuleren</button>
  </div>
 </form>;
}
