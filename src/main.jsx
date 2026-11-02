import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { modules, dependentsOf, safeUrl } from './modules';
import { readData, writeData, WRITE_ERROR } from './storage';
import './app.css';
import './styles.css';
import Reports from './Reports';
import Dashboard from './Dashboard';
import Backup from './Backup';
import Attachments, { getAttachments } from './Attachments';
import { money, formatDate, plural, number } from './format';
import { isoToday } from './alerts';

const PAGES = { rapportages: 'Rapportages', backup: 'Back-up' };
const titleOf = (key, record, data) => modules[key].derivedName ? modules[key].derivedName(record, data) : record.name;
const sentence = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} en ${items.at(-1)}`;
const capitalise = text => text.charAt(0).toUpperCase() + text.slice(1);
const MAX_COLUMNS = 4;

// Elf bestemmingen op één hoop is geen structuur; hier staan ze naar het soort werk.
const NAV_GROUPS = [
 ['Overzicht', ['dashboard', 'rapportages']],
 ['Werk', ['projecten', 'inzet', 'urenstaten']],
 ['Mensen', ['personeel']],
 ['Middelen', ['materiaal', 'inventaris']],
 ['Administratie', ['facturatie', 'support', 'procedures']],
];
const labelOf = key => key === 'dashboard' ? 'Dashboard' : PAGES[key] || modules[key].title;

function navigation() {
 const placed = new Set(NAV_GROUPS.flatMap(([, keys]) => keys));
 const leftover = Object.keys(modules).filter(key => !placed.has(key));
 return leftover.length ? [...NAV_GROUPS, ['Overig', leftover]] : NAV_GROUPS;
}

/** Kleur alleen waar een beslissing nodig is; de rest van de statussen blijft neutraal. */
function statusTone(id, record, iso) {
 if (['Afgerond', 'Betaald', 'Goedgekeurd', 'Opgelost'].includes(record.status)) return 'pos';
 if (id === 'facturatie' && record.status === 'Open' && record.due && record.due < iso) return 'neg';
 if (['Nodig', 'Onderhoud'].includes(record.status)) return 'warn';
 return '';
}

function App() {
 const [initial] = useState(readData);
 const [data, setData] = useState(initial.data);
 const [error, setError] = useState(initial.error);
 const [hash, setHash] = useState(() => location.hash.slice(2));
 const [menuOpen, setMenuOpen] = useState(false);

 useEffect(() => {
  const change = () => { setHash(location.hash.slice(2)); setMenuOpen(false); };
  addEventListener('hashchange', change);
  return () => removeEventListener('hashchange', change);
 }, []);

 const [route, action] = hash.split('/');
 const page = route || 'dashboard';

 // Zolang de bestaande opslag niet gelezen kan worden, schrijven we niets weg.
 function write(next) {
  if (initial.error) return false;
  try { writeData(next); setData(next); setError(''); return true; }
  catch { setError(WRITE_ERROR); return false; }
 }

 const heading = PAGES[page] || modules[page]?.title || 'Dashboard';
 const vandaag = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });

 return <div className="app-shell">
  <aside className={`sidebar${menuOpen ? ' open' : ''}`} id="hoofdmenu">
   <a className="brand" href="#/dashboard">
    <span className="brand-mark" aria-hidden="true">Q</span>
    <span className="brand-name">Qunited</span>
   </a>
   <nav aria-label="Hoofdnavigatie">
    {navigation().map(([group, keys]) => <React.Fragment key={group}>
     <p className="nav-group">{group}</p>
     {keys.map(key => <a key={key} href={`#/${key}`} aria-current={page === key ? 'page' : undefined}>{labelOf(key)}</a>)}
    </React.Fragment>)}
   </nav>
   <div className="bottom">
    <nav aria-label="Beheer">
     <a href="#/backup" aria-current={page === 'backup' ? 'page' : undefined}>Back-up</a>
    </nav>
   </div>
  </aside>

  <div className="main-area">
   <header className="topbar">
    <span className="scope">
     <button className="menu-toggle" aria-expanded={menuOpen} aria-controls="hoofdmenu" onClick={() => setMenuOpen(open => !open)}>Menu</button>
     <b>Werkruimte</b>
     <span className="long">alleen opgeslagen in deze browser</span>
    </span>
    <span>{vandaag}</span>
   </header>
   <div className="sheet">
    <div className="canvas">
     {error && <p role="alert" className="error">{error}</p>}
     {page === 'dashboard' ? <Dashboard data={data} />
      : page === 'rapportages' ? <Reports data={data} />
       : page === 'backup' ? <Backup data={data} onRestore={write} readOnly={!!initial.error} />
        : modules[page] ? <Module key={page} id={page} data={data} records={data[page]} openNew={action === 'nieuw'} save={records => write({ ...data, [page]: records })} />
         : <><h1>Pagina niet gevonden</h1><p className="muted"><a href="#/dashboard">Naar dashboard</a></p></>}
    </div>
   </div>
  </div>
 </div>;
}

