// Gewerkte uren per dag van één week, uit de urenstaten. Alles in hele minuten, zodat het optelt.
import { shiftDays } from './alerts';

const DAYS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];

export const mondayOf = iso => shiftDays(iso, -((new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7));

/** "38u 36min", "8u", "45min". */
export function formatDuration(minutes) {
 const h = Math.floor(minutes / 60), m = minutes % 60;
 if (!h) return `${m}min`;
 return m ? `${h}u ${m}min` : `${h}u`;
}

export function weekHours(data, monday, today) {
 const days = DAYS.map((short, index) => {
  const iso = shiftDays(monday, index);
  const perProject = new Map();
  for (const sheet of data.urenstaten) {
   if (sheet.date !== iso) continue;
   const minutes = Math.round(Number(sheet.hours) * 60);
   if (!(minutes > 0)) continue;
   perProject.set(sheet.projectId || '', (perProject.get(sheet.projectId || '') || 0) + minutes);
  }
  const byProject = [...perProject].map(([id, minutes]) => ({
   id, minutes, name: data.projecten.find(project => project.id === id)?.name || 'Zonder project',
  })).sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name, 'nl'));
  // Meer dan drie projecten op één dag: de rest samen, zodat de balk leesbaar blijft.
  const parts = byProject.length > 3
   ? [...byProject.slice(0, 2), { id: 'overig', name: 'Overige projecten', minutes: byProject.slice(2).reduce((sum, p) => sum + p.minutes, 0) }]
   : byProject;
  return { iso, short, today: iso === today, minutes: byProject.reduce((sum, p) => sum + p.minutes, 0), parts };
 });
 return { days, total: days.reduce((sum, day) => sum + day.minutes, 0) };
}

/** Verschil met de week ervoor in hele procenten, of null als er niets te vergelijken valt. */
export function change(current, previous) {
 if (!(previous > 0)) return null;
 return Math.round((current - previous) / previous * 100);
}
