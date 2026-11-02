import {test,expect} from '@playwright/test';
import {modules} from '../src/modules.js';
test('every module cancel/reset and all navigation links work on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 for(const [id,m] of Object.entries(modules)){
 await page.getByRole('navigation',{name:'Hoofdnavigatie'}).getByRole('link',{name:m.title,exact:true}).click();await expect(page.getByRole('heading',{name:m.title,exact:true})).toBeVisible();await page.getByRole('button',{name:'Toevoegen',exact:true}).click();await page.getByRole('button',{name:'Annuleren',exact:true}).click();await expect(page.locator('.editor')).toHaveCount(0);await page.getByLabel('Zoeken').fill('niet gevonden');await page.getByLabel('Filter op status').selectOption({index:1});await page.getByRole('button',{name:'Filters wissen'}).click();await expect(page.getByLabel('Zoeken')).toHaveValue('');await expect(page.getByLabel('Filter op status')).toHaveValue('');
 }
 const last=Object.values(modules).at(-1).title;
 await page.getByRole('navigation').getByRole('link',{name:'Rapportages',exact:true}).click();await expect(page.getByRole('heading',{name:'Rapportages',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.goBack();await expect(page.getByRole('heading',{name:last,exact:true})).toBeVisible();await page.goForward();await expect(page.getByRole('heading',{name:'Rapportages',exact:true})).toBeVisible();await page.locator('.brand').click();
 await page.getByRole('navigation').getByRole('link',{name:'Back-up',exact:true}).click();await expect(page.getByRole('heading',{name:'Back-up',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('.brand').click();
 for(const name of ['Urenstaten','Rapportages','Back-up']){await page.locator('.quick-grid').getByRole('link',{name:new RegExp(name)}).click();await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();await page.locator('.brand').click()}
 await page.getByRole('link',{name:'Naar projecten',exact:true}).click();await expect(page.getByRole('heading',{name:'Projecten',exact:true})).toBeVisible();await page.goto('/#/missing');await page.getByRole('link',{name:'Naar dashboard',exact:true}).click();await expect(page.getByRole('heading',{name:'Dashboard',exact:true})).toBeVisible();
});
