import React, { useEffect, useRef, useState } from 'react';
import { ask, getKey, setKey, clearKey, AssistantError } from './claude';

const SUGGESTIONS = [
 'Hoe voeg ik een nieuwe medewerker toe?',
 'Hoe zet ik iemand op een project?',
 'Hoe maak ik een back-up?',
 'Hoe voeg ik een certificaat toe?',
];

function KeySetup({ onSaved }) {
 const [value, setValue] = useState('');
 const [error, setError] = useState('');
 function save(event) {
  event.preventDefault();
  if (!value.trim()) { setError('Plak eerst je sleutel in het vak.'); return; }
  if (!setKey(value)) { setError('De sleutel kon niet in deze browser worden bewaard.'); return; }
  onSaved();
 }
 return <form className="editor assistant-setup" onSubmit={save} aria-label="Hulp instellen">
  <h2>Hulp instellen</h2>
  <p>De hulp beantwoordt vragen over dit dashboard. Hij gebruikt Claude van Anthropic, een Amerikaans bedrijf.
   Daarvoor is een eigen sleutel nodig. Dat doe je één keer per apparaat.</p>
  <ol>
   <li>Ga naar <a href="https://platform.claude.com" target="_blank" rel="noopener noreferrer">platform.claude.com</a> en log in of maak een account.</li>
   <li>Zet er een klein tegoed op. Elke vraag kost een fractie van een cent.</li>
   <li>Maak een API-sleutel aan en kopieer hem.</li>
   <li>Plak hem hieronder en klik op "Sleutel opslaan".</li>
  </ol>
  {error && <p role="alert" className="error">{error}</p>}
  <label>API-sleutel
   <input type="password" autoComplete="off" spellCheck={false} value={value} onChange={event => setValue(event.target.value)} />
  </label>
  <p className="muted">De sleutel blijft alleen in deze browser. Hij gaat niet mee in een back-up en staat nergens anders.</p>
  <div className="actions"><button className="primary" type="submit">Sleutel opslaan</button></div>
 </form>;
}

export default function Assistant({ data }) {
 const [key, setStoredKey] = useState(getKey);
 const [history, setHistory] = useState([]);
 const [question, setQuestion] = useState('');
 const [withData, setWithData] = useState(false);
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 const endRef = useRef(null);

 useEffect(() => { endRef.current?.scrollIntoView?.({ block: 'nearest' }); }, [history, busy]);

 async function send(text) {
  const asked = text.trim();
  if (!asked || busy) return;
  const next = [...history, { role: 'user', text: asked }];
  setHistory(next);
  setQuestion('');
  setError('');
  setBusy(true);
  try {
   const today = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
   const answer = await ask({ key, history: next, data: withData ? data : null, today });
   setHistory([...next, { role: 'assistant', text: answer }]);
  } catch (caught) {
   // De vraag gaat terug in het vak, zodat opnieuw proberen één klik is.
   setHistory(history);
   setQuestion(asked);
   setError(caught instanceof AssistantError ? caught.message : 'De vraag kon niet worden beantwoord. Probeer het opnieuw.');
  } finally {
   setBusy(false);
  }
 }

 function forgetKey() {
  if (!confirm('Sleutel uit deze browser verwijderen? Je moet hem daarna opnieuw invullen.')) return;
  clearKey();
  setStoredKey('');
  setHistory([]);
 }

 return <>
  <div className="title-row">
   <div>
    <h1>Hulp</h1>
    <p className="sub">Stel een vraag over het dashboard. Het antwoord komt van Claude, een AI-assistent. Controleer belangrijke dingen zelf.</p>
   </div>
   {key && <div className="title-actions">
    {!!history.length && <button onClick={() => { setHistory([]); setError(''); }}>Nieuw gesprek</button>}
   </div>}
  </div>

  {!key ? <KeySetup onSaved={() => setStoredKey(getKey())} /> : <>
   <div className="chat" role="log" aria-label="Gesprek" aria-live="polite">
    {!history.length && <div className="chat-start">
     <p>Waar kan ik mee helpen? Kies een vraag of typ hieronder je eigen vraag.</p>
     <div className="suggestions">
      {SUGGESTIONS.map(text => <button key={text} type="button" onClick={() => send(text)} disabled={busy}>{text}</button>)}
     </div>
    </div>}
    {history.map((turn, index) => <div key={index} className={`bubble ${turn.role === 'user' ? 'mine' : 'theirs'}`}>
     <span className="who">{turn.role === 'user' ? 'Jij' : 'Hulp'}</span>
     <p>{turn.text}</p>
    </div>)}
    {busy && <div className="bubble theirs" role="status"><span className="who">Hulp</span><p>Even denken…</p></div>}
    <div ref={endRef} />
   </div>

   {error && <p role="alert" className="error">{error}</p>}

   <form className="ask" onSubmit={event => { event.preventDefault(); send(question); }}>
    <label className="ask-field">Je vraag
     <textarea rows={3} value={question} onChange={event => setQuestion(event.target.value)}
      onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(question); } }} />
    </label>
    <label className="checkbox">
     <input type="checkbox" checked={withData} onChange={event => setWithData(event.target.checked)} />
     Mijn gegevens meesturen, zodat de hulp ook vragen over mijn projecten en mensen kan beantwoorden
    </label>
    {withData && <p className="notice warn" role="note">Namen, projecten, uren en notities gaan dan naar Anthropic in de Verenigde Staten. Telefoonnummers en e-mailadressen niet, cv's en certificaten ook niet.</p>}
    <div className="actions">
     <button className="primary" type="submit" disabled={busy || !question.trim()}>{busy ? 'Bezig…' : 'Versturen'}</button>
    </div>
   </form>

   <p className="muted assistant-foot">
    Zonder vinkje gaat alleen je vraag naar Anthropic, geen gegevens uit de werkruimte. Het gesprek wordt niet bewaard.{' '}
    <button type="button" className="text-action" onClick={forgetKey}>Sleutel verwijderen</button>
   </p>
  </>}
 </>;
}
