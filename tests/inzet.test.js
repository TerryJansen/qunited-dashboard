import {test,expect} from '@playwright/test';
import {emptyData} from '../src/modules.js';
import {seed,row,navigate} from './helpers.js';
const base={...emptyData(),projecten:[{id:'p1',name:'Project A',status:'In uitvoering'},{id:'p2',name:'Project B',status:'Planning'}],personeel:[{id:'e1',name:'Ada',status:'Actief'},{id:'e2',name:'Bram',status:'Actief'}]};

const iso=d=>d.toLocaleDateString('sv-SE');
const monday=()=>{const d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7));return d};
const plus=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return iso(x)};

test('click a free day in the planning to put someone on a project',async({page})=>{
 await seed(page,base);
 await navigate(page,'Planning');
 await page.getByRole('button',{name:'Volgende week'}).click();
 await page.getByRole('button',{name:/^Ada inplannen op maandag/}).click();
 const dialog=page.getByRole('dialog',{name:'Inzet plannen'});
 await expect(dialog).toBeVisible();
 // de medewerker en de dag staan al goed; geen "uren per week" meer
 await expect(dialog.getByLabel('Medewerker')).toHaveValue('e1');
 await expect(dialog.getByLabel('Van')).toHaveValue(plus(monday(),7));
 await expect(dialog.getByLabel('Uren per week')).toHaveCount(0);
 await dialog.getByRole('button',{name:'Opslaan'}).click();
 await expect(dialog.getByRole('alert')).toContainText('Kies een project');
 await dialog.getByLabel('Project',{exact:true}).selectOption('p1');
 // de melding is een korte pop-up: weg zodra het project gekozen is
 await expect(dialog.getByRole('alert')).toHaveCount(0);
 await dialog.getByRole('button',{name:'T/m vrijdag'}).click();
 await expect(dialog.getByLabel('Tot en met')).toHaveValue(plus(monday(),11));
 await dialog.getByLabel(/Rol op project/).fill('Inspecteur');
 // uren per dag: begint op 8:00, hier 6:30
 const hours=dialog.getByRole('spinbutton',{name:'Uren',exact:true}), minutes=dialog.getByRole('spinbutton',{name:'Minuten',exact:true});
 await expect(hours).toHaveAttribute('aria-valuenow','8');
 // het wiel staat ook zichtbaar op 08, niet op 00
 await expect.poll(()=>hours.evaluate(el=>Math.round(el.scrollTop/44))).toBe(8);
 await hours.focus();await hours.press('ArrowDown');await hours.press('ArrowDown');
 await minutes.focus();for(let i=0;i<3;i++)await minutes.press('PageUp');
 await expect(dialog.locator('.plan-summary')).toContainText('6:30 uur');
 // pauze: begint op 30 min
 const pause=dialog.getByRole('group',{name:/Pauze per dag/});
 await expect(pause.getByRole('radio',{name:'30 min'})).toBeChecked();
 await pause.getByText('45 min',{exact:true}).click();
 await expect(dialog.locator('.plan-summary')).toContainText('6:30 uur · 45 min pauze');
 await dialog.getByRole('button',{name:'Opslaan'}).click();
 await expect(dialog).toHaveCount(0);
 const ada=page.getByRole('row').filter({hasText:'Ada'});
 const block=ada.getByRole('button',{name:/Project A/});
 await expect(block).toContainText('Gepland');
 await expect(block).toContainText('Inspecteur · 6:30 uur per dag · 45 min pauze');
 expect(await ada.locator('td').first().getAttribute('colspan')).toBe('5');
 await page.reload();
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('qunited.records.v1')).inzet);
 expect(stored).toHaveLength(1);
 expect(stored[0]).toMatchObject({employeeId:'e1',projectId:'p1',role:'Inspecteur',status:'Gepland',name:'Ada — Project A',hoursPerDay:'6.5',pause:'45'});
 expect(stored[0]).not.toHaveProperty('hoursPerWeek');
});

