const DATE_SHORT = { day: 'numeric', month: 'short', year: 'numeric' };
const DATE_LONG = { day: 'numeric', month: 'long', year: 'numeric' };

/** Toont een opgeslagen ISO-datum (YYYY-MM-DD) zoals je hem in het Nederlands schrijft. */
export function formatDate(iso, options = DATE_SHORT) {
 if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso ?? '';
 const date = new Date(`${iso}T00:00:00`);
 return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('nl-NL', options);
}

export const formatDateLong = iso => formatDate(iso, DATE_LONG);
export const money = n => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n);
export const number = n => new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2 }).format(n);

/** "1 registratie" tegenover "3 registraties": een telwoord zonder meervoudsfout. */
export const plural = (count, one, many) => `${number(count)} ${count === 1 ? one : many}`;

const pad2 = n => String(n).padStart(2, '0');
/** "8:30" — zo schrijft iedereen het op een urenbriefje. */
export function formatHours(value) {
 if (value === '' || value === undefined || value === null || !Number.isFinite(Number(value))) return value ?? '';
 const total = Math.round(Number(value) * 60);
 return `${Math.floor(total / 60)}:${pad2(total % 60)}`;
}
export function formatPause(value) {
 const minutes = Number(value);
 if (value === '' || value === undefined || !Number.isFinite(minutes)) return value ?? '';
 if (minutes === 0) return 'Geen';
 if (minutes === 60) return '1 uur';
 return `${minutes} min`;
}

