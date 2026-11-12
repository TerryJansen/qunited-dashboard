import {test,expect} from '@playwright/test';
import {emptyData} from '../src/modules.js';
import {seed,row,navigate,statusTab,filterStatus} from './helpers.js';
export const data={...emptyData(),projecten:[{id:'p1',name:'Project A',status:'Planning'},{id:'p2',name:'Project B',status:'Afgerond'}],personeel:[{id:'e1',name:'Ada',status:'Actief'},{id:'e2',name:'Bram',status:'Actief'}]};
test('Urenstaten validates, cancels, saves references and persists CRUD',async({page})=>{
 await seed(page,data);
 await navigate(page,'Urenstaten');
 await page.getByRole('button',{name:'Toevoegen',exact:true}).click();
 await page.getByLabel('Omschrijving',{exact:true}).fill('Installatie');
 await page.getByLabel('Medewerker',{exact:true}).selectOption('e1');
 await page.getByLabel('Project',{exact:true}).selectOption('p1');
 await page.getByLabel('Werkdatum').fill('2026-11-02');
 const hours=page.getByRole('spinbutton',{name:'Uren',exact:true}), minutes=page.getByRole('spinbutton',{name:'Minuten',exact:true});
 // een nieuwe regel begint op 8:00 met 30 minuten pauze
 await expect(hours).toHaveAttribute('aria-valuenow','8');
 await expect(minutes).toHaveAttribute('aria-valuenow','0');
 await expect(page.getByRole('radio',{name:'30 min'})).toBeChecked();
 await hours.focus();await hours.press('Home');
 await page.getByRole('button',{name:'Opslaan',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('groter dan 0:00');
 await expect(row(page,'Installatie')).toHaveCount(0);
 for(let i=0;i<7;i++)await hours.press('ArrowUp');
 await minutes.focus();for(let i=0;i<3;i++)await minutes.press('PageUp');
 await expect(minutes).toHaveAttribute('aria-valuetext','30');
 await page.getByText('45 min',{exact:true}).click();
 await page.getByRole('button',{name:'Opslaan',exact:true}).click();
 await page.reload();
 const record=row(page,'Installatie');
 await expect(record).toContainText('Ada');
 await expect(record).toContainText('Project A');
 await expect(record).toContainText('7:30');
 await expect(record).toContainText('45 min');
 await record.getByRole('button',{name:'Bewerken',exact:true}).click();
 await expect(hours).toHaveAttribute('aria-valuenow','7');
 await expect(page.getByRole('radio',{name:'45 min'})).toBeChecked();
 await hours.focus();await hours.press('ArrowDown');
 await page.getByRole('button',{name:'Annuleren',exact:true}).click();
 await expect(record).toContainText('7:30');
 await record.getByRole('button',{name:'Bewerken',exact:true}).click();
 await hours.focus();await hours.press('ArrowDown');
 await page.getByLabel('Status',{exact:true}).selectOption('Ingediend');
 await page.getByRole('button',{name:'Opslaan',exact:true}).click();
 await page.reload();await expect(record).toContainText('Ingediend');await expect(record).toContainText('6:30');
 await page.getByLabel('Zoeken').fill('Ada');await expect(record).toHaveCount(1);
 await filterStatus(page,'Concept');await expect(record).toHaveCount(0);
 await page.getByRole('button',{name:'Filters wissen'}).click();await expect(record).toHaveCount(1);
 await expect(statusTab(page,0)).toHaveAttribute('aria-selected','true');
 page.once('dialog',d=>d.dismiss());await record.getByRole('button',{name:'Verwijderen',exact:true}).click();
 await expect(record).toHaveCount(1);
 page.once('dialog',d=>d.accept());await record.getByRole('button',{name:'Verwijderen',exact:true}).click();
 await page.reload();await expect(page.getByText('Nog geen registraties')).toBeVisible();
});

test('the hours wheel turns with the mouse wheel and a tap, and 24:00 is the end',async({page})=>{
 await seed(page,data);
 await page.goto('/#/urenstaten/nieuw');
 const hours=page.getByRole('spinbutton',{name:'Uren',exact:true}), minutes=page.getByRole('spinbutton',{name:'Minuten',exact:true});
 await expect(hours).toHaveAttribute('aria-valuenow','8');
 await hours.hover();await page.mouse.wheel(0,44*2);
 await expect(hours).toHaveAttribute('aria-valuenow','10');
 await minutes.locator('.wheel-item',{hasText:'45'}).click();
 await expect(minutes).toHaveAttribute('aria-valuenow','45');
 await expect(page.getByText('10 uur en 45 minuten')).toBeVisible();
 await hours.focus();await hours.press('End');
 await expect(hours).toHaveAttribute('aria-valuenow','24');
 await expect(minutes).toHaveAttribute('aria-valuenow','0');
 await expect(page.getByText('24 uur',{exact:true})).toBeVisible();
});

test('pause is always there, with one tap per choice, also on a phone',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await seed(page,data);
 await page.goto('/#/urenstaten/nieuw');
 const group=page.getByRole('group',{name:/Pauze/});
 for(const name of ['Geen','15 min','30 min','45 min','1 uur'])await expect(group.getByRole('radio',{name})).toBeVisible();
 await group.getByText('Geen').click();
 await expect(group.getByRole('radio',{name:'Geen'})).toBeChecked();
 const box=await group.getByText('1 uur').boundingBox();
 expect(box.height).toBeGreaterThanOrEqual(44);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('time is set to the minute: 7:37 worked with 37 minutes pause typed in',async({page})=>{
 await seed(page,data);
 await page.goto('/#/urenstaten/nieuw');
 await page.getByLabel('Omschrijving',{exact:true}).fill('Inspectie');
 await page.getByLabel('Medewerker',{exact:true}).selectOption('e1');
 await page.getByLabel('Project',{exact:true}).selectOption('p1');
 await page.getByLabel('Werkdatum').fill('2026-11-02');
 const hours=page.getByRole('spinbutton',{name:'Uren',exact:true}), minutes=page.getByRole('spinbutton',{name:'Minuten',exact:true});
 await hours.focus();await hours.press('ArrowDown');
 await minutes.focus();for(let i=0;i<3;i++)await minutes.press('PageUp');for(let i=0;i<7;i++)await minutes.press('ArrowUp');
 await expect(minutes).toHaveAttribute('aria-valuenow','37');
 await expect(page.getByText('7 uur en 37 minuten')).toBeVisible();
 await page.getByLabel('Pauze in minuten').fill('37');
 await expect(page.getByRole('radio',{name:'30 min'})).not.toBeChecked();
 await page.getByRole('button',{name:'Opslaan',exact:true}).click();
 const record=row(page,'Inspectie');
 await expect(record).toContainText('7:37');
 await expect(record).toContainText('37 min');
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('qunited.records.v1')).urenstaten[0]);
 expect(Math.round(Number(stored.hours)*60)).toBe(457);
 expect(stored.pause).toBe('37');
});

test('the week overview adds up per status and kind, compares with contract hours, and exports',async({page})=>{
 await seed(page,{...emptyData(),
  projecten:[{id:'p1',name:'Project A',status:'In uitvoering'}],
  personeel:[{id:'e1',name:'Ada',number:'400428',contractHours:'40',status:'Actief'},{id:'e2',name:'Bram',status:'Actief'},{id:'e3',name:'Oud',status:'Inactief'}],
  urenstaten:[
   {id:'t1',name:'Maandag',status:'Goedgekeurd',employeeId:'e1',projectId:'p1',date:'2026-11-02',hours:'32',pause:'30',kind:'Indirect'},
   {id:'t2',name:'Dinsdag',status:'Afgekeurd',employeeId:'e1',projectId:'p1',date:'2026-11-03',hours:'8',pause:'30',kind:'Facturabel'},
   {id:'t3',name:'Andere week',status:'Concept',employeeId:'e1',projectId:'p1',date:'2026-11-10',hours:'5',pause:'0'},
  ]});
 await page.goto('/#/urenstaten?week=2026-11-04');
 await expect(page.getByRole('group',{name:'Kies een week'})).toContainText('02-11-2026 - 08-11-2026 (45)');
 const overview=page.getByRole('table',{name:'Uren per medewerker'});
 const rows=overview.locator('tbody').getByRole('row');
 await expect(rows).toHaveCount(2);
 const ada=rows.filter({hasText:'Ada'});
 await expect(ada.getByRole('cell')).toHaveText(['400428','Ada','00:00','00:00','32:00','08:00','08:00','32:00','20%','40:00 / 40:00']);
 await expect(rows.filter({hasText:'Bram'}).getByTestId('week-total')).toHaveText('00:00');
 await expect(page.getByText('Toont 1 tot 2 van 2 rijen')).toBeVisible();
 // klik op de naam: alleen de regels van die medewerker
 await rows.filter({hasText:'Bram'}).getByRole('button',{name:'Bram'}).click();
 await expect(page.getByText('Deze medewerker heeft in deze week geen uren geschreven.')).toBeVisible();
 await ada.getByRole('button',{name:'Ada'}).click();
 await expect(row(page,'Maandag')).toBeVisible();
 await expect(row(page,'Andere week')).toHaveCount(0);
 // zoeken en sorteren
 await page.getByLabel('Zoek medewerker').fill('bram');
 await expect(rows).toHaveCount(1);
 await page.getByLabel('Zoek medewerker').fill('');
 await overview.getByRole('button',{name:'Aantal uur'}).click();
 await expect(rows.first()).toContainText('Bram');
 // de week blijft staan na verversen, en de export bevat wat op het scherm staat
 await page.getByRole('button',{name:'Volgende week'}).click();
 await page.reload();
 await expect(page.getByRole('group',{name:'Kies een week'})).toContainText('(46)');
 await expect(rows.filter({hasText:'Ada'}).getByRole('cell').nth(2)).toHaveText('05:00');
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:'Exporteren'}).click();
 const download=await downloadPromise;
 expect(download.suggestedFilename()).toBe('urenstaten-week-46-2026.csv');
 const {readFileSync}=await import('node:fs');
 expect(readFileSync(await download.path(),'utf8')).toContain('"400428";"Ada";"05:00"');
});
