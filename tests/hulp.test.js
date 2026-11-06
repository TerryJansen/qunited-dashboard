import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {emptyData} from '../src/modules.js';
import {seed,navigate,SIGNED_IN} from './helpers.js';

// De echte dienst wordt nooit aangeroepen: elk verzoek naar Anthropic wordt hier onderschept.
const API='https://api.anthropic.com/v1/messages';
const answer=text=>({status:200,contentType:'application/json',body:JSON.stringify({content:[{type:'text',text}]})});

async function withKey(page,data=emptyData()){
 await seed(page,data);
 await page.evaluate(()=>localStorage.setItem('qunited.assistantKey','sk-test-123'));
 await page.goto('/#/hulp');
}

test('without a key the page explains how to set one up and calls nothing',async({page})=>{
 let calls=0;
 await page.route(API,route=>{calls++;return route.fulfill(answer('x'))});
 await page.goto('/');
 await navigate(page,'Hulp');
 await expect(page.getByRole('heading',{name:'Hulp instellen'})).toBeVisible();
 await expect(page.getByText('Amerikaans bedrijf')).toBeVisible();
 await page.getByRole('button',{name:'Sleutel opslaan'}).click();
 await expect(page.getByRole('alert')).toContainText('Plak eerst je sleutel');
 await page.getByLabel('API-sleutel').fill('  sk-test-abc  ');
 await page.getByRole('button',{name:'Sleutel opslaan'}).click();
 await expect(page.getByLabel('Je vraag')).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('qunited.assistantKey'))).toBe('sk-test-abc');
 expect(calls).toBe(0);
});

test('a question goes out with the right headers and no workspace data, and the answer shows',async({page})=>{
 let request;
 await page.route(API,route=>{request=route.request();return route.fulfill(answer('1. Klik op "Personeel".\n2. Klik op "Toevoegen".'))});
 await withKey(page,{...emptyData(),personeel:[{id:'e1',name:'Jan de Vries',phone:'0612345678',status:'Actief'}]});
 await page.getByRole('button',{name:'Hoe voeg ik een nieuwe medewerker toe?'}).click();
 await expect(page.getByRole('log')).toContainText('Klik op "Toevoegen".');
 const headers=request.headers();
 expect(headers['x-api-key']).toBe('sk-test-123');
 expect(headers['anthropic-version']).toBe('2023-06-01');
 expect(headers['anthropic-dangerous-direct-browser-access']).toBe('true');
 const body=request.postDataJSON();
 expect(body.model).toBe('claude-haiku-5-5');
 expect(body.messages).toEqual([{role:'user',content:'Hoe voeg ik een nieuwe medewerker toe?'}]);
 expect(body.system).toContain('Qunited');
 expect(JSON.stringify(body)).not.toContain('Jan de Vries');
});

test('with the box ticked the workspace goes along, without phone numbers or e-mail',async({page})=>{
 let body;
 await page.route(API,route=>{body=route.request().postDataJSON();return route.fulfill(answer('Jan staat op IHC.'))});
 await withKey(page,{...emptyData(),
  personeel:[{id:'e1',name:'Jan de Vries',role:'Lasser',phone:'0612345678',email:'jan@voorbeeld.nl',status:'Actief'}],
  projecten:[{id:'p1',name:'IHC',status:'In uitvoering'}],
 });
 await page.getByLabel(/Mijn gegevens meesturen/).check();
 await expect(page.getByRole('note').filter({hasText:'Verenigde Staten'})).toBeVisible();
 await page.getByLabel('Je vraag').fill('Waar staat Jan?');
 await page.getByRole('button',{name:'Versturen'}).click();
 await expect(page.getByRole('log')).toContainText('Jan staat op IHC.');
 expect(body.system).toContain('Jan de Vries');
 expect(body.system).toContain('Lasser');
 expect(body.system).not.toContain('0612345678');
 expect(body.system).not.toContain('jan@voorbeeld.nl');
});

test('the conversation continues with the earlier turns',async({page})=>{
 const bodies=[];
 await page.route(API,route=>{bodies.push(route.request().postDataJSON());return route.fulfill(answer(`Antwoord ${bodies.length}`))});
 await withKey(page);
 await page.getByLabel('Je vraag').fill('Eerste vraag');
 await page.getByLabel('Je vraag').press('Enter');
 await expect(page.getByRole('log')).toContainText('Antwoord 1');
 await page.getByLabel('Je vraag').fill('Tweede vraag');
 await page.getByRole('button',{name:'Versturen'}).click();
 await expect(page.getByRole('log')).toContainText('Antwoord 2');
 expect(bodies[1].messages.map(m=>m.role)).toEqual(['user','assistant','user']);
 await page.getByRole('button',{name:'Nieuw gesprek'}).click();
 await expect(page.getByRole('log')).not.toContainText('Antwoord 1');
});

test('a rejected key gives a plain explanation and the question stays in the box',async({page})=>{
 await page.route(API,route=>route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({type:'error',error:{type:'authentication_error',message:'invalid x-api-key'}})}));
 await withKey(page);
 await page.getByLabel('Je vraag').fill('Hallo?');
 await page.getByRole('button',{name:'Versturen'}).click();
 await expect(page.getByRole('alert')).toContainText('De sleutel wordt niet geaccepteerd');
 await expect(page.getByLabel('Je vraag')).toHaveValue('Hallo?');
 await expect(page.getByRole('log')).not.toContainText('Hallo?');
});

test('no connection is reported as such',async({page})=>{
 await page.route(API,route=>route.abort('internetdisconnected'));
 await withKey(page);
 await page.getByLabel('Je vraag').fill('Hallo?');
 await page.getByRole('button',{name:'Versturen'}).click();
 await expect(page.getByRole('alert')).toContainText('geen verbinding');
});

test('the key never ends up in a backup, and can be removed',async({page})=>{
 await withKey(page,{...emptyData(),personeel:[{id:'e1',name:'Ada',status:'Actief'}]});
 await page.goto('/#/backup');
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:'Back-up downloaden'}).click();
 const download=await downloadPromise;
 const text=readFileSync(await download.path(),'utf8');
 expect(text).toContain('Ada');
 expect(text).not.toContain('sk-test-123');
 await page.goto('/#/hulp');
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Sleutel verwijderen'}).click();
 await expect(page.getByRole('heading',{name:'Hulp instellen'})).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('qunited.assistantKey'))).toBeNull();
});

test('on a phone the help page fits and the question box is reachable',async({browser})=>{
 const context=await browser.newContext({storageState:SIGNED_IN,viewport:{width:390,height:844}});
 const page=await context.newPage();
 await page.route(API,route=>route.fulfill(answer('Klik op "Menu" en dan op "Back-up".')));
 await withKey(page);
 await page.getByRole('button',{name:'Hoe maak ik een back-up?'}).click();
 await expect(page.getByRole('log')).toContainText('Back-up');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.getByLabel('Je vraag')).toBeVisible();
 await context.close();
});
