import React, { useEffect, useState } from 'react';
import { getAttachments, getAttachment, putAttachment, deleteAttachment, FILE_TYPES, ALLOWED_EXTENSIONS, MAX_FILE_BYTES } from './files';
import { formatDate } from './format';

export { getAttachments };

const kb = bytes => new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 }).format(bytes / 1024);

export default function Attachments({ personId }) {
 const [files, setFiles] = useState([]), [error, setError] = useState(''), [busy, setBusy] = useState(false);

 useEffect(() => {
  getAttachments(personId).then(setFiles)
   .catch(() => setError('Bestanden kunnen niet worden gelezen. Browseropslag is niet beschikbaar.'));
 }, [personId]);

 async function add(event, kind) {
  event.preventDefault();
  const form = event.currentTarget;
  const fields = new FormData(form);
  const file = fields.get('file');
  const extension = file?.name.split('.').pop().toLowerCase();
  if (!file?.size) { setError('Kies een niet-leeg bestand.'); return; }
  if (!ALLOWED_EXTENSIONS[kind].includes(extension) || (file.type && file.type !== FILE_TYPES[extension])) {
   setError('Bestandstype niet toegestaan. Kies de vermelde bestandstypen.'); return;
  }
  if (file.size > MAX_FILE_BYTES) { setError('Het bestand is te groot. Maximaal 10 MB per bestand.'); return; }
  setBusy(true); setError('');
  try {
   await putAttachment({
    id: crypto.randomUUID(), personId, kind, name: file.name, type: FILE_TYPES[extension], size: file.size, blob: file,
    title: String(fields.get('title') || '').trim(), expiry: String(fields.get('expiry') || ''),
   });
   setFiles(await getAttachments(personId));
   form.reset();
  } catch {
   setError('Bestand opslaan mislukt. Browseropslag is niet beschikbaar of vol. Probeer opnieuw.');
  } finally { setBusy(false); }
 }

 async function remove(file) {
  if (!confirm(`Bestand “${file.name}” definitief verwijderen?`)) return;
  setBusy(true);
  try { await deleteAttachment(file.id); setFiles(await getAttachments(personId)); setError(''); }
  catch { setError('Bestand verwijderen mislukt. Probeer opnieuw.'); }
  finally { setBusy(false); }
 }

 async function download(file) {
  try {
   const stored = await getAttachment(file.id);
   if (!stored?.blob) throw new Error('Ontbreekt');
   const url = URL.createObjectURL(stored.blob);
   const link = document.createElement('a');
   link.href = url; link.download = file.name; link.click();
   setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch { setError('Download mislukt. Het opgeslagen bestand is niet beschikbaar.'); }
 }

 return <section className="attachments">
  <h3>Cv &amp; certificaten</h3>
  <p className="kpi-note">Alleen in deze browser, niet gedeeld met anderen. Bewaar zelf een back-up. Maximaal 10 MB per bestand.</p>
  {error && <p className="error" role="alert">{error}</p>}
  {files.map(file => <div className="attachment" key={file.id}>
   <div className="file">
    <b>{file.name}</b>
    <p>
     {file.kind} · <span className="num">{kb(file.size)}</span> KB
     {file.title ? ` · ${file.title}` : ''}
     {file.expiry ? ` · geldig tot ${formatDate(file.expiry)}` : ''}
    </p>
   </div>
   <div className="row-actions">
    <button className="text-action" disabled={busy} onClick={() => download(file)}>Download</button>
    <button className="text-action danger" disabled={busy} onClick={() => remove(file)}>Bestand verwijderen</button>
   </div>
  </div>)}
  {['CV', 'Certificaat'].map(kind => <form key={kind} className="upload-form" onSubmit={event => add(event, kind)}>
   <fieldset disabled={busy}>
    <legend>{kind} toevoegen</legend>
    <p className="muted">{kind === 'CV' ? 'PDF, DOC of DOCX' : 'PDF, JPG of PNG'}</p>
    <div className="upload-grid">
     <label>Bestand<input name="file" type="file" required accept={ALLOWED_EXTENSIONS[kind].map(e => `.${e}`).join(',')} /></label>
     {kind === 'Certificaat' && <>
      <label>Certificaatnaam<input name="title" maxLength={200} /></label>
      <label>Geldig tot<input name="expiry" type="date" /></label>
     </>}
    </div>
    <button type="submit">Bestand opslaan</button>
   </fieldset>
  </form>)}
 </section>;
}
