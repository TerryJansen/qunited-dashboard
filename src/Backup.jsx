import React, { useState } from 'react';
import { modules } from './modules';
import { migrate, isValid, pickModules, emptyData } from './storage';
import { getAllAttachments, replaceAllAttachments, clearAttachments, FILE_TYPES, ALLOWED_EXTENSIONS, MAX_FILE_BYTES } from './files';
import { formatDate, plural, number } from './format';
import { markBackup, lastBackup, requestPersistence } from './persist';
import { StorageNotice } from './StorageNotice';

const FORMAT = 'qunited.backup.v1';
const today = () => new Date().toISOString().slice(0, 10);
const allowedTypes = new Set(Object.values(FILE_TYPES));

function toBase64(blob) {
 return new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
  reader.onerror = () => reject(reader.error || new Error('Leesfout'));
  reader.readAsDataURL(blob);
 });
}

function toBlob(base64, type) {
 const binary = atob(base64);
 const bytes = new Uint8Array(binary.length);
 for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
 return new Blob([bytes], { type });
}

function save(filename, text) {
 const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
 const link = document.createElement('a');
 link.href = url; link.download = filename; link.click();
 setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Eén bijlage uit een back-upbestand controleren; onbetrouwbare items worden overgeslagen, niet opgeslagen.
function checkAttachment(item, personIds) {
 if (!item || typeof item !== 'object' || Array.isArray(item)) return 'ongeldig';
 const strings = ['id', 'personId', 'kind', 'name', 'type', 'data'];
 if (strings.some(key => typeof item[key] !== 'string' || item[key] === '')) return 'ongeldig';
 if (!Object.hasOwn(ALLOWED_EXTENSIONS, item.kind)) return 'ongeldig';
 if (!allowedTypes.has(item.type)) return 'ongeldig';
 if (typeof item.size !== 'number' || !Number.isFinite(item.size) || item.size <= 0 || item.size > MAX_FILE_BYTES) return 'ongeldig';
 if (!personIds.has(item.personId)) return 'zonder medewerker';
 return '';
}

export default function Backup({ data, onRestore, readOnly }) {
 const [withFiles, setWithFiles] = useState(true);
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 const [note, setNote] = useState('');
 const [preview, setPreview] = useState(null);

 const recordCount = Object.keys(modules).reduce((total, key) => total + data[key].length, 0);

 async function download() {
  setBusy(true); setError(''); setNote('');
  try {
   const payload = { format: FORMAT, exported: new Date().toISOString(), records: pickModules(data), attachments: [] };
   if (withFiles) {
    const stored = await getAllAttachments();
    payload.attachments = await Promise.all(stored.map(async file => ({
     id: file.id, personId: file.personId, kind: file.kind, name: file.name, type: file.type, size: file.size,
     title: file.title || '', expiry: file.expiry || '', data: await toBase64(file.blob),
    })));
   }
   save(`qunited-backup-${today()}.json`, JSON.stringify(payload));
   markBackup();
   setNote(`Back-up gedownload: ${plural(recordCount, 'registratie', 'registraties')}${withFiles ? ` en ${plural(payload.attachments.length, 'bestand', 'bestanden')}` : ', zonder bestanden'}.`);
  } catch {
   setError('Back-up maken mislukt. De bestanden konden niet worden gelezen. Er is niets gewijzigd.');
  } finally { setBusy(false); }
 }

 async function choose(event) {
  const file = event.target.files?.[0];
  setPreview(null); setError(''); setNote('');
  if (!file) return;
  try {
   const parsed = JSON.parse(await file.text());
   if (!parsed || parsed.format !== FORMAT) throw new Error('Onbekend formaat');
   const records = migrate(parsed.records);
   if (!isValid(records)) throw new Error('Ongeldige gegevens');
   const personIds = new Set(records.personeel.map(person => person.id));
   const list = Array.isArray(parsed.attachments) ? parsed.attachments : [];
   const accepted = [], skipped = { ongeldig: 0, 'zonder medewerker': 0 };
   for (const item of list) {
    const problem = checkAttachment(item, personIds);
    if (problem) skipped[problem] += 1; else accepted.push(item);
   }
   setPreview({
    filename: file.name,
    exported: typeof parsed.exported === 'string' ? formatDate(parsed.exported.slice(0, 10)) : 'onbekend',
    records: pickModules(records),
    counts: Object.keys(modules).map(key => [modules[key].title, records[key].length]),
    total: Object.keys(modules).reduce((sum, key) => sum + records[key].length, 0),
    attachments: accepted,
    skipped,
   });
  } catch {
   setError('Dit bestand is geen geldige Qunited back-up, of de inhoud is beschadigd. Er is niets gewijzigd.');
  } finally {
   event.target.value = '';
  }
 }

 async function restore() {
  if (!preview) return;
  if (!confirm(`Alle huidige gegevens in deze browser vervangen door “${preview.filename}”? Dit kan niet ongedaan worden gemaakt.`)) return;
  setBusy(true); setError('');
  try {
   await replaceAllAttachments(preview.attachments.map(item => ({
    id: item.id, personId: item.personId, kind: item.kind, name: item.name, type: item.type, size: item.size,
    title: item.title || '', expiry: item.expiry || '', blob: toBlob(item.data, item.type),
   })));
  } catch {
   setError('Bestanden terugzetten mislukt. Browseropslag is niet beschikbaar of vol. Je gegevens zijn niet gewijzigd.');
   setBusy(false);
   return;
  }
  if (!onRestore(preview.records)) {
   setError('Gegevens terugzetten mislukt. Browseropslag is niet beschikbaar of vol. Controleer je gegevens: de bestanden zijn al vervangen.');
   setBusy(false);
   return;
  }
  requestPersistence();
  setNote(`Terugzetten gelukt: ${plural(preview.total, 'registratie', 'registraties')} en ${plural(preview.attachments.length, 'bestand', 'bestanden')} staan nu in deze browser.`);
  setPreview(null);
  setBusy(false);
 }

 async function wipe() {
  if (!confirm('Alle registraties, cv’s en certificaten uit deze browser verwijderen? Dit kan niet ongedaan worden gemaakt.')) return;
  setBusy(true); setError(''); setNote('');
  try { await clearAttachments(); } catch {
   setError('Bestanden wissen mislukt. Er is niets gewijzigd.'); setBusy(false); return;
  }
  if (!onRestore(emptyData())) {
   setError('Wissen mislukt. Browseropslag is niet beschikbaar. De bestanden zijn al verwijderd.'); setBusy(false); return;
  }
  setNote('De werkruimte in deze browser is leeg.');
  setBusy(false);
 }

 return <>
  <div className="title-row">
   <div>
    <h1>Back-up</h1>
    <p className="sub">Zet je werkruimte in één bestand, en lees die later of in een andere browser weer in.</p>
   </div>
  </div>

  <StorageNotice />
  {error && <p role="alert" className="error">{error}</p>}
  {note && <p role="status" className="notice">{note}</p>}

  <div className="settings-row">
   <div className="label-col">
    <h2>Back-up downloaden</h2>
    <p>{lastBackup() ? `Laatste back-up: ${formatDate(lastBackup().slice(0, 10))}. ` : 'Je hebt nog geen back-up gemaakt. '}
     Het bestand bevat je {plural(recordCount, 'registratie', 'registraties')} en, als je dat aanvinkt, de cv’s en certificaten. Het blijft op je eigen apparaat; er wordt niets verstuurd. Bewaar het als vertrouwelijk: personeelsgegevens staan er leesbaar in.</p>
   </div>
   <div className="settings-panel">
    <label className="checkbox">
     <input type="checkbox" checked={withFiles} onChange={event => setWithFiles(event.target.checked)} />
     Cv’s en certificaten meenemen (groter bestand)
    </label>
    <div className="actions">
     <button className="primary" disabled={busy} onClick={download}>Back-up downloaden</button>
    </div>
   </div>
  </div>

  <div className="settings-row">
   <div className="label-col">
    <h2>Back-up terugzetten</h2>
    <p>Terugzetten <b>vervangt</b> alles wat nu in deze browser staat. Download eerst een back-up van je huidige gegevens als je die wilt houden.</p>
   </div>
   <div className="settings-panel">
    {readOnly
     ? <p className="error" role="alert">Terugzetten is niet mogelijk zolang de huidige opslag niet gelezen kan worden.</p>
     : <>
      <label>Back-upbestand kiezen<input type="file" accept=".json,application/json" onChange={choose} disabled={busy} /></label>
      {preview && <div className="preview">
       <h3>Gevonden in {preview.filename}</h3>
       <p className="kpi-note">Gemaakt op {preview.exported}. Niets is nog gewijzigd.</p>
       <table aria-label="Inhoud van de back-up">
        <thead><tr><th>Onderdeel</th><th className="n">Aantal</th></tr></thead>
        <tbody>
         {preview.counts.map(([title, count]) => <tr key={title}><td>{title}</td><td className="n num">{number(count)}</td></tr>)}
         <tr><td>Cv’s en certificaten</td><td className="n num" data-testid="preview-files">{number(preview.attachments.length)}</td></tr>
        </tbody>
       </table>
       {preview.skipped.ongeldig > 0 && <p className="kpi-note">{plural(preview.skipped.ongeldig, 'bestand wordt', 'bestanden worden')} overgeslagen: onbekend type of te groot.</p>}
       {preview.skipped['zonder medewerker'] > 0 && <p className="kpi-note">{plural(preview.skipped['zonder medewerker'], 'bestand wordt', 'bestanden worden')} overgeslagen: de medewerker zit niet in deze back-up.</p>}
       <div className="actions">
        <button className="danger" disabled={busy} onClick={restore}>Alles vervangen</button>
        <button disabled={busy} onClick={() => setPreview(null)}>Annuleren</button>
       </div>
      </div>}
     </>}
   </div>
  </div>

  <div className="settings-row">
   <div className="label-col">
    <h2>Werkruimte wissen</h2>
    <p>Verwijdert alle registraties, cv’s en certificaten uit deze browser. Gebruik dit als je het apparaat of browserprofiel niet meer zelf gebruikt. Dit kan niet ongedaan worden gemaakt.</p>
   </div>
   <div className="settings-panel">
    <div className="actions">
     <button className="danger" disabled={busy} onClick={wipe}>Werkruimte wissen</button>
    </div>
   </div>
  </div>
 </>;
}
