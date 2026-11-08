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
 await dialog.getByRole('button',{name:'T/m vrijdag'}).click();
 await expect(dialog.getByLabel('Tot en met')).toHaveValue(plus(monday(),11));
 await dialog.getByLabel(/Rol op project/).fill('Inspecteur');
 // uren per dag: begint op 8:00, hier 6:30
 const hours=dialog.getByRole('spinbutton',{name:'Uren'}), minutes=dialog.getByRole('spinbutton',{name:'Minuten'});
 await expect(hours).toHaveAttribute('aria-valuenow','8');
 // het wiel staat ook zichtbaar op 08, niet op 00
 await expect.poll(()=>hours.evaluate(el=>Math.round(el.scrollTop/44))).toBe(8);
 await hours.focus();await hours.press('ArrowDown');await hours.press('ArrowDown');
 await minutes.focus();await minutes.press('ArrowUp');await minutes.press('ArrowUp');
 await expect(dialog.locator('.plan-summary')).toContainText('6:30 uur per dag');
 await dialog.getByRole('button',{name:'Opslaan'}).click();
 await expect(dialog).toHaveCount(0);
 const ada=page.getByRole('row').filter({hasText:'Ada'});
 const block=ada.getByRole('button',{name:/Project A/});
 await expect(block).toContainText('Gepland');
 await expect(block).toContainText('Inspecteur · 6:30 uur per dag');
 expect(await ada.locator('td').first().getAttribute('colspan')).toBe('5');
 await page.reload();
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('qunited.records.v1')).inzet);
 expect(stored).toHaveLength(1);
 expect(stored[0]).toMatchObject({employeeId:'e1',projectId:'p1',role:'Inspecteur',status:'Gepland',name:'Ada — Project A',hoursPerDay:'6.5'});
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
 await page.getByRole('button',{name:'Opslaan',exact:true}).click();
 await page.goto('/#/inzet');
 await expect(row(page,'Ada — Project A2')).toBeVisible();
});

test('today\'s list and the occupancy report separate busy from available staff',async({page})=>{
 const todayText=new Date().toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'});
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
 await navigate(page,'Rapportages');
 await expect(page.getByRole('heading',{name:`Bezetting vandaag (${todayText})`})).toBeVisible();
 const table=page.getByRole('table',{name:'Bezetting vandaag'});
 await expect(table.getByRole('row').filter({hasText:'Ada'})).toContainText('Project A');
 await expect(table.getByRole('row').filter({hasText:'Bram'})).toContainText('Beschikbaar');
 const waiting=page.waitForEvent('download');
 await page.getByRole('button',{name:'Download inzet CSV'}).click();
 expect((await waiting).suggestedFilename()).toBe('qunited-inzet.csv');
});
