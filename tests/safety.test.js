import {test,expect} from '@playwright/test';
import {modules} from '../src/modules.js';
import {row,navigate,openMenu} from './helpers.js';
test('validation rejects whitespace, date order and unsafe document links',async({page})=>{
 await page.goto('/#/projecten');await page.getByRole('button',{name:'Toevoegen',exact:true}).click();
 await page.getByLabel('Projectnaam').fill('   ');await page.getByRole('button',{name:'Opslaan',exact:true}).click();await expect(page.getByRole('alert')).toContainText('verplichte');
 await page.getByLabel('Projectnaam').fill('Test');await page.getByLabel('Startdatum').fill('2026-12-02');await page.getByLabel('Einddatum').fill('2026-12-01');await page.getByRole('button',{name:'Opslaan',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Einddatum');
 await page.goto('/#/procedures');await page.getByRole('button',{name:'Toevoegen',exact:true}).click();await page.getByLabel('Titel',{exact:true}).fill('Doc');await page.getByLabel('Documentlink').fill('javascript:alert(1)');await page.getByRole('button',{name:'Opslaan',exact:true}).click();await expect(page.getByRole('alert')).toContainText('http');
 await page.getByLabel('Documentlink').fill('https://example.com/document.pdf');await page.getByRole('button',{name:'Opslaan',exact:true}).click();await expect(page.getByRole('link',{name:'Document openen'})).toHaveAttribute('href','https://example.com/document.pdf');
});
test('invalid saved data does not crash or overwrite existing data',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('qunited.records.v1','{"projecten":42}'));
 await page.goto('/');await expect(page.getByRole('alert')).toContainText('niet overschreven');await expect(page.getByRole('heading',{name:'Overzicht',exact:true})).toBeVisible();
 await navigate(page,'Projecten');await page.getByRole('button',{name:'Toevoegen',exact:true}).click();await page.getByLabel('Projectnaam').fill('Nieuw');await page.getByRole('button',{name:'Opslaan',exact:true}).click();await expect(page.getByRole('alert')).toContainText('niet overschreven');expect(await page.evaluate(()=>localStorage.getItem('qunited.records.v1'))).toBe('{"projecten":42}');
});
test('write failure keeps draft and shows honest error',async({page})=>{
 await page.goto('/#/projecten');await page.evaluate(()=>Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError')});await page.getByRole('button',{name:'Toevoegen',exact:true}).click();await page.getByLabel('Projectnaam').fill('Niet opgeslagen');await page.getByRole('button',{name:'Opslaan',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Opslaan mislukt');await expect(page.getByLabel('Projectnaam')).toHaveValue('Niet opgeslagen');
});
test('mobile navigation, the folded menu, the overview and history',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 // de zijbalk is opgevouwen tot één knop en neemt geen breedte van het scherm
 await expect(page.getByRole('button',{name:'Menu',exact:true})).toBeVisible();
 await openMenu(page);
 const nav=page.getByRole('navigation',{name:'Hoofdnavigatie'});
 for(const m of Object.values(modules).filter(m=>!m.hidden))await expect(nav.getByRole('link',{name:m.title,exact:true})).toBeVisible();
 await expect(nav.getByRole('link',{name:'Planning',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await navigate(page,'Projecten');
 await page.getByRole('button',{name:'Toevoegen',exact:true}).click();await page.getByLabel('Projectnaam').fill('Eigen project');await page.getByRole('button',{name:'Opslaan',exact:true}).click();
 await navigate(page,'Dashboard');
 await expect(page.getByLabel('Lopende en geplande projecten')).toContainText('Eigen project');
 await page.goBack();await expect(page.getByRole('heading',{name:'Projecten',exact:true})).toBeVisible();
 await page.goForward();await expect(page.getByRole('heading',{name:'Overzicht',exact:true})).toBeVisible();
 for(const name of ['Materiaal','Inventaris','Facturatie','IT & support','Procedures','Personeel']){
  await navigate(page,name);await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await navigate(page,'Projecten');await expect(row(page,'Eigen project')).toBeVisible();
});
