import React, { useState } from 'react';
import { modules, dependentsOf, safeUrl } from './modules';
import { money, number, formatDate } from './format';
import { isoToday } from './alerts';
import { staffing } from './cover';
import RecordForm from './RecordForm';
import Attachments from './Attachments';

const titleOf = (key, record, data) => modules[key].derivedName ? modules[key].derivedName(record, data) : record.name;
const sentence = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} en ${items.at(-1)}`;

function value(field, record, data) {
 const raw = record[field.key];
 if (raw === '' || raw === undefined) return <span className="muted">—</span>;
 if (field.key === 'url') return safeUrl(raw) ? <a href={raw} target="_blank" rel="noopener noreferrer">Document openen</a> : 'Ongeldige documentlink';
 if (field.source) {
  const target = data[field.source].find(item => item.id === raw);
  return target ? <a href={`#/${field.source}/${target.id}`}>{target.name}</a> : 'Verwijderde referentie';
 }
 if (field.key === 'amount') return <span className="num">{money(Number(raw))}</span>;
 if (field.type === 'date') return <span className="num">{formatDate(raw)}</span>;
 if (field.type === 'number') return <span className="num">{number(Number(raw))}</span>;
 return raw;
}

/** Eén registratie in het geheel: alle velden, plus alles wat ernaar verwijst. */
export default function Detail({ id, recordId, data, save }) {
 const m = modules[id];
 const iso = isoToday();
 const record = data[id].find(item => item.id === recordId);
 const [draft, setDraft] = useState(null);
 const [deleteError, setDeleteError] = useState('');

 if (!record) return <>
  <div className="title-row"><div><h1>Niet gevonden</h1>
   <p className="sub">Deze registratie bestaat niet meer. Mogelijk is hij verwijderd.</p></div></div>
  <p className="empty-line"><a href={`#/${id}`}>Terug naar {m.title}</a></p>
 </>;

 // Alles wat naar deze registratie verwijst, per module gebundeld.
 const related = dependentsOf(id).map(dependent => ({
  ...dependent,
  rows: data[dependent.module].filter(other => other[dependent.field] === record.id),
 })).filter(group => group.rows.length);

 function remove() {
  if (!confirm(`“${titleOf(id, record, data)}” verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return;
  const blocking = [...new Set(related.map(group => group.title))];
  if (blocking.length) {
   setDeleteError(`Verwijder of wijzig eerst de gekoppelde registraties bij ${sentence(blocking)}.`);
   return;
  }
  if (save(data[id].filter(other => other.id !== record.id))) location.hash = `#/${id}`;
 }

 const fields = m.fields.filter(field => field.key !== 'name');
 const cover = id === 'projecten' ? staffing(data, record, iso) : null;

 return <>
  <p className="crumbs"><a href={`#/${id}`}>{m.title}</a> <span aria-hidden="true">/</span> <span>{titleOf(id, record, data)}</span></p>

  {deleteError && <p role="alert" className="error">{deleteError}</p>}

  <div className="title-row">
   <div>
    <h1>{titleOf(id, record, data)}</h1>
    <p className="sub">
     <span className="pill">{record.status}</span>
     {m.subField && record[m.subField] ? <> {record[m.subField]}</> : ''}
    </p>
   </div>
   <div className="title-actions">
    <button type="button" onClick={remove} className="danger">Verwijderen</button>
    <button type="button" className="primary" onClick={() => setDraft({ ...record })}>Bewerken</button>
   </div>
  </div>

  {draft && <RecordForm
   id={id} data={data} draft={draft} setDraft={setDraft}
   onCancel={() => setDraft(null)}
   onSave={clean => {
    const saved = save(data[id].map(other => other.id === clean.id ? clean : other));
    if (saved) setDraft(null);
    return saved;
   }} />}

  <section className="panel">
   <header><h2>Gegevens</h2></header>
   <dl className="detail-grid">
    {fields.map(field => <div key={field.key}>
     <dt>{field.label}</dt>
     <dd>{value(field, record, data)}</dd>
    </div>)}
    {cover && <div>
     <dt>Ingevulde bezetting</dt>
     <dd className={cover.short ? 'shortfall' : 'num'}>
      {number(cover.filled)} / {cover.needed === null ? '—' : number(cover.needed)}
      {cover.short ? ` · ${cover.short} tekort` : ''}
     </dd>
    </div>}
   </dl>
  </section>

  {related.map(group => <section className="panel" key={`${group.module}-${group.field}`}>
   <header>
    <h2>{group.title}</h2>
    <span className="meta">{group.rows.length}</span>
   </header>
   <div className="table-wrap" tabIndex={0}>
    <table aria-label={`${group.title} bij ${titleOf(id, record, data)}`}>
     <thead><tr>
      <th>{modules[group.module].identityLabel || 'Naam'}</th>
      {relatedColumns(group.module, group.rows).map(field => <th key={field.key} className={numeric(field) ? 'n' : undefined}>{field.label}</th>)}
      <th>Status</th>
     </tr></thead>
     <tbody>{group.rows.map(row => <tr key={row.id}>
      <td className="identity"><a href={`#/${group.module}/${row.id}`}>{titleOf(group.module, row, data)}</a></td>
      {relatedColumns(group.module, group.rows).map(field => <td key={field.key} className={numeric(field) ? 'n num' : undefined}>{value(field, row, data)}</td>)}
      <td><span className="pill">{row.status}</span></td>
     </tr>)}</tbody>
    </table>
   </div>
  </section>)}

  {id === 'personeel' && <section className="panel">
   <header><h2>Cv &amp; certificaten</h2></header>
   <Attachments personId={record.id} />
  </section>}
 </>;
}

const numeric = field => field.type === 'number' || field.type === 'date' || field.key === 'amount';

// Kolommen die bij deze rijen iets te melden hebben; de titel noemt de rest al.
function relatedColumns(module, rows) {
 const m = modules[module];
 const hidden = new Set(['name', ...(m.titleFields || [])]);
 return m.fields
  .filter(field => !hidden.has(field.key) && field.type !== 'textarea' && rows.some(row => row[field.key]))
  .slice(0, 4);
}
