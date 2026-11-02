import {test,expect} from '@playwright/test';
import {emptyData} from '../src/modules.js';
const base={...emptyData(),projecten:[{id:'p1',name:'Project A',status:'In uitvoering'},{id:'p2',name:'Project B',status:'Planning'}],personeel:[{id:'e1',name:'Ada',status:'Actief'},{id:'e2',name:'Bram',status:'Actief'}]};
async function seed(page,data=base){await page.goto('/');await page.evaluate(d=>localStorage.setItem('qunited.records.v1',JSON.stringify(d)),data);await page.reload()}

test('Inzet titles itself from employee and project, and validates the period',async({page})=>{
 await seed(page);
 await page.getByRole('navigation').getByRole('link',{name:'Inzet',exact:true}).click();
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
 await expect(page.getByRole('article')).toHaveCount(0);
 await page.getByLabel('Uren per week').fill('32');
 await page.getByLabel('Rol op project').fill('Inspecteur');
 await page.getByRole('button',{name:'Opslaan',exact:true}).click();
 const record=page.getByRole('article');
 await expect(record.getByRole('heading',{name:'Ada — Project A'})).toBeVisible();
 await page.reload();
 await expect(record).toContainText('Inspecteur');
 await expect(record).toContainText('32');
});

test('an assignment blocks deletion of its project and employee',async({page})=>{
 await seed(page,{...base,inzet:[{id:'i1',name:'Ada — Project A',status:'Actief',employeeId:'e1',projectId:'p1',start:'2026-01-01',end:'2026-12-31'}]});
 for(const route of ['projecten','personeel']){
  await page.goto(`/#/${route}`);
  page.once('dialog',d=>d.accept());
  await page.getByRole('article').filter({hasText:route==='projecten'?'Project A':'Ada'}).getByRole('button',{name:'Verwijderen',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Inzet');
 }
});

test('the title follows a renamed project instead of going stale',async({page})=>{
 await seed(page,{...base,inzet:[{id:'i1',name:'Ada — Project A',status:'Actief',employeeId:'e1',projectId:'p1',start:'2026-01-01'}]});
 await page.goto('/#/projecten');
 await page.getByRole('article').filter({hasText:'Project A'}).getByRole('button',{name:'Bewerken',exact:true}).click();
 await page.getByLabel('Projectnaam').fill('Project A2');
 await page.getByRole('button',{name:'Opslaan',exact:true}).click();
 await page.goto('/#/inzet');
 await expect(page.getByRole('heading',{name:'Ada — Project A2'})).toBeVisible();
});

test('occupancy report separates busy from available staff',async({page})=>{
 const today=new Date().toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'});
 await seed(page,{...base,inzet:[{id:'i1',name:'Ada — Project A',status:'Actief',employeeId:'e1',projectId:'p1',start:'2020-01-01',end:'2099-12-31'}]});
 await page.goto('/#/dashboard');
 await expect(page.getByTestId('assignment-count')).toHaveText('1');
 await expect(page.getByTestId('available-count')).toHaveText('1');
 await page.getByRole('navigation').getByRole('link',{name:'Rapportages',exact:true}).click();
 await expect(page.getByRole('heading',{name:`Bezetting vandaag (${today})`})).toBeVisible();
 await expect(page.getByTestId('occupied-count')).toHaveText('1');
 await expect(page.getByTestId('available-today')).toHaveText('1');
 const table=page.getByRole('table',{name:'Bezetting vandaag'});
 await expect(table.getByRole('row').filter({hasText:'Ada'})).toContainText('Project A');
 await expect(table.getByRole('row').filter({hasText:'Bram'})).toContainText('Beschikbaar');
 const waiting=page.waitForEvent('download');
 await page.getByRole('button',{name:'Download inzet CSV'}).click();
 const file=await waiting;
 expect(file.suggestedFilename()).toBe('qunited-inzet.csv');
});
