import React, { useEffect, useRef, useState } from 'react';
import Logo from './Logo';
import { signIn } from './session';

export default function Login({ onEnter }) {
 const video = useRef(null);
 const [playing, setPlaying] = useState(false);

 // Wie minder beweging wil, ziet het stilstaande beeld en kan zelf op afspelen drukken.
 useEffect(() => {
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!still) video.current?.play?.().catch(() => {});
 }, []);

 function toggle() {
  const v = video.current;
  if (!v) return;
  if (v.paused) v.play().catch(() => {}); else v.pause();
 }

 function enter(event) {
  event.preventDefault();
  signIn();
  onEnter();
 }
 return <main className="login">
  <header className="login-bar">
   <Logo className="brand-logo" />
   <span>Werkruimte</span>
  </header>
  <div className="login-body">
   <section className="login-copy" aria-labelledby="login-title">
    <h1 id="login-title">Welkom bij Qunited</h1>
    <p>Projecten, inzet, uren en personeel op één plek.</p>
    <form onSubmit={enter}>
     <button className="login-button" type="submit">Inloggen</button>
    </form>
    <p className="login-note">Een wachtwoord is nog niet nodig.</p>
   </section>
   <figure className="login-film">
    <video ref={video} muted loop playsInline preload="metadata" poster="./login-vlucht.jpg"
     aria-label="Vlucht rond een offshore-kraanschip bij zonsondergang" width="1280" height="720"
     onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}>
     <source src="./login-vlucht.mp4" type="video/mp4" />
    </video>
    <button type="button" className="film-toggle" onClick={toggle}>{playing ? 'Video pauzeren' : 'Video afspelen'}</button>
   </figure>
  </div>
 </main>;
}
