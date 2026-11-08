// Reistijd berekenen, zodat niemand hem zelf hoeft te kiezen en de planning hem kan controleren.
//
// Adres naar plek: Nominatim van OpenStreetMap (OSMF, servers in Europa).
// Route met de auto: de openbare OSRM-server van FOSSGIS e.V. (Duitsland).
// Geen sleutel, geen Amerikaans bedrijf. Beide zijn gratis voor licht gebruik en vragen om
// naamsvermelding ("© OpenStreetMap-bijdragers") en om niet te vaak te vragen; daarom wordt
// elke uitkomst in deze browser onthouden. De tijd is zonder file: een rit zonder verkeer.
// Voor zwaarder gebruik kan dit later naar een eigen of betaalde Europese routeserver.

export const GEOCODE_URL = 'https://nominatim.openstreetmap.org/search';
export const ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving/';
const CACHE_KEY = 'qunited.routes.v1';

export class RouteError extends Error {}

function readCache() {
 try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') || {}; } catch { return {}; }
}
function remember(key, value) {
 try {
  const cache = readCache();
  cache[key] = value;
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
 } catch { /* zonder geheugen rekent hij de volgende keer opnieuw */ }
}
const normal = text => String(text || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('nl');

/** Een adres, postcode of plaats naar een punt op de kaart. */
export async function geocode(query, fetchImpl = fetch) {
 const key = `plek:${normal(query)}`;
 const known = readCache()[key];
 if (known) return known;
 let response;
 try {
  response = await fetchImpl(`${GEOCODE_URL}?format=jsonv2&limit=1&accept-language=nl&q=${encodeURIComponent(query.trim())}`, { headers: { Accept: 'application/json' } });
 } catch { throw new RouteError('Geen verbinding met de kaartdienst. Controleer je internet.'); }
 if (!response.ok) throw new RouteError('De kaartdienst geeft even geen antwoord. Probeer het zo opnieuw.');
 const [hit] = await response.json().catch(() => []);
 if (!hit) throw new RouteError(`“${query.trim()}” staat niet op de kaart. Gebruik een adres, postcode of plaats.`);
 const place = { lat: Number(hit.lat), lon: Number(hit.lon), label: hit.display_name || query };
 remember(key, place);
 return place;
}

/** Enkele reis met de auto: minuten en kilometers. */
export async function drive(from, to, fetchImpl = fetch) {
 const key = `rit:${normal(from)}>${normal(to)}`;
 const known = readCache()[key];
 if (known) return known;
 const a = await geocode(from, fetchImpl);
 const b = await geocode(to, fetchImpl);
 let response;
 try {
  response = await fetchImpl(`${ROUTE_URL}${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`);
 } catch { throw new RouteError('Geen verbinding met de routedienst. Controleer je internet.'); }
 const body = await response.json().catch(() => null);
 const route = body?.routes?.[0];
 if (!response.ok || !route) throw new RouteError('Er is geen route met de auto gevonden tussen deze twee plekken.');
 const trip = { minutes: Math.max(1, Math.round(route.duration / 60)), km: Math.round(route.distance / 1000) };
 remember(key, trip);
 return trip;
}
