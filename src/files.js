const DB_NAME = 'qunited-files';
const STORE = 'files';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const FILE_TYPES = {
 pdf: 'application/pdf',
 doc: 'application/msword',
 docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 jpg: 'image/jpeg',
 jpeg: 'image/jpeg',
 png: 'image/png',
};
export const ALLOWED_EXTENSIONS = { CV: ['pdf', 'doc', 'docx'], Certificaat: ['pdf', 'jpg', 'jpeg', 'png'] };

function open() {
 return new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
  request.onblocked = () => reject(new Error('Geblokkeerd'));
 });
}

// Eén verzoek binnen één transactie; het resultaat van dat verzoek komt terug.
async function one(mode, run) {
 const database = await open();
 return new Promise((resolve, reject) => {
  const tx = database.transaction(STORE, mode);
  let result;
  const request = run(tx.objectStore(STORE));
  request.onsuccess = () => { result = request.result; };
  tx.oncomplete = () => { database.close(); resolve(result); };
  tx.onerror = tx.onabort = () => { database.close(); reject(tx.error || new Error('Opslagfout')); };
 });
}

// Meerdere schrijfacties in één transactie: of alles slaagt, of niets.
async function batch(apply) {
 const database = await open();
 return new Promise((resolve, reject) => {
  const tx = database.transaction(STORE, 'readwrite');
  apply(tx.objectStore(STORE));
  tx.oncomplete = () => { database.close(); resolve(true); };
  tx.onerror = tx.onabort = () => { database.close(); reject(tx.error || new Error('Opslagfout')); };
 });
}

export const getAllAttachments = () => one('readonly', s => s.getAll());
export async function getAttachments(personId) {
 return (await getAllAttachments()).filter(file => file.personId === personId);
}
export const getAttachment = id => one('readonly', s => s.get(id));
export const putAttachment = item => one('readwrite', s => s.put(item));
export const deleteAttachment = id => one('readwrite', s => s.delete(id));

export const replaceAllAttachments = items => batch(store => {
 store.clear();
 for (const item of items) store.put(item);
});

export const clearAttachments = () => batch(store => store.clear());
