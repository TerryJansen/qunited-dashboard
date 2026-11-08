import React, { useEffect, useState } from 'react';
import { getAllAttachments, getProjectDocuments, getAttachment, putAttachment, deleteAttachment,
 FILE_TYPES, PROJECT_KINDS, PROJECT_EXTENSIONS, MAX_PROJECT_BYTES } from './files';
import { isoToday } from './alerts';
import { formatDate, plural } from './format';
import { requestPersistence } from './persist';
import { StorageNotice } from './StorageNotice';
import useNarrow from './useNarrow';

const size = bytes => bytes >= 1024 * 1024
 ? `${new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024)} MB`
 : `${new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 }).format(Math.max(1, bytes / 1024))} KB`;
const ACCEPT = PROJECT_EXTENSIONS.map(extension => `.${extension}`).join(',');
const ACTIVE = ['Planning', 'In uitvoering'];

/** De documenten van één project: toevoegen, openen, downloaden, verwijderen. */
export function DocumentShelf({ project, onChange }) {
 const [files, setFiles] = useState([]);
 const [error, setError] = useState('');
 const [saved, setSaved] = useState('');
 const [busy, setBusy] = useState(false);
 const [kind, setKind] = useState(PROJECT_KINDS[0]);

 async function reload() {
  const list = await getProjectDocuments(project.id);
  list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.name.localeCompare(b.name, 'nl'));
  setFiles(list);
  onChange?.();
 }
 useEffect(() => {
  setSaved(''); setError('');
  reload().catch(() => setError('De documenten konden niet worden gelezen. Browseropslag is niet beschikbaar.'));
 }, [project.id]);

 async function add(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const fields = new FormData(form);
  const file = fields.get('file');
  const extension = file?.name?.split('.').pop().toLowerCase();
  setSaved('');
  if (!file?.size) { setError('Kies eerst een bestand.'); return; }
  if (!PROJECT_EXTENSIONS.includes(extension)) { setError('Dit soort bestand kan niet. Kies een PDF, Word, Excel, JPG of PNG.'); return; }
  if (file.size > MAX_PROJECT_BYTES) { setError('Het bestand is te groot. Maximaal 25 MB per bestand.'); return; }
  setBusy(true); setError('');
  try {
   const id = crypto.randomUUID();
   await putAttachment({
    id, projectId: project.id, kind, name: file.name, type: FILE_TYPES[extension], size: file.size, blob: file,
    title: String(fields.get('title') || '').trim(), date: String(fields.get('date') || ''),
   });
   // Pas "opgeslagen" zeggen als het bestand er ook echt weer uit te halen is.
   const stored = await getAttachment(id);
   if (!stored?.blob || stored.blob.size !== file.size) throw new Error('Niet terug te lezen');
   requestPersistence();
   await reload();
   setSaved(`${String(fields.get('title') || '').trim() || file.name} is opgeslagen bij ${project.name}.`);
   form.reset();
  } catch {
   setError('Opslaan mislukt. Het bestand staat niet in deze browser. Probeer opnieuw, of maak eerst ruimte vrij.');
  } finally { setBusy(false); }
 }

 async function blobOf(file) {
  const stored = await getAttachment(file.id);
  if (!stored?.blob) throw new Error('Ontbreekt');
  return stored.blob;
 }
 async function open(file) {
  try {
   const url = URL.createObjectURL(await blobOf(file));
   window.open(url, '_blank', 'noopener');
   setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch { setError('Openen mislukt. Het opgeslagen bestand is niet beschikbaar.'); }
 }
 async function download(file) {
  try {
   const url = URL.createObjectURL(await blobOf(file));
   const link = document.createElement('a');
   link.href = url; link.download = file.name; link.click();
   setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch { setError('Download mislukt. Het opgeslagen bestand is niet beschikbaar.'); }
 }
 async function remove(file) {
  if (!confirm(`“${file.title || file.name}” definitief verwijderen?`)) return;
  setBusy(true);
  try { await deleteAttachment(file.id); await reload(); setError(''); setSaved(''); }
  catch { setError('Verwijderen mislukt. Probeer opnieuw.'); }
  finally { setBusy(false); }
 }

 return <div className="shelf">
  <form className="shelf-upload" onSubmit={add} aria-label={`Document toevoegen aan ${project.name}`}>
   <fieldset disabled={busy}>
    <legend>Document toevoegen</legend>
    <label className="shelf-file">Bestand
     <input name="file" type="file" accept={ACCEPT} aria-label="Bestand" />
     <span className="shelf-hint">PDF, Word, Excel, JPG of PNG · tot 25 MB</span>
    </label>
    <label><span>Titel <span className="plan-optional">(mag leeg)</span></span>
     <input name="title" maxLength={200} />
    </label>
    <label>Datum
     <input name="date" type="date" defaultValue={isoToday()} />
    </label>
    <div className="field-block pause-choice" role="radiogroup" aria-label="Soort">
     <span className="field-label">Soort</span>
     <div className="chips">
      {PROJECT_KINDS.map(option => <label key={option} className={`chip${kind === option ? ' is-on' : ''}`}>
       <input type="radio" name="soort" value={option} checked={kind === option} onChange={() => setKind(option)} />{option}
      </label>)}
     </div>
    </div>
    <div className="actions"><button className="primary" type="submit">{busy ? 'Bezig…' : 'Document opslaan'}</button></div>
   </fieldset>
  </form>
  {error && <p className="error" role="alert">{error}</p>}
  {saved && <p className="notice" role="status">{saved}</p>}

  {files.length
   ? <ul className="shelf-list" aria-label={`Documenten van ${project.name}`}>
    {files.map(file => <li key={file.id}>
     <div className="shelf-doc">
      <b>{file.title || file.name}</b>
      <span>{file.kind}{file.date ? <> · <span className="num">{formatDate(file.date)}</span></> : ''} · <span className="num">{size(file.size)}</span>{file.title ? ` · ${file.name}` : ''}</span>
     </div>
     <div className="shelf-actions">
      <button type="button" onClick={() => open(file)} disabled={busy}>Openen</button>
      <button type="button" onClick={() => download(file)} disabled={busy}>Downloaden</button>
      <button type="button" className="danger" onClick={() => remove(file)} disabled={busy}>Verwijderen</button>
     </div>
    </li>)}
   </ul>
   : <p className="empty-line">Nog geen documenten bij dit project.</p>}
 </div>;
}

/** Rapportages: per project de documenten en rapporten op één plek. */
export default function Reports({ data, projectId }) {
 const narrow = useNarrow();
 const projects = [...data.projecten].sort((a, b) =>
  (ACTIVE.includes(b.status) - ACTIVE.includes(a.status)) || a.name.localeCompare(b.name, 'nl'));
 const [counts, setCounts] = useState({});
 const [query, setQuery] = useState('');
 const chosen = projects.find(p => p.id === projectId) || projects[0];

 async function count() {
  const all = await getAllAttachments().catch(() => []);
  const next = {};
  for (const file of all) if (file.projectId) next[file.projectId] = (next[file.projectId] || 0) + 1;
  setCounts(next);
 }
 useEffect(() => { count(); }, []);

 const pick = id => { location.hash = `#/rapportages?project=${id}`; };
 const shown = projects.filter(p => `${p.name} ${p.client || ''}`.toLocaleLowerCase('nl').includes(query.trim().toLocaleLowerCase('nl')));

 const header = <div className="title-row">
  <div>
   <h1>Rapportages</h1>
   <p className="sub">Documenten en rapporten per project, overzichtelijk bij elkaar.</p>
  </div>
 </div>;

 if (!projects.length) return <>
  {header}
  <p className="empty-line">Nog geen projecten. Documenten bewaar je per project. <a href="#/projecten/nieuw">Project aanmaken</a></p>
 </>;

 return <>
  {header}
  <StorageNotice />
  <div className="reports">
   {narrow
    ? <label className="reports-pick">Project
     <select aria-label="Project" value={chosen.id} onChange={event => pick(event.target.value)}>
      {projects.map(p => <option key={p.id} value={p.id}>{p.name}{counts[p.id] ? ` (${counts[p.id]})` : ''}</option>)}
     </select>
    </label>
    : <nav className="reports-projects" aria-label="Projecten">
     {projects.length > 8 && <input type="search" aria-label="Zoek een project" placeholder="Zoek een project" value={query} onChange={event => setQuery(event.target.value)} />}
     <ul>
      {shown.map(p => <li key={p.id}>
       <button type="button" aria-current={p.id === chosen.id ? 'true' : undefined} onClick={() => pick(p.id)}>
        <span className="reports-name">{p.name}</span>
        <span className="reports-meta">{p.client ? `${p.client} · ` : ''}{counts[p.id] ? plural(counts[p.id], 'document', 'documenten') : 'nog leeg'}</span>
       </button>
      </li>)}
     </ul>
    </nav>}

   <section className="panel reports-shelf" aria-label={`Documenten van ${chosen.name}`}>
    <header>
     <div>
      <h2>{chosen.name}</h2>
      <p className="reports-sub">{[chosen.client, chosen.location, chosen.status].filter(Boolean).join(' · ')}</p>
     </div>
     <a className="card-link" href={`#/projecten/${chosen.id}`}>Projectpagina</a>
    </header>
    <DocumentShelf key={chosen.id} project={chosen} onChange={count} />
   </section>
  </div>
 </>;
}
