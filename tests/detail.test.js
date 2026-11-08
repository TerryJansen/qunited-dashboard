import {test,expect} from '@playwright/test';
import {emptyData} from '../src/modules.js';
import {seed,row} from './helpers.js';
const day=offset=>{const d=new Date();d.setDate(d.getDate()+offset);return d.toLocaleDateString('sv-SE')};
const data={...emptyData(),
 personeel:[{id:'e1',name:'Terry Jansen',role:'QA/QC',email:'t@example.nl',phone:'06 1111 2222',status:'Actief',notes:''}],
 projecten:[{id:'p1',name:'IHC defense',client:'IHC Holland',location:'Kinderdijk',owner:'T. Jansen',start:day(1),due:day(40),progress:'10',needed:'2',status:'In uitvoering',notes:'Werk aan de romp.'}],
 inzet:[{id:'i1',name:'Terry Jansen — IHC defense',status:'Gepland',employeeId:'e1',projectId:'p1',role:'Inspecteur',start:day(1),end:day(40),hoursPerWeek:'40',notes:''}],
 urenstaten:[{id:'t1',name:'Voorbereiding',status:'Concept',employeeId:'e1',projectId:'p1',date:day(-1),hours:'4'}]};

test('a block in the planning opens the project with its details',async({page})=>{
 await seed(page,data);
 await page.goto('/#/planning');
 // de inzet begint morgen; staat morgen in een volgende week, blader dan door
 if(!await page.locator('.agenda-block').filter({hasText:'IHC defense'}).count())await page.getByRole('button',{name:'Volgende week'}).click();
 await page.locator('.agenda-block').filter({hasText:'IHC defense'}).first().click();
 await expect(page.getByRole('heading',{name:'IHC defense',exact:true})).toBeVisible();
 // de gegevens die je op een projectpagina verwacht
 const gegevens=page.getByRole('region',{name:'Gegevens'}).or(page.locator('.detail-grid'));
 await expect(page.locator('.detail-grid')).toContainText('Kinderdijk');
 await expect(page.locator('.detail-grid')).toContainText('IHC Holland');
 await expect(page.locator('.detail-grid')).toContainText('T. Jansen');
 await expect(page.locator('.detail-grid')).toContainText('Werk aan de romp.');
 // en wat er aan dit project hangt
 await expect(page.getByRole('table',{name:/Inzet bij IHC defense/})).toContainText('Terry Jansen');
 await expect(page.getByRole('table',{name:/Urenstaten bij IHC defense/})).toContainText('Voorbereiding');
 // de bezetting tegenover de behoefte
 await expect(page.locator('.detail-grid')).toContainText('1 / 2');
});

test('the detail page edits, refuses an unsafe delete and links on',async({page})=>{
 await seed(page,data);
 await page.goto('/#/projecten/p1');
 page.once('dialog',d=>d.accept());
 await page.getByRole('button',{name:'Verwijderen',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Inzet');
 await page.getByRole('button',{name:'Bewerken',exact:true}).click();
 await page.getByLabel('Locatie').fill('Krimpen aan den IJssel');
 await page.getByRole('button',{name:'Opslaan',exact:true}).click();
 await expect(page.locator('.detail-grid')).toContainText('Krimpen aan den IJssel');
 await page.reload();
 await expect(page.locator('.detail-grid')).toContainText('Krimpen aan den IJssel');
 // doorklikken naar de medewerker via de gekoppelde inzet
 await page.getByRole('table',{name:/Inzet bij IHC defense/}).getByRole('link',{name:'Terry Jansen — IHC defense'}).click();
 await expect(page.getByRole('heading',{name:'Terry Jansen — IHC defense',exact:true})).toBeVisible();
 await expect(page.locator('.detail-grid').getByRole('link',{name:'IHC defense'})).toBeVisible();
});

test('a row title in a module opens that record',async({page})=>{
 await seed(page,data);
 await page.goto('/#/personeel');
 await row(page,'Terry Jansen').getByRole('link',{name:'Terry Jansen'}).click();
 await expect(page.getByRole('heading',{name:'Terry Jansen',exact:true})).toBeVisible();
 await expect(page.locator('.detail-grid')).toContainText('QA/QC');
 await expect(page.getByRole('group',{name:'CV toevoegen'})).toBeVisible();
});

test('a removed record says so instead of crashing',async({page})=>{
 await seed(page,data);
 await page.goto('/#/projecten/bestaat-niet');
 await expect(page.getByRole('heading',{name:'Niet gevonden',exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Terug naar Projecten'}).click();
 await expect(page.getByRole('heading',{name:'Projecten',exact:true})).toBeVisible();
});
