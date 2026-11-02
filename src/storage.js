import { modules, STORAGE_KEY, emptyData } from './modules';

export { emptyData };

export const READ_ERROR = 'Opslag kan niet worden gelezen. Je bestaande gegevens zijn niet overschreven. Herstel de browseropslag of gebruik een andere browser voordat je nieuwe gegevens opslaat.';
export const WRITE_ERROR = 'Opslaan mislukt. Browseropslag is niet beschikbaar of vol. Je wijziging is niet opgeslagen.';

const isRecordObject = value => !!value && typeof value === 'object' && !Array.isArray(value);

// Nieuwere modules krijgen een lege lijst, zodat eerder opgeslagen gegevens blijven werken.
// Een sleutel die al bestaat blijft ongemoeid: die moet door de validatie heen, niet stil worden vervangen.
export function migrate(data) {
 if (!isRecordObject(data)) return data;
 for (const key of Object.keys(modules)) if (!Object.hasOwn(data, key)) data[key] = [];
 return data;
}

export function isValid(data) {
 if (!isRecordObject(data)) return false;
 return Object.entries(modules).every(([key, m]) => Array.isArray(data[key]) && data[key].every(record =>
  isRecordObject(record)
  && typeof record.id === 'string' && record.id !== ''
  && typeof record.name === 'string'
  && m.states.includes(record.status)
  && Object.values(record).every(value => typeof value === 'string' || typeof value === 'number')));
}

// Alleen de bekende modules overnemen, zodat een back-up geen onbekende sleutels naar binnen smokkelt.
export const pickModules = data => Object.fromEntries(Object.keys(modules).map(key => [key, data[key]]));

export function readData() {
 try {
  const raw = localStorage.getItem(STORAGE_KEY);
  const data = migrate(raw ? JSON.parse(raw) : emptyData());
  if (!isValid(data)) throw new Error('Invalid data');
  return { data: pickModules(data), error: '' };
 } catch {
  return { data: emptyData(), error: READ_ERROR };
 }
}

export function writeData(data) {
 localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
