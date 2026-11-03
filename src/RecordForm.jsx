import React, { useState } from 'react';
import { modules } from './modules';

/** Dezelfde validatie voor elke module, zodat een lijst en een detailpagina niet uit elkaar lopen. */
export function problemWith(id, record, data) {
 const m = modules[id];
 for (const field of m.fields) {
  const value = record[field.key];
  if (field.required && !value) return 'Vul alle verplichte velden in.';
  if (field.type === 'number' && value !== '' && value !== undefined) {
   const amount = Number(value);
   const min = field.min ?? -Infinity, max = field.max ?? Infinity;
   if (!Number.isFinite(amount) || amount < min || amount > max) {
    return `Vul bij ${field.label} een getal in van ${field.min ?? '0'} tot ${field.max ?? 'de toegestane waarde'}.`;
   }
  }
  if (field.source && value && !data[field.source].some(option => option.id === value)) {
   return `Kies een bestaande ${modules[field.source].singular}.`;
  }
 }
 if (m.period && record[m.period.start] && record[m.period.end] && record[m.period.end] < record[m.period.start]) {
  return 'Einddatum mag niet vóór de startdatum liggen.';
 }
 return m.validate ? m.validate(record, data) : '';
}

/** Het invoerscherm van één registratie. Geeft de schone registratie terug aan `onSave`. */
export default function RecordForm({ id, data, draft, setDraft, onSave, onCancel }) {
 const m = modules[id];
 const [message, setMessage] = useState('');

 function submit(event) {
  event.preventDefault();
  const clean = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]));
  const problem = problemWith(id, clean, data);
  if (problem) { setMessage(problem); return; }
  if (m.derivedName) clean.name = m.derivedName(clean, data);
  if (onSave(clean)) setMessage('');
 }

 return <form onSubmit={submit} className="editor">
  <h2>{draft.id ? 'Registratie bewerken' : 'Nieuwe registratie'}</h2>
  <p className="muted">Velden met * zijn verplicht.</p>
  <div className="form-grid">
   {m.fields.map(field => <label key={field.key}>
    {field.label}{field.required && <span aria-hidden="true"> *</span>}
    {field.type === 'reference'
     ? <select aria-label={field.label} required={field.required} value={draft[field.key] || ''} onChange={event => setDraft({ ...draft, [field.key]: event.target.value })}>
      <option value="">Kies {field.label.toLowerCase()}</option>
      {data[field.source].map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
     </select>
     : field.type === 'textarea'
      ? <textarea aria-label={field.label} value={draft[field.key] || ''} onChange={event => setDraft({ ...draft, [field.key]: event.target.value })} />
      : field.type === 'select'
       ? <select aria-label={field.label} value={draft[field.key] || field.options[0]} onChange={event => setDraft({ ...draft, [field.key]: event.target.value })}>
        {field.options.map(option => <option key={option}>{option}</option>)}
       </select>
       : <input aria-label={field.label} type={field.type} required={field.required} min={field.min} max={field.max} step={field.step} maxLength={1000}
        value={draft[field.key] ?? ''} onChange={event => setDraft({ ...draft, [field.key]: event.target.value })} />}
   </label>)}
   <label>Status
    <select aria-label="Status" value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value })}>
     {m.states.map(state => <option key={state}>{state}</option>)}
    </select>
   </label>
  </div>
  {message && <p role="alert" className="error">{message}</p>}
  <div className="actions">
   <button className="primary" type="submit">Opslaan</button>
   <button type="button" onClick={() => { setMessage(''); onCancel(); }}>Annuleren</button>
  </div>
 </form>;
}
