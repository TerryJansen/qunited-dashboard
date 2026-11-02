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
