// Inloggen zonder wachtwoord: een voorportaal, nog geen beveiliging. Wie de browser opent,
// kan er nog steeds bij. Echte accounts komen pas met centrale opslag (zie OPSLAG.md).
export const SESSION_KEY = 'qunited.session';

export function signedIn() {
 try { return !!localStorage.getItem(SESSION_KEY); } catch { return true; }
}
export function signIn() {
 try { localStorage.setItem(SESSION_KEY, new Date().toISOString()); } catch { /* zonder opslag: dan alleen dit bezoek */ }
}
export function signOut() {
 try { localStorage.removeItem(SESSION_KEY); } catch { /* niets te wissen */ }
}