test('a block opens the same window to change or remove it, and checks the dates',async({page})=>{
 await seed(page,{...base,inzet:[{id:'i1',name:'Ada — Project A',status:'Actief',employeeId:'e1',projectId:'p1',start:plus(monday(),0),end:plus(monday(),4)}]});
 await page.goto('/#/planning');
 await page.getByRole('row').filter({hasText:'Ada'}).getByRole('button',{name:/Project A/}).click();
 const dialog=page.getByRole('dialog',{name:'Inzet wijzigen'});
 await dialog.getByLabel('Tot en met').fill(plus(monday(),-3));
 await dialog.getByRole('button',{name:'Opslaan'}).click();
 await expect(dialog.getByRole('alert')).toContainText('niet vóór');
 // en hij verdwijnt ook vanzelf
 await expect(dialog.getByRole('alert')).toHaveCount(0,{timeout:6000});
 await dialog.getByLabel('Tot en met').fill(plus(monday(),4));
 await dialog.getByLabel('Project',{exact:true}).selectOption('p2');
 await dialog.getByRole('button',{name:'Opslaan'}).click();
 await expect(page.getByRole('row').filter({hasText:'Ada'})).toContainText('Project B');
 await page.getByRole('row').filter({hasText:'Ada'}).getByRole('button',{name:/Project B/}).click();
 page.once('dialog',d=>d.accept());
 await page.getByRole('dialog',{name:'Inzet wijzigen'}).getByRole('button',{name:'Verwijderen'}).click();
 await expect(page.getByRole('row').filter({hasText:'Ada'})).not.toContainText('Project B');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('qunited.records.v1')).inzet)).toHaveLength(0);
});

test('a person list opens on the people, not on a "Kies medewerker" line',async({page})=>{
 await seed(page,base);
 await page.goto('/#/urenstaten/nieuw');
 const options=page.getByLabel('Medewerker',{exact:true}).locator('option:not([disabled])');
 await expect(options).toHaveText(['Ada','Bram']);
});

