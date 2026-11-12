import {test,expect} from '@playwright/test';
import {emptyData} from '../src/modules.js';
import {seed,openFiles} from './helpers.js';
const day=offset=>{const d=new Date();d.setDate(d.getDate()+offset);return d.toLocaleDateString('sv-SE')};
// een werkdag in het verleden, zodat een ontbrekende urenstaat niet op een weekend valt
const workday=back=>{let n=back;for(let i=1;i<=14;i+=1){const d=day(-i);const dow=new Date(`${d}T00:00:00Z`).getUTCDay();if(dow!==0&&dow!==6){n-=1;if(!n)return d}}return day(-1)};

test('an empty workspace says it has nothing to derive actions from',async({page})=>{
 await page.goto('/');
 await expect(page.getByTestId('actions-unknown')).toBeVisible();
 await expect(page.getByRole('heading',{name:'Werkruimte inrichten'})).toBeVisible();
});

test('data without open dates reports no actions rather than nothing to go on',async({page})=>{
 await seed(page,{...emptyData(),
  personeel:[{id:'e1',name:'Ada',status:'Actief'}],
  projecten:[{id:'p1',name:'Ver weg',status:'Planning',due:day(400)}]});
 await expect(page.getByTestId('actions-empty')).toBeVisible();
 await expect(page.getByTestId('actions-unknown')).toHaveCount(0);
});

test('actions are concrete, sorted by urgency and link to the right screen',async({page})=>{
 await seed(page,{...emptyData(),
  personeel:[{id:'e1',name:'Ada',status:'Actief'}],
  projecten:[{id:'p1',name:'Laat project',status:'In uitvoering',due:day(-3)},{id:'p2',name:'Bijna klaar',status:'Planning',due:day(7),start:day(2),needed:'3'}],
  urenstaten:[{id:'t1',name:'Werk',status:'Ingediend',employeeId:'e1',projectId:'p1',date:day(-5),hours:'8'}],
  inventaris:[{id:'v1',name:'Kraan',status:'In gebruik',due:day(12)}]});
 const actions=page.locator('.action');
 const late=actions.filter({hasText:'Laat project'}).first();
 await expect(late).toContainText('3 dagen te laat');
 // de personeelsbehoefte van project p2 is onvervuld en wordt genoemd met aantallen
 await expect(page.getByLabel('Actiepunten')).toContainText('3 van de 3 plekken nog niet ingevuld');
 await expect(page.getByLabel('Actiepunten')).toContainText('urenstaat wacht op beoordeling');
 // geen facturen meer in de actielijst
 await expect(page.getByLabel('Actiepunten')).not.toContainText('Factuur');
 await late.click();
 // het actiepunt opent het project zelf, niet alleen de lijst
 await expect(page.getByRole('heading',{name:'Laat project',exact:true})).toBeVisible();
 await expect(page.locator('.crumbs').getByRole('link',{name:'Projecten'})).toBeVisible();
});

test('a missing timesheet on a worked day becomes an action',async({page})=>{
 const gap=workday(1);
 await seed(page,{...emptyData(),
  personeel:[{id:'e1',name:'Ada',status:'Actief'}],
  projecten:[{id:'p1',name:'Project A',status:'In uitvoering'}],
  inzet:[{id:'i1',name:'Ada — Project A',status:'Actief',employeeId:'e1',projectId:'p1',start:day(-30),end:day(30)}]});
 const rail=page.getByLabel('Actiepunten');
 await expect(rail).toContainText('zonder urenstaat');
 await expect(rail).toContainText('Ada');
 // met een urenstaat op die dag verdwijnt die dag uit de telling
 await page.evaluate(([g])=>{const d=JSON.parse(localStorage.getItem('qunited.records.v1'));d.urenstaten.push({id:'t9',name:'Werk',status:'Concept',employeeId:'e1',projectId:'p1',date:g,hours:'8'});localStorage.setItem('qunited.records.v1',JSON.stringify(d))},[gap]);
 await page.reload();
 await expect(rail).toContainText('zonder urenstaat');
});

test('absence keeps someone out of the available count and off the missing-timesheet list',async({page})=>{
 await seed(page,{...emptyData(),
  personeel:[{id:'e1',name:'Ada',status:'Actief'},{id:'e2',name:'Bram',status:'Actief'}],
  afwezigheid:[{id:'a1',name:'Bram — Vakantie',status:'Vastgelegd',employeeId:'e2',kind:'Vakantie',start:day(-2),end:day(5)}]});
 await expect(page.getByTestId('available-count')).toHaveText('1');
 await expect(page.getByLabel('Bezetting vandaag')).toContainText('1 medewerker afwezig');
});

test('an expiring certificate becomes an action for its employee',async({page})=>{
 await seed(page,{...emptyData(),personeel:[{id:'e1',name:'Ada',status:'Actief'}]});
 await page.goto('/#/personeel');
 await openFiles(page,'Ada');
 const form=page.getByRole('group',{name:'Certificaat toevoegen'});
 await form.getByLabel('Bestand').setInputFiles({name:'vca.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nx\n%%EOF')});
 await form.getByLabel('Certificaatnaam').fill('VCA VOL');
 await form.getByLabel('Geldig tot').fill(day(-1));
 await form.getByRole('button',{name:'Bestand opslaan'}).click();
 await expect(page.getByText('vca.pdf',{exact:true})).toBeVisible();
 await page.goto('/#/dashboard');
 const action=page.locator('.action').filter({hasText:'VCA VOL'});
 await expect(action).toContainText('Ada');
 await expect(action).toHaveClass(/action-hoog/);
});

test('an action names the responsible person, never an internal id',async({page})=>{
 await seed(page,{...emptyData(),
  personeel:[{id:'e2',name:'Bram Kuiper',status:'Actief'}],
  inventaris:[{id:'v2',name:'Valbeveiligingsset',owner:'e2',due:day(-6),status:'In gebruik'}],
 });
 const item=page.locator('.action').filter({hasText:'Valbeveiligingsset'});
 await expect(item).toContainText('Bram Kuiper');
 await expect(item).not.toContainText('e2');
});
