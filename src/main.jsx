import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const sections = [
  { name: 'Dashboard', icon: '▦', group: 'Werkruimte' },
  { name: 'Projecten', icon: '◫', count: '08', group: 'Werkruimte' },
  { name: 'Materiaal', icon: '▤', count: '12', group: 'Werkruimte' },
  { name: 'Inventaris', icon: '▧', group: 'Werkruimte' },
  { name: 'Facturatie', icon: '▣', count: '03', group: 'Beheer' },
  { name: 'IT & support', icon: '⌘', group: 'Beheer' },
  { name: 'Procedures', icon: '☷', group: 'Beheer' },
];
const projects = [
  { name: 'North Sea Alpha', client: 'Qunited Offshore', location: 'Noordzee, blok A12', status: 'In uitvoering', progress: 68, due: '18 nov 2026', lead: 'MV' },
  { name: 'Harbor Integrity', client: 'Delta Terminals', location: 'Rotterdam, Europoort', status: 'In uitvoering', progress: 42, due: '26 nov 2026', lead: 'JD' },
  { name: 'Wellhead Upgrade', client: 'PetroWest Energy', location: 'Den Helder, platform 4', status: 'Planning', progress: 15, due: '04 dec 2026', lead: 'AK' },
  { name: 'Pipeline Survey', client: 'Northline Energy', location: 'IJmuiden, route B', status: 'In uitvoering', progress: 84, due: '12 dec 2026', lead: 'SR' },
];
const links = [
  ['01', 'Projecten', 'Planning, teams en voortgang', '›'],
  ['02', 'Materiaal aanvragen', 'Bestel of reserveer materieel', '↗'],
  ['03', 'Facturen', 'Bekijk en verwerk facturen', '↗'],
  ['04', 'IT-support', 'Meld een storing of vraag aan', '↗'],
  ['05', 'Inventaris', 'Materieel en gereedschap', '↗'],
  ['06', 'Procedures', 'Veiligheids- en werkdocumenten', '↗'],
];
function App() {
  const [active, setActive] = useState('Dashboard');
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState('Deze maand');
  const [notice, setNotice] = useState('');
  const filtered = useMemo(() => projects.filter(p => `${p.name} ${p.client} ${p.location} ${p.status}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const go = name => { setActive(name); if (name !== 'Dashboard') setNotice(`${name} geselecteerd. Koppel hier straks de bijbehorende module.`); else setNotice(''); };
  const groups = [...new Set(sections.map(s => s.group))];
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#home" onClick={() => go('Dashboard')}><span className="brand-mark">Q</span><span>qunited<span className="brand-sub">OPERATIONS</span></span></a>
      <div className="workspace"><span className="workspace-avatar">Q</span><span><b>Qunited Energy</b><small>Bedrijfsomgeving</small></span><span className="chevron">⌄</span></div>
      <nav aria-label="Hoofdnavigatie">{groups.map(group => <div className="nav-group" key={group}><p className="nav-label">{group}</p>{sections.filter(s => s.group === group).map(item => <button key={item.name} className={`nav-item ${active === item.name ? 'selected' : ''}`} onClick={() => go(item.name)}><span className="nav-icon">{item.icon}</span><span>{item.name}</span>{item.count && <small>{item.count}</small>}</button>)}</div>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><span className="help-symbol">?</span><b>Hulp nodig?</b><p>We helpen je op weg.</p><button onClick={() => go('IT & support')}>Contact support <span>↗</span></button></div><button className="profile"><span className="profile-avatar">TJ</span><span><b>Terry Jansen</b><small>Operations manager</small></span><span className="chevron">···</span></button></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumbs">Werkruimte <span>/</span> <b>{active}</b></div><div className="top-actions"><label className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Zoek projecten, materiaal..." aria-label="Zoeken"/><kbd>⌘ K</kbd></label><button className="icon-button" aria-label="Meldingen" onClick={() => setNotice('Je bent helemaal bijgewerkt.')}>♧<i /></button><span className="top-avatar">TJ</span></div></header>
      <div className="page-content">
        <div className="welcome-row"><div><p className="eyebrow">MAANDAG 2 NOVEMBER 2026 <span className="weather">·</span> DEMO DATA</p><h1>Goedemorgen, Terry <span>👋</span></h1><p className="intro">Hier is wat er vandaag speelt binnen Qunited.</p></div><button className="primary-button" onClick={() => go('Projecten')}><span>＋</span> Nieuw project</button></div>
        {notice && <div role="status" className="notice"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Melding sluiten">×</button></div>}
        <section className="metric-grid" aria-label="Bedrijfsstatus">
          <article className="metric"><div className="metric-top"><span>Actieve projecten</span><span className="metric-icon blue">◫</span></div><div className="metric-value">08 <span className="metric-change positive">+2</span></div><div className="metric-foot">ten opzichte van vorige maand</div></article>
          <article className="metric"><div className="metric-top"><span>Openstaande facturen</span><span className="metric-icon amber">▣</span></div><div className="metric-value">€ 24.680</div><div className="metric-foot"><span className="warning-text">3 facturen</span> wachten op verwerking</div></article>
          <article className="metric"><div className="metric-top"><span>Materiaal in gebruik</span><span className="metric-icon green">▤</span></div><div className="metric-value">34 <span className="metric-unit">items</span></div><div className="metric-foot">12 items beschikbaar</div></article>
          <article className="metric"><div className="metric-top"><span>IT-meldingen</span><span className="metric-icon violet">⌘</span></div><div className="metric-value">02 <span className="metric-change neutral">open</span></div><div className="metric-foot">Gemiddelde afhandeling: 4 uur</div></article>
        </section>
        <section className="quick-section"><div className="section-heading"><div><h2>Snel naar</h2><p>Veelgebruikte onderdelen en tools.</p></div><button className="text-button" onClick={() => setNotice('Alle onderdelen staan in het navigatiemenu.')}>Alle onderdelen <span>→</span></button></div><div className="quick-grid">{links.map(([n,title,sub,arrow])=><button key={title} className="quick-link" onClick={() => go(title === 'Materiaal aanvragen' ? 'Materiaal' : title === 'IT-support' ? 'IT & support' : title)}><span className="quick-number">{n}</span><span className="quick-copy"><b>{title}</b><small>{sub}</small></span><span className="quick-arrow">{arrow}</span></button>)}</div></section>
        <section className="projects-section"><div className="section-heading"><div><h2>Projectoverzicht</h2><p>Volg de voortgang van je actieve projecten.</p></div><div className="project-tools"><select value={period} onChange={e=>setPeriod(e.target.value)} aria-label="Periode"><option>Deze maand</option><option>Dit kwartaal</option><option>Dit jaar</option></select><button className="outline-button" onClick={() => go('Projecten')}>Alle projecten <span>→</span></button></div></div>
          <div className="table-wrap"><table><thead><tr><th>PROJECT</th><th>KLANT / LOCATIE</th><th>STATUS</th><th>VOORTGANG</th><th>EINDDATUM</th><th>LEAD</th></tr></thead><tbody>{filtered.map(project=><tr key={project.name}><td><button className="project-name" onClick={()=>setNotice(`${project.name} geselecteerd. Projectdetails worden hier gekoppeld.`)}>{project.name}</button></td><td><b className="client">{project.client}</b><small className="location">{project.location}</small></td><td><span className={`status ${project.status === 'Planning' ? 'planning' : ''}`}><i />{project.status}</span></td><td><div className="progress-wrap"><div className="progress"><span style={{width:`${project.progress}%`}} /></div><small>{project.progress}%</small></div></td><td className="due-date">{project.due}</td><td><span className="lead-avatar">{project.lead}</span></td></tr>)}</tbody></table>{filtered.length===0 && <div className="empty-state"><b>Geen projecten gevonden</b><span>Probeer een andere zoekterm.</span></div>}</div>
          <div className="table-footer">Toont <b>{filtered.length}</b> van <b>{projects.length}</b> projecten <button onClick={()=>setQuery('')}>Zoekopdracht wissen</button></div>
        </section>
        <footer className="footer"><span>© 2025 Qunited Energy</span><span><button onClick={()=>go('Procedures')}>Veiligheidsprocedures</button><button onClick={()=>go('IT & support')}>Support</button><span className="system-state"><i/> Alle systemen operationeel</span></span></footer>
      </div>
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
