/**
 * Blijvende opslag in de browser.
 *
 * Zonder toestemming mag een browser de gegevens van een site opruimen als de schijf vol raakt,
 * en Safari op iPhone en iPad doet dat ook zonder reden: na zeven dagen zonder bezoek gaan
 * localStorage en IndexedDB weg. Een site die op het beginscherm staat valt daarbuiten.
 * Hier vragen we om blijvende opslag en zeggen we eerlijk wanneer we die niet krijgen.
 */

const LAST_BACKUP_KEY = 'qunited.lastBackup';
export const BACKUP_REMINDER_DAYS = 7;

/** Draait de site als app vanaf het beginscherm? Dan geldt de zevendagenregel niet. */
export const isInstalled = () =>
 (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches)
 || navigator.standalone === true;

const isAppleMobile = () => /iPhone|iPad|iPod/.test(navigator.userAgent)
 || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Vraag de browser de opslag niet op te ruimen. Geeft terug of dat gelukt is. */
export async function requestPersistence() {
 try {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return await navigator.storage.persist();
 } catch {
  return false;
 }
}

/**
 * Hoe veilig staan de gegevens? Eén van:
 * - 'veilig': de browser heeft blijvende opslag toegezegd, of de site staat op het beginscherm;
 * - 'iphone': Safari of een app-browser op iPhone/iPad, niet op het beginscherm;
 * - 'onzeker': de browser zegt niets toe (privévenster, app-browser, of gewoon geweigerd);
 * - 'onbekend': deze browser kan het niet vertellen.
 */
export async function storageSafety() {
 if (isInstalled()) return 'veilig';
 let persisted = null;
 try { persisted = navigator.storage?.persisted ? await navigator.storage.persisted() : null; } catch { persisted = null; }
 if (persisted === true) return 'veilig';
 if (isAppleMobile()) return 'iphone';
 return persisted === false ? 'onzeker' : 'onbekend';
}

export function markBackup(iso = new Date().toISOString()) {
 try { localStorage.setItem(LAST_BACKUP_KEY, iso); } catch { /* geen opslag: dan ook geen herinnering */ }
}

export function lastBackup() {
 try { return localStorage.getItem(LAST_BACKUP_KEY) || ''; } catch { return ''; }
}

/** Dagen sinds de laatste back-up, of null als die er nooit is geweest. */
export function daysSinceBackup(now = new Date()) {
 const last = lastBackup();
 if (!last) return null;
 const days = Math.floor((now - new Date(last)) / 86400000);
 return Number.isFinite(days) ? Math.max(0, days) : null;
}