test('an assignment blocks deletion of its project and employee',async({page})=>{
 await seed(page,{...base,inzet:[{id:'i1',name:'Ada — Project A',status:'Actief',employeeId:'e1',projectId:'p1',start:'2026-01-01',end:'2026-12-31'}]});
 for(const [route,text] of [['projecten','Project A'],['personeel','Ada']]){
  await page.goto(`/#/${route}`);
  page.once('dialog',d=>d.accept());
  await row(page,text).getByRole('button',{name:'Verwijderen',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Inzet');
  await expect(row(page,text)).toBeVisible();
 }
});

test('the title follows a renamed project instead of going stale',async({page})=>{
 await seed(page,{...base,inzet:[{id:'i1',name:'Ada — Project A',status:'Actief',employeeId:'e1',projectId:'p1',start:'2026-01-01'}]});
 await page.goto('/#/projecten');
 await row(page,'Project A').getByRole('button',{name:'Bewerken',exact:true}).click();
 await page.getByLabel('Projectnaam').fill('Project A2');
 await page.getByLabel('Locatie',{exact:true}).fill('Rotterdam');
 await page.getByRole('button',{name:'Opslaan',exact:true}).click();
 await page.goto('/#/inzet');
 await expect(row(page,'Ada — Project A2')).toBeVisible();
});

test('today\'s list separate busy from available staff',async({page})=>{
 await seed(page,{...base,inzet:[{id:'i1',name:'Ada — Project A',status:'Actief',employeeId:'e1',projectId:'p1',start:'2020-01-01',end:'2099-12-31'}]});
 await page.goto('/#/dashboard');
 await expect(page.getByTestId('deployed-count')).toContainText('1');
 await expect(page.getByTestId('available-count')).toHaveText('1');
 // "wie staat waar vandaag" noemt beide medewerkers, met de vrije bovenaan
 const today=page.getByRole('list',{name:'Wie staat waar vandaag'});
 await expect(today.locator('li').first()).toContainText('Bram');
 await expect(today.locator('li').first()).toContainText('Beschikbaar');
 await expect(today.locator('li').filter({hasText:'Ada'})).toContainText('Project A');
 // het filter op het kerncijfer laat alleen wie niet ingezet is staan
 await page.getByRole('button',{name:/Beschikbaar vandaag/}).click();
 await expect(today.locator('li')).toHaveCount(1);
});

test('travel time is worked out from home to the project location, not picked',async({page})=>{
 const asked=[];
 await page.route('https://nominatim.openstreetmap.org/**',route=>{const q=new URL(route.request().url()).searchParams.get('q');asked.push(q);return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{lat:q.includes('Kinderdijk')?'51.88':'51.92',lon:'4.6',display_name:q}])})});
 await page.route('https://router.project-osrm.org/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({routes:[{duration:1500,distance:21400}]})}));
 await seed(page,{...base,
  personeel:[{id:'e1',name:'Ada',status:'Actief',home:'3011 AB Rotterdam'},{id:'e2',name:'Bram',status:'Actief'}],
  projecten:[{id:'p1',name:'IHC',location:'Kinderdijk',status:'In uitvoering'},{id:'p2',name:'Zonder plek',status:'Planning'}]});
 await page.goto('/#/planning');
 await page.getByRole('button',{name:'Volgende week'}).click();
 await page.getByRole('button',{name:/^Ada inplannen op maandag/}).click();
 const dialog=page.getByRole('dialog',{name:'Inzet plannen'});
 // reistijd is geen keuze meer
 await expect(dialog.getByRole('group',{name:/Reistijd per dag/})).toHaveCount(0);
 await dialog.getByLabel('Project',{exact:true}).selectOption('p1');
 await expect(dialog.getByRole('radio',{name:'Huis · 3011 AB Rotterdam'})).toBeChecked();
 await expect(dialog.getByText('3011 AB Rotterdam → Kinderdijk')).toBeVisible();
 const result=dialog.getByTestId('travel-result');
 await expect(result).toContainText('50 min');
 await expect(result).toContainText('enkele reis 25 min · 21 km');
 expect(asked).toEqual(['3011 AB Rotterdam','Kinderdijk']);
 // een ander vertrekadres rekent opnieuw
 await dialog.getByText('Ander adres',{exact:true}).click();
 await expect(result).not.toContainText('50 min');
 await dialog.getByLabel('Vertrekadres').fill('Dordrecht');
 await expect(result).toContainText('50 min');
 await dialog.getByRole('button',{name:'Opslaan'}).click();
 await expect(dialog).toHaveCount(0);
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('qunited.records.v1')).inzet[0]);
 expect(stored).toMatchObject({travelFromKind:'adres',travelFrom:'Dordrecht',travelTo:'Kinderdijk',travelOneWay:'25',travel:'50',distanceKm:'21'});
 await expect(page.getByRole('row').filter({hasText:'Ada'})).toContainText('50 min reistijd');
 // een project zonder locatie zegt dat eerlijk, en Bram zonder adres ook
 await page.getByRole('button',{name:/^Bram inplannen op maandag/}).click();
 const second=page.getByRole('dialog',{name:'Inzet plannen'});
 await second.getByLabel('Project',{exact:true}).selectOption('p2');
 await expect(second.getByTestId('travel-result')).toContainText('nog geen locatie');
 await second.getByLabel('Project',{exact:true}).selectOption('p1');
 await expect(second.getByRole('radio',{name:/Huis \(nog geen adres\)/})).toBeDisabled();
});

test('a place the map does not know gives a plain message, not a made-up time',async({page})=>{
 await page.route('https://nominatim.openstreetmap.org/**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
 await seed(page,{...base,personeel:[{id:'e1',name:'Ada',status:'Actief',home:'Nergenshuizen'}],projecten:[{id:'p1',name:'IHC',location:'Kinderdijk',status:'In uitvoering'}]});
 await page.goto('/#/planning');
 await page.getByRole('button',{name:'Iemand inplannen'}).click();
 const dialog=page.getByRole('dialog',{name:'Inzet plannen'});
 await dialog.getByLabel('Medewerker',{exact:true}).selectOption('e1');
 await dialog.getByLabel('Project',{exact:true}).selectOption('p1');
 await expect(dialog.getByTestId('travel-result')).toContainText('staat niet op de kaart');
});

test('a project needs a location before it can be saved',async({page})=>{
 await page.goto('/#/projecten/nieuw');
 await page.getByLabel('Projectnaam').fill('Zonder locatie');
 await page.getByRole('button',{name:'Opslaan',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('verplichte velden');
 await expect(page.getByText(/heliport/)).toBeVisible();
});
