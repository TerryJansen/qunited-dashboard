import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { modules, dependentsOf, safeUrl } from './modules';
import { readData, writeData, WRITE_ERROR } from './storage';
import './styles.css';
import Reports from './Reports';
import Dashboard from './Dashboard';
import Backup from './Backup';
import Attachments, { getAttachments } from './Attachments';
import { money, formatDate, plural } from './format';

const PAGES = { rapportages: 'Rapportages', backup: 'Back-up' };

// Elf bestemmingen op één hoop is geen structuur; hier staan ze naar het soort werk.
const NAV_GROUPS = [
 ['Overzicht', ['dashboard', 'rapportages']],
 ['Werk', ['projecten', 'inzet', 'urenstaten']],
 ['Mensen', ['personeel']],
 ['Middelen', ['materiaal', 'inventaris']],
 ['Administratie', ['facturatie', 'support', 'procedures']],
 ['Beheer', ['backup']],
];
const labelOf = key => key === 'dashboard' ? 'Dashboard' : PAGES[key] || modules[key].title;

function navigation() {
 const placed = new Set(NAV_GROUPS.flatMap(([, keys]) => keys));
 const leftover = Object.keys(modules).filter(key => !placed.has(key));
 return leftover.length ? [...NAV_GROUPS, ['Overig', leftover]] : NAV_GROUPS;
}
const titleOf = (key, record, data) => modules[key].derivedName ? modules[key].derivedName(record, data) : record.name;
const sentence = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} en ${items.at(-1)}`;
const capitalise = text => text.charAt(0).toUpperCase() + text.slice(1);

function App() {
 const [initial] = useState(readData);
 const [data, setData] = useState(initial.data);
 const [error, setError] = useState(initial.error);
 const [route, setRoute] = useState(() => location.hash.slice(2) || 'dashboard');

 useEffect(() => {
  const change = () => setRoute(location.hash.slice(2) || 'dashboard');
  addEventListener('hashchange', change);
  return () => removeEventListener('hashchange', change);
 }, []);

 // Zolang de bestaande opslag niet gelezen kan worden, schrijven we niets weg.
 function write(next) {
  if (initial.error) return false;
  try { writeData(next); setData(next); setError(''); return true; }
  catch { setError(WRITE_ERROR); return false; }
 }

 const heading = PAGES[route] || modules[route]?.title || 'Dashboard';
 const vandaag = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });

 return <div className="app-shell">
  <aside className="sidebar">
   <a className="brand" href="#/dashboard"><span className="brand-mark">Q</span><span>qunited<small>Werkruimte</small></span></a>
   <nav aria-label="Hoofdnavigatie">
    {navigation().map(([group, keys]) => <React.Fragment key={group}>
     <p className="nav-group">{group}</p>
     {keys.map(key => <a key={key} href={`#/${key}`} aria-current={route === key ? 'page' : undefined}>{labelOf(key)}</a>)}
    </React.Fragment>)}
   </nav>
   <p className="local-note">Alleen opgeslagen in deze browser</p>
  </aside>
  <main className="main-area">
   <header className="topbar">
    <span className="crumb">Werkruimte <span>/</span> {heading}</span>
    <span className="topbar-date">{vandaag}</span>
   </header>
   <div className="page-content">
    {error && <p role="alert" className="error">{error}</p>}
    {route === 'dashboard' || route === '' ? <Dashboard data={data} />
     : route === 'rapportages' ? <Reports data={data} />
      : route === 'backup' ? <Backup data={data} onRestore={write} readOnly={!!initial.error} />
       : modules[route] ? <Module key={route} id={route} data={data} records={data[route]} save={records => write({ ...data, [route]: records })} />
        : <><h1>Pagina niet gevonden</h1><a href="#/dashboard">Naar dashboard</a></>}
   </div>
  </main>
 </div>;
}

function Module({ id, data, records, save }) {
 const m = modules[id];
 const [query, setQuery] = useState(''), [status, setStatus] = useState('');
 const [draft, setDraft] = useState(null), [message, setMessage] = useState(''), [deleteError, setDeleteError] = useState('');

 // Modules waarnaar deze module verwijst en die nog leeg zijn: zonder die gegevens valt er niets te kiezen.
 const missing = [...new Set(m.fields.filter(field => field.source).map(field => field.source))].filter(source => !data[source].length);
 // Velden die de kaarttitel al noemt hoeven er niet nog eens onder te staan.
 const hidden = new Set(['name', ...(m.titleFields || [])]);

 const shown = records.filter(record => (!status || record.status === status) && [
  ...Object.values(record),
  ...m.fields.filter(field => field.source).map(field => data[field.source].find(x => x.id === record[field.key])?.name || ''),
 ].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()));

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

 return <>
  {deleteError && <p role="alert" className="error">{deleteError}</p>}
  <div className="heading">
   <div><h1>{m.title}</h1><p>{m.description}</p></div>
   <button className="primary" onClick={() => { setDraft({ status: m.states[0] }); setMessage(''); }}>Toevoegen</button>
  </div>

  {!!missing.length && <div className="empty">
   <p>Voeg eerst {sentence(missing.map(source => modules[source].plural))} toe.</p>
   {missing.map((source, index) => <React.Fragment key={source}>
    {index > 0 && ' · '}
    <a href={`#/${source}`}>{capitalise(modules[source].plural)} toevoegen</a>
   </React.Fragment>)}
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

  <div className="filters">
   <label>Zoeken<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={`Zoek in ${m.title.toLowerCase()}`} /></label>
   <label>Filter op status
    <select value={status} onChange={event => setStatus(event.target.value)}>
     <option value="">Alle statussen</option>
     {m.states.map(state => <option key={state}>{state}</option>)}
    </select>
   </label>
   <button onClick={() => { setQuery(''); setStatus(''); }}>Filters wissen</button>
  </div>
  <p className="muted">{shown.length} van {plural(records.length, 'registratie', 'registraties')}</p>

  <section className="records">
   {shown.map(record => <article key={record.id} className="record">
    <div className="record-title">
     <h2>{titleOf(id, record, data)}</h2>
     <span className="badge">{record.status}</span>
    </div>
    <dl>
     {m.fields.filter(field => !hidden.has(field.key) && record[field.key]).map(field => <div key={field.key}>
      <dt>{field.label}</dt>
      <dd>{field.key === 'url'
       ? (safeUrl(record.url) ? <a href={record.url} target="_blank" rel="noopener noreferrer">Document openen</a> : 'Ongeldige documentlink')
       : field.source ? (data[field.source].find(x => x.id === record[field.key])?.name || 'Verwijderde referentie')
        : field.key === 'amount' ? money(Number(record[field.key]))
         : field.type === 'date' ? formatDate(record[field.key])
          : record[field.key]}</dd>
     </div>)}
    </dl>
    <div className="actions">
     <button onClick={() => { setDraft({ ...record }); setMessage(''); window.scrollTo(0, 0); }}>Bewerken</button>
     <button className="danger" onClick={() => remove(record)}>Verwijderen</button>
    </div>
    {id === 'personeel' && <Attachments personId={record.id} />}
   </article>)}
  </section>

  {!shown.length && <div className="empty">
   <h2>{records.length ? 'Geen resultaten' : 'Nog geen registraties'}</h2>
   <p>{records.length ? 'Pas je zoekterm of statusfilter aan.' : 'Voeg je eerste registratie toe om te beginnen.'}</p>
  </div>}
 </>;
}

createRoot(document.getElementById('root')).render(<App />);
