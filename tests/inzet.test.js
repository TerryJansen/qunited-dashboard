import {test,expect} from '@playwright/test';
import {emptyData} from '../src/modules.js';
import {seed,row,navigate} from './helpers.js';
const base={...emptyData(),projecten:[{id:'p1',name:'Project A',status:'In uitvoering'},{id:'p2',name:'Project B',status:'Planning'}],personeel:[{id:'e1',name:'Ada',status:'Actief'},{id:'e2',name:'Bram',status:'Actief'}]};

test('Inzet titles itself from employee and project, and validates the period',async({page})=>{
 await seed(page,base);
 await navigate(page,'Inzet');
 await page.getByRole('button',{name:'Toevoegen',exact:true}).click();
 await page.getByLabel('Medewerker',{exact:true}).selectOption('e1');
 await page.getByLabel('Project',{exact:true}).selectOption('p1');
 await page.getByLabel('Van',{exact:true}).fill('2026-12-01');
 await page.getByLabel('Tot en met',{exact:true}).fill('2026-11-30');
 await page.getByRole('button',{name:'Opslaan',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Einddatum');
 await page.getByLabel('Tot en met',{exact:true}).fill('2026-12-31');
 await page.getByLabel('Uren per week').fill('99');
 await page.getByRole('button',{name:'Opslaan',exact:true}).click();
 await expect(row(page,'Ada — Project A')).toHaveCount(0);
 await page.getByLabel('Uren per week').fill('32');
 await page.getByLabel('Rol op project').fill('Inspecteur');
 await page.getByRole('button',{name:'Opslaan',exact:true}).click();
 await expect(row(page,'Ada — Project A')).toBeVisible();
 await page.reload();
 await expect(row(page,'Ada — Project A')).toContainText('Inspecteur');
 await expect(row(page,'Ada — Project A')).toContainText('32');
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
