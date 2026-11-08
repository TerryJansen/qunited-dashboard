import React, { useState } from 'react';
import { isoToday } from './alerts';
import { week } from './agenda';
import useNarrow from './useNarrow';

const KIND = {
 actief: 'Ingezet',
 gepland: 'Gepland',
 afgerond: 'Afgerond',
 afwezig: 'Afwezig',
};

/** Eén blok in de agenda: de projectnaam groot, de rol eronder, de soort in woorden. */
function Block({ entry, compact }) {
 return <a className={`agenda-block is-${entry.kind}`} href={entry.href}>
  <b>{entry.label}</b>
  {!compact && entry.kind !== 'actief' && <span className="agenda-kind">{KIND[entry.kind]}</span>}
  {!compact && entry.note && entry.kind !== 'afwezig' && <span className="agenda-note">{entry.note}</span>}
 </a>;
}

function WeekNav({ offset, setOffset, view }) {
 return <div className="period agenda-nav">
  <button type="button" onClick={() => setOffset(value => value - 1)}>Vorige week</button>
  <button type="button" onClick={() => setOffset(0)} disabled={offset === 0}>Deze week</button>
  <button type="button" onClick={() => setOffset(value => value + 1)}>Volgende week</button>
 </div>;
}

export default function Planning({ data }) {
 const today = isoToday();
 const narrow = useNarrow();
 const [offset, setOffset] = useState(0);
 const view = week(data, today, offset);
 const [picked, setPicked] = useState(view.todayIndex ?? 0);
 const day = Math.min(picked, 6);

 const header = <div className="title-row">
  <div>
   <h1>Planning</h1>
   <p className="sub agenda-when">Week {view.number} · {view.range}</p>
  </div>
  <div className="title-actions"><a className="primary" href="#/inzet/nieuw">Inzet toevoegen</a></div>
 </div>;

 if (!view.rows.length) return <>
  {header}
  <p className="empty-line">Nog geen actieve medewerkers. <a href="#/personeel/nieuw">Medewerker toevoegen</a></p>
 </>;

 if (narrow) return <>
  {header}
  <WeekNav offset={offset} setOffset={setOffset} />
  <div className="agenda-days" role="tablist" aria-label="Kies een dag">
   {view.days.map((d, i) => <button key={d.iso} type="button" role="tab" aria-selected={i === day}
    className={`agenda-day${d.today ? ' is-today' : ''}${d.weekend ? ' is-weekend' : ''}`} onClick={() => setPicked(i)}
    aria-label={`${d.long} ${d.date}${d.today ? ', vandaag' : ''}`}>
    <span>{d.short}</span><b>{d.number}</b>
   </button>)}
  </div>
  <h2 className="agenda-dayname">{view.days[day].today ? `Vandaag, ${view.days[day].long}` : view.days[day].long.charAt(0).toUpperCase() + view.days[day].long.slice(1)} {view.days[day].date}</h2>
  <ul className="agenda-list" aria-label={`Wie staat waar op ${view.days[day].long}`}>
   {view.rows.map(row => {
    const entries = row.perDay[day];
    return <li key={row.id}>
     <a className="agenda-person" href={row.href}>{row.name}</a>
     {row.role && <span className="agenda-role">{row.role}</span>}
     <div className="agenda-what">
      {entries.length
       ? entries.map(entry => <Block key={entry.href} entry={entry} />)
       : <span className="agenda-free">{view.days[day].weekend ? 'Weekend' : 'Vrij'}</span>}
     </div>
    </li>;
   })}
  </ul>
 </>;

 return <>
  {header}
  <WeekNav offset={offset} setOffset={setOffset} />
  <div className="table-wrap agenda-wrap" tabIndex={0}>
   <table className="agenda" aria-label={`Planning week ${view.number}`}>
    <colgroup><col className="agenda-col-person" />{view.days.map(d => <col key={d.iso} className={d.weekend ? 'is-weekend' : undefined} />)}</colgroup>
    <thead><tr>
     <th scope="col">Medewerker</th>
     {view.days.map(d => <th key={d.iso} scope="col" className={`${d.today ? 'is-today' : ''}${d.weekend ? ' is-weekend' : ''}`}>
      <span className="agenda-dayshort">{d.short}</span> <span className="num">{d.date}</span>
      {d.today && <span className="agenda-todaytag">vandaag</span>}
     </th>)}
    </tr></thead>
    <tbody>{view.rows.map(row => <tr key={row.id}>
     <th scope="row"><a href={row.href}>{row.name}</a>{row.role && <span className="sub">{row.role}</span>}</th>
     {row.segments.map(segment => <td key={segment.start} colSpan={segment.span}
      className={`${segment.weekend && !segment.entries.length ? 'is-weekend' : ''}${view.todayIndex !== null && view.todayIndex >= segment.start && view.todayIndex < segment.start + segment.span ? ' has-today' : ''}`}>
      {segment.entries.length
       ? <div className="agenda-stack">{segment.entries.map(entry => <Block key={entry.href} entry={entry} compact={segment.span === 1 && segment.entries.length > 1} />)}</div>
       : !segment.weekend && <span className="agenda-free">Vrij</span>}
     </td>)}
    </tr>)}</tbody>
   </table>
  </div>
  <p className="agenda-legend">
   <span><i className="agenda-swatch is-actief" />Ingezet</span>
   <span><i className="agenda-swatch is-gepland" />Gepland</span>
   <span><i className="agenda-swatch is-afwezig" />Afwezig</span>
   <span><i className="agenda-swatch is-afgerond" />Afgerond</span>
   <span className="muted">Klik op een blok om het project of de afwezigheid te openen.</span>
  </p>
 </>;
}
