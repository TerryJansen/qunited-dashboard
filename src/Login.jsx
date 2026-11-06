import React from 'react';
import Logo from './Logo';
import { signIn } from './session';

function greeting(hour) {
 if (hour < 6) return 'Goedenacht';
 if (hour < 12) return 'Goedemorgen';
 if (hour < 18) return 'Goedemiddag';
 return 'Goedenavond';
}

export default function Login({ onEnter }) {
 function enter(event) {
  event.preventDefault();
  signIn();
  onEnter();
 }
 return <main className="login">
  {/* De foto ligt achter alles, met een donkerblauwe laag erover. */}
  <img className="login-backdrop" src="./login-achtergrond.jpg" alt="" aria-hidden="true" />

  <section className="login-card" aria-labelledby="login-title">
   <Logo className="login-logo" />
   <h1 id="login-title">{greeting(new Date().getHours())}</h1>
   <p className="login-lead">Log in op de werkruimte van Qunited.</p>
   <form onSubmit={enter}>
    <button className="login-button" type="submit">Inloggen</button>
   </form>
   <p className="login-note">Een wachtwoord is nog niet nodig.</p>
  </section>

  <p className="login-tagline">Quality Engineering, Assurance and Control</p>
 </main>;
}
