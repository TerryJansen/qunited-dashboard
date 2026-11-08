import React, { useEffect, useRef } from 'react';
import { formatHours, formatPause } from './format';

export { formatHours, formatPause };

// Een draaiwiel zoals op een telefoon: veeg of scroll naar de juiste waarde, of tik erop.
// Met het toetsenbord werkt het als een gewone draaiknop (pijltjes, Home, End).

const ITEM = 44;      // hoogte van één regel, groot genoeg voor een duim
const VISIBLE = 5;    // regels in beeld; de middelste is gekozen
export const HOURS = Array.from({ length: 25 }, (_, h) => h);   // 0 tot en met 24
export const MINUTES = [0, 15, 30, 45];
export const PAUSES = [0, 15, 30, 45, 60];

const pad = n => String(n).padStart(2, '0');
const still = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Uren als decimaal getal ("8.5") naar uren en minuten op het kwartier. */
export function splitHours(value) {
 const total = Math.round((Number(value) || 0) * 60 / 15) * 15;
 const h = Math.min(24, Math.floor(total / 60));
 return { h, m: h === 24 ? 0 : total % 60 };
}
export const joinHours = (h, m) => String(h === 24 ? 24 : h + m / 60);
function Column({ label, values, index, onChange, format }) {
 const ref = useRef(null);
 const timer = useRef(0);
 const ignore = useRef(false);
 const first = useRef(true);

 // De gekozen waarde in het midden zetten, ook als hij van buitenaf verandert.
 useEffect(() => {
  let frame = 0;
  function sync() {
   const el = ref.current;
   if (!el) return;
   // In een venster dat nog opengaat heeft het wiel even geen hoogte; wacht daar op.
   if (!el.clientHeight) { frame = requestAnimationFrame(sync); return; }
   const target = index * ITEM;
   if (Math.abs(el.scrollTop - target) < 2) { first.current = false; return; }
   ignore.current = true;
   const instant = first.current || still();
   el.scrollTo({ top: target, behavior: instant ? 'auto' : 'smooth' });
   first.current = false;
   clearTimeout(timer.current);
   // Een directe sprong is meteen klaar; een vloeiende draai krijgt even de tijd.
   if (instant) frame = requestAnimationFrame(() => { ignore.current = false; });
   else timer.current = setTimeout(() => { ignore.current = false; }, 400);
  }
  sync();
  return () => cancelAnimationFrame(frame);
 }, [index]);
 useEffect(() => () => clearTimeout(timer.current), []);

 function scrolled() {
  if (ignore.current) return;
  clearTimeout(timer.current);
  timer.current = setTimeout(() => {
   const el = ref.current;
   if (!el) return;
   const next = Math.max(0, Math.min(values.length - 1, Math.round(el.scrollTop / ITEM)));
   if (next !== index) onChange(next);
   else el.scrollTo({ top: next * ITEM, behavior: still() ? 'auto' : 'smooth' });
  }, 110);
 }

 function key(event) {
  const step = { ArrowUp: 1, ArrowDown: -1, PageUp: 4, PageDown: -4 }[event.key];
  let next = index;
  if (step) next = index + step;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = values.length - 1;
  else return;
  event.preventDefault();
  onChange(Math.max(0, Math.min(values.length - 1, next)));
 }

 return <div className="wheel-column">
  <div ref={ref} className="wheel-list" onScroll={scrolled} onKeyDown={key} tabIndex={0}
   role="spinbutton" aria-label={label} aria-valuemin={values[0]} aria-valuemax={values[values.length - 1]}
   aria-valuenow={values[index]} aria-valuetext={format(values[index])}
   style={{ height: ITEM * VISIBLE, paddingBlock: ITEM * Math.floor(VISIBLE / 2) }}>
   {values.map((value, i) => <div key={value} className={`wheel-item${i === index ? ' is-picked' : ''}`}
    style={{ height: ITEM }} onClick={() => onChange(i)} aria-hidden="true">{format(value)}</div>)}
  </div>
 </div>;
}

/** Gewerkte tijd van 0:00 tot 24:00, per kwartier. */
export function DurationWheel({ label, value, onChange, required }) {
 const { h, m } = splitHours(value);
 const id = `wheel-${label.replace(/\W+/g, '')}`;
 return <div className="field-block" role="group" aria-labelledby={id}>
  <span className="field-label" id={id}>{label}{required && <span aria-hidden="true"> *</span>}</span>
  <div className="wheel">
   <div className="wheel-band" aria-hidden="true" />
   <Column label="Uren" values={HOURS} index={h} format={pad}
    onChange={i => onChange(joinHours(HOURS[i], HOURS[i] === 24 ? 0 : m))} />
   <span className="wheel-colon" aria-hidden="true">:</span>
   <Column label="Minuten" values={MINUTES} index={MINUTES.indexOf(m)} format={pad}
    onChange={i => onChange(joinHours(h, h === 24 ? 0 : MINUTES[i]))} />
  </div>
  <span className="wheel-readout" aria-live="polite">{h} uur{m ? ` en ${m} minuten` : ''}</span>
 </div>;
}

/** Pauze: altijd zichtbaar, één tik. */
export function PauseChoice({ label, value, onChange, required }) {
 return <fieldset className="field-block pause-choice">
  <legend className="field-label">{label}{required && <span aria-hidden="true"> *</span>}</legend>
  <div className="chips">
   {PAUSES.map(minutes => <label key={minutes} className={`chip${String(value) === String(minutes) ? ' is-on' : ''}`}>
    <input type="radio" name="pauze" value={minutes} checked={String(value) === String(minutes)}
     onChange={() => onChange(String(minutes))} />
    {formatPause(minutes)}
   </label>)}
  </div>
 </fieldset>;
}
