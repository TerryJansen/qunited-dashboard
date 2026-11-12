import {test,expect} from '@playwright/test';
import {emptyData} from '../src/modules.js';
import {seed,row,navigate} from './helpers.js';
test('existing v1 data upgrades without losing records; timesheets guide empty references',async({page})=>{
 const legacy=emptyData();delete legacy.urenstaten;legacy.projecten=[{id:'p',name:'Bestaand',status:'Planning'}];
 await seed(page,legacy);
 await expect(page.getByRole('alert')).toHaveCount(0);
 await expect(page.getByRole('region',{name:'Lopende en geplande projecten'})).toContainText('Bestaand');
 await page.goto('/#/urenstaten');
 await expect(page.getByText('Voeg eerst medewerkers toe.')).toBeVisible();
 await page.getByRole('link',{name:'Medewerkers toevoegen'}).click();
 await expect(page.getByRole('heading',{name:'Personeel',exact:true})).toBeVisible();
 await page.goBack();
 await navigate(page,'Projecten');
 await expect(row(page,'Bestaand')).toBeVisible();
});
test('an empty workspace names every missing reference',async({page})=>{
 await page.goto('/#/inzet');await expect(page.getByText('Voeg eerst medewerkers en projecten toe.')).toBeVisible();
 await page.getByRole('link',{name:'Projecten toevoegen'}).click();await expect(page.getByRole('heading',{name:'Projecten',exact:true})).toBeVisible();
});
test('timesheet references cannot be deleted accidentally',async({page})=>{
 await seed(page,{...emptyData(),projecten:[{id:'p',name:'Project',status:'Planning'}],personeel:[{id:'e',name:'Medewerker',status:'Actief'}],urenstaten:[{id:'t',name:'Werk',status:'Concept',projectId:'p',employeeId:'e',hours:'1',date:'2026-11-02'}]});
 for(const [route,text] of [['projecten','Project'],['personeel','Medewerker']]){
  await page.goto('/#/'+route);
  page.once('dialog',d=>d.accept());
  await row(page,text).getByRole('button',{name:'Verwijderen',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Urenstaten');
  await expect(row(page,text)).toBeVisible();
 }
});
