import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { modules, dependentsOf, safeUrl, resolveReference, subText } from './modules';
import { readData, writeData, WRITE_ERROR } from './storage';
import './app.css';
import './styles.css';
import Reports from './Reports';
import Dashboard from './Dashboard';
import Backup from './Backup';
import Assistant from './Assistant';
import Planning from './Planning';
import Login from './Login';
import Logo from './Logo';
import { signedIn, signOut } from './session';
import Attachments, { getAttachments } from './Attachments';
import Detail from './Detail';
import RecordForm from './RecordForm';
import { money, formatDate, plural, number } from './format';
import { formatHours, formatPause } from './TimeWheel';
import { isoToday } from './alerts';
import { requestPersistence } from './persist';

const PAGES = { rapportages: 'Rapportages', planning: 'Planning', backup: 'Back-up', hulp: 'Hulp' };
const titleOf = (key, record, data) => modules[key].derivedName ? modules[key].derivedName(record, data) : record.name;
const sentence = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} en ${items.at(-1)}`;
const capitalise = text => text.charAt(0).toUpperCase() + text.slice(1);
const MAX_COLUMNS = 4;

// Elf bestemmingen op één hoop is geen structuur; hier staan ze naar het soort werk.
const NAV_GROUPS = [
 ['Overzicht', ['dashboard', 'rapportages']],
 ['Werk', ['projecten', 'planning', 'urenstaten']],
 ['Mensen', ['personeel', 'afwezigheid']],
 ['Middelen', ['materiaal', 'inventaris']],
 ['Administratie', ['facturatie', 'support', 'procedures']],
];
const labelOf = key => key === 'dashboard' ? 'Dashboard' : PAGES[key] || modules[key].title;

function navigation() {
 const placed = new Set(NAV_GROUPS.flatMap(([, keys]) => keys));
 const leftover = Object.keys(modules).filter(key => !placed.has(key) && !modules[key].hidden);
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
 const [inside, setInside] = useState(signedIn);

 useEffect(() => {
  const change = () => { setHash(location.hash.slice(2)); setMenuOpen(false); };
  addEventListener('hashchange', change);
  return () => removeEventListener('hashchange', change);
 }, []);

 const [path, search] = hash.split('?');
 const [route, action] = path.split('/');
 const params = new URLSearchParams(search || '');
 const page = route || 'dashboard';

 // Zolang de bestaande opslag niet gelezen kan worden, schrijven we niets weg.
 function write(next) {
  if (initial.error) return false;
  try { writeData(next); setData(next); setError(''); }
  catch { setError(WRITE_ERROR); return false; }
  // Het moment waarop er iets te verliezen valt: vraag de browser het te bewaren.
  requestPersistence();
  return true;
 }

 if (!inside) return <Login onEnter={() => setInside(true)} />;

 const heading = PAGES[page] || modules[page]?.title || 'Dashboard';
 const vandaag = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });

 return <div className="app-shell">
  <aside className={`sidebar${menuOpen ? ' open' : ''}`} id="hoofdmenu">
   <a className="brand" href="#/dashboard" aria-label="Qunited, naar het dashboard">
    <Logo className="brand-logo" title="Qunited" />
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
     <a href="#/hulp" aria-current={page === 'hulp' ? 'page' : undefined}>Hulp</a>
    </nav>
    <button type="button" className="sign-out" onClick={() => { signOut(); setInside(false); }}>Uitloggen</button>
   </div>
  </aside>

  <div className="main-area">
   <header className="topbar">
    <span className="scope">
     <button className="menu-toggle" aria-expanded={menuOpen} aria-controls="hoofdmenu" onClick={() => setMenuOpen(open => !open)}>Menu</button>
     <a className="topbar-logo" href="#/dashboard" aria-label="Qunited, naar het dashboard"><Logo className="brand-logo" /></a>
     <b className="scope-name">Werkruimte</b>
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
       : page === 'hulp' ? <Assistant data={data} />
       : page === 'planning' ? <Planning data={data} save={records => write({ ...data, inzet: records })} />
        : modules[page] && action && action !== 'nieuw'
         ? <Detail key={`${page}/${action}`} id={page} recordId={action} data={data} save={records => write({ ...data, [page]: records })} />
         : modules[page] ? <Module key={`${page}?${search || ''}`} id={page} data={data} records={data[page]}
          openNew={action === 'nieuw'} fromStatus={params.get('status') || ''} fromQuery={params.get('zoek') || ''}
          save={records => write({ ...data, [page]: records })} />
         : <><h1>Pagina niet gevonden</h1><p className="muted"><a href="#/dashboard">Naar dashboard</a></p></>}
    </div>
   </div>
  </div>
 </div>;
}

function Module({ id, data, records, save, openNew, fromStatus = '', fromQuery = '' }) {
 const m = modules[id];
 const iso = isoToday();
 const [query, setQuery] = useState(fromQuery);
 const [status, setStatus] = useState(m.states.includes(fromStatus) ? fromStatus : '');
 const blank = () => ({ status: m.states[0], ...(m.defaults || {}) });
 const [draft, setDraft] = useState(() => openNew ? blank() : null);
 const [deleteError, setDeleteError] = useState('');
 const [openFiles, setOpenFiles] = useState('');

 // Modules waarnaar deze module verwijst en die nog leeg zijn: zonder die gegevens valt er niets te kiezen.
 const missing = [...new Set(m.fields.filter(field => field.source && field.required).map(field => field.source))].filter(source => !data[source].length);
 // Velden die de rijtitel al noemt horen niet nog eens in een kolom.
 const hidden = new Set(['name', ...(m.titleFields || []), m.subField].filter(Boolean));

 const shown = records.filter(record => (!status || record.status === status) && [
  ...Object.values(record),
  ...m.fields.filter(field => field.source).map(field => data[field.source].find(x => x.id === record[field.key])?.name || ''),
 ].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()));

 // Een kolom die in elke zichtbare rij leeg is, valt weg.
 const columns = m.fields
  .filter(field => !hidden.has(field.key) && field.type !== 'textarea' && shown.some(record => record[field.key]))
  .slice(0, m.maxColumns || MAX_COLUMNS);

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
  if (field.source) {
   const link = resolveReference(data, field.source, value);
   if (link.kind === 'record') return <a href={`#/${field.source}/${link.record.id}`}>{link.record.name}</a>;
   if (link.kind === 'tekst') return link.text;
   return 'Verwijderde referentie';
  }
  if (field.key === 'amount') return money(Number(value));
  if (field.type === 'date') return formatDate(value);
  if (field.type === 'number') return number(Number(value));
  if (field.type === 'duration') return formatHours(value);
  if (field.type === 'pause') return formatPause(value);
  return value;
 }
 const numeric = field => ['number', 'date', 'duration', 'pause'].includes(field.type) || field.key === 'amount';

 return <>
  {deleteError && <p role="alert" className="error">{deleteError}</p>}
  <div className="title-row">
   <div>
    <h1>{m.title}</h1>
    <p className="sub">{m.description}</p>
   </div>
   <div className="title-actions">
    <button className="primary" onClick={() => setDraft(blank())}>Toevoegen</button>
   </div>
  </div>

  {!!missing.length && <p className="empty-line">
   Voeg eerst {sentence(missing.map(source => modules[source].plural))} toe.{' '}
   {missing.map((source, index) => <React.Fragment key={source}>
    {index > 0 && ' · '}
    <a href={`#/${source}`}>{capitalise(modules[source].plural)} toevoegen</a>
   </React.Fragment>)}
  </p>}

  {draft && <RecordForm
   id={id} data={data} draft={draft} setDraft={setDraft}
   onCancel={() => setDraft(null)}
   onSave={clean => {
    const next = draft.id ? records.map(record => record.id === draft.id ? clean : record) : [...records, { ...clean, id: crypto.randomUUID() }];
    const saved = save(next);
    if (saved) setDraft(null);
    return saved;
   }} />}

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
        <a href={`#/${id}/${record.id}`}>{titleOf(id, record, data)}</a>
        {subText(id, record, data) && <span className="sub">{subText(id, record, data)}</span>}
       </td>
       {columns.map(field => <td key={field.key} className={numeric(field) ? 'n num' : undefined}>{cell(field, record)}</td>)}
       <td><span className={`pill ${statusTone(id, record, iso)}`}>{record.status}</span></td>
       <td>
        <div className="row-actions">
         {id === 'personeel' && <button className="text-action" onClick={() => setOpenFiles(open => open === record.id ? '' : record.id)}>
          {openFiles === record.id ? 'Bestanden sluiten' : 'Bestanden'}
         </button>}
         <button className="text-action" onClick={() => { setDraft({ ...record }); scrollTo(0, 0); }}>Bewerken</button>
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
   : records.length
    ? <p className="empty-line">Geen resultaten voor deze zoekterm of status. <button type="button" className="text-action" onClick={() => { setQuery(''); setStatus(''); }}>Wis de filters</button></p>
    : <p className="empty-line">Nog geen registraties. <button type="button" className="text-action" onClick={() => setDraft(blank())}>Voeg de eerste toe</button></p>}
 </>;
}

createRoot(document.getElementById('root')).render(<App />);
