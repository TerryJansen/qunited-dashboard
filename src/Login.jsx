import React from 'react';
import Logo from './Logo';
import { signIn } from './session';

export default function Login({ onEnter }) {
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
   <figure className="login-photo">
    <img src="./login-platform.jpg" alt="Offshoreplatform op zee met een oranje kraan" width="444" height="578" />
   </figure>
  </div>
 </main>;
}