function Module({ id, data, records, save, openNew }) {
 const m = modules[id];
 const iso = isoToday();
 const [query, setQuery] = useState(''), [status, setStatus] = useState('');
 const [draft, setDraft] = useState(() => openNew ? { status: m.states[0] } : null);
 const [message, setMessage] = useState(''), [deleteError, setDeleteError] = useState('');
 const [openFiles, setOpenFiles] = useState('');

 // Modules waarnaar deze module verwijst en die nog leeg zijn: zonder die gegevens valt er niets te kiezen.
 const missing = [...new Set(m.fields.filter(field => field.source).map(field => field.source))].filter(source => !data[source].length);
 // Velden die de rijtitel al noemt horen niet nog eens in een kolom.
 const hidden = new Set(['name', ...(m.titleFields || []), m.subField].filter(Boolean));

 const shown = records.filter(record => (!status || record.status === status) && [
  ...Object.values(record),
  ...m.fields.filter(field => field.source).map(field => data[field.source].find(x => x.id === record[field.key])?.name || ''),
 ].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()));

 // Een kolom die in elke zichtbare rij leeg is, valt weg.
 const columns = m.fields
  .filter(field => !hidden.has(field.key) && field.type !== 'textarea' && shown.some(record => record[field.key]))
  .slice(0, MAX_COLUMNS);

 function problemWith(record) {
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

 function submit(event) {
  event.preventDefault();
  const clean = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]));
  const problem = problemWith(clean);
  if (problem) { setMessage(problem); return; }
  if (m.derivedName) clean.name = m.derivedName(clean, data);
  const next = draft.id ? records.map(record => record.id === draft.id ? clean : record) : [...records, { ...clean, id: crypto.randomUUID() }];
  if (save(next)) { setDraft(null); setMessage(''); }
 }

 async function remove(record) {
  if (!confirm(`“${titleOf(id, record, data)}” verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return;
  const blocking = [...new Set(dependentsOf(id)
   .filter(dependent => data[dependent.module].some(other => other[dependent.field] === record.id))
   .map(dependent => dependent.title))];
  if (blocking.length) {
   setDeleteError(`Verwijder of wijzig eerst de gekoppelde registraties bij ${sentence(blocking)}.`);
   return;
  }
  if (id === 'personeel') {
   try {
    if ((await getAttachments(record.id)).length) {
     setDeleteError('Verwijder eerst de cv’s en certificaten bij deze medewerker.');
     return;
    }
   } catch {
    setDeleteError('Bestanden kunnen niet worden gecontroleerd. Medewerker is niet verwijderd.');
    return;
   }
  }
  if (save(records.filter(other => other.id !== record.id))) {
   setDeleteError('');
   if (draft?.id === record.id) setDraft(null);
  }
 }

 function cell(field, record) {
  const value = record[field.key];
  if (field.key === 'url') return safeUrl(value) ? <a href={value} target="_blank" rel="noopener noreferrer">Document openen</a> : 'Ongeldige documentlink';
  if (field.source) return data[field.source].find(x => x.id === value)?.name || 'Verwijderde referentie';
  if (field.key === 'amount') return money(Number(value));
  if (field.type === 'date') return formatDate(value);
  if (field.type === 'number') return number(Number(value));
  return value;
 }
 const numeric = field => field.type === 'number' || field.type === 'date' || field.key === 'amount';

 return <>
  {deleteError && <p role="alert" className="error">{deleteError}</p>}
  <div className="title-row">
   <div>
    <h1>{m.title}</h1>
    <p className="sub">{m.description}</p>
   </div>
   <div className="title-actions">
    <button className="primary" onClick={() => { setDraft({ status: m.states[0] }); setMessage(''); }}>Toevoegen</button>
   </div>
  </div>

  {!!missing.length && <div className="empty">
   <p>Voeg eerst {sentence(missing.map(source => modules[source].plural))} toe.</p>
   <p>{missing.map((source, index) => <React.Fragment key={source}>
    {index > 0 && ' · '}
    <a href={`#/${source}`}>{capitalise(modules[source].plural)} toevoegen</a>
   </React.Fragment>)}</p>
  </div>}

  {draft && <form onSubmit={submit} className="editor">
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
    <button type="button" onClick={() => setDraft(null)}>Annuleren</button>
   </div>
  </form>}

  <div className="tabs" role="tablist" aria-label="Filter op status">
   <button role="tab" aria-selected={status === ''} onClick={() => setStatus('')}>Alle {records.length}</button>
   {m.states.map(state => <button key={state} role="tab" aria-selected={status === state} onClick={() => setStatus(state)}>
    {state} {records.filter(record => record.status === state).length}
   </button>)}
  </div>

  <div className="toolbar">
   <input type="search" aria-label="Zoeken" value={query} onChange={event => setQuery(event.target.value)} placeholder={`Zoek in ${m.title.toLowerCase()}`} />
   <button onClick={() => { setQuery(''); setStatus(''); }}>Filters wissen</button>
   <span className="count">{shown.length} van {plural(records.length, 'registratie', 'registraties')}</span>
  </div>

  {shown.length
   ? <div className="table-wrap"><table aria-label={m.title}>
    <thead><tr>
     <th>{m.identityLabel || 'Naam'}</th>
     {columns.map(field => <th key={field.key} className={numeric(field) ? 'n' : undefined}>{field.label}</th>)}
     <th>Status</th>
     <th className="n">Actie</th>
    </tr></thead>
    <tbody>
     {shown.map(record => <React.Fragment key={record.id}>
      <tr className={openFiles === record.id ? 'expanded' : undefined}>
       <td className="identity">
        {titleOf(id, record, data)}
        {m.subField && record[m.subField] && <span className="sub">{record[m.subField]}</span>}
       </td>
       {columns.map(field => <td key={field.key} className={numeric(field) ? 'n num' : undefined}>{cell(field, record)}</td>)}
       <td><span className={`pill ${statusTone(id, record, iso)}`}>{record.status}</span></td>
       <td>
        <div className="row-actions">
         {id === 'personeel' && <button className="text-action" onClick={() => setOpenFiles(open => open === record.id ? '' : record.id)}>
          {openFiles === record.id ? 'Bestanden sluiten' : 'Bestanden'}
         </button>}
         <button className="text-action" onClick={() => { setDraft({ ...record }); setMessage(''); scrollTo(0, 0); }}>Bewerken</button>
         <button className="text-action danger" onClick={() => remove(record)}>Verwijderen</button>
        </div>
       </td>
      </tr>
      {id === 'personeel' && openFiles === record.id && <tr className="detail-row">
       <td colSpan={columns.length + 3}><Attachments personId={record.id} /></td>
      </tr>}
     </React.Fragment>)}
    </tbody>
   </table></div>
   : <div className="empty">
    <p>{records.length ? 'Geen resultaten voor deze zoekterm of status.' : 'Nog geen registraties.'}</p>
    <p>{records.length ? 'Pas je zoekterm of statusfilter aan.' : 'Voeg je eerste registratie toe om te beginnen.'}</p>
   </div>}
 </>;
}

createRoot(document.getElementById('root')).render(<App />);
