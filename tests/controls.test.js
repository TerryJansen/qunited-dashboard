import {test,expect} from '@playwright/test';
import {modules} from '../src/modules.js';
import {navigate,openMenu,statusTab} from './helpers.js';
test('every module cancel/reset and all navigation links work on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 for(const m of Object.values(modules)){
  await navigate(page,m.title);
  await expect(page.getByRole('heading',{name:m.title,exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Toevoegen',exact:true}).click();
  await page.getByRole('button',{name:'Annuleren',exact:true}).click();
  await expect(page.locator('.editor')).toHaveCount(0);
  await page.getByLabel('Zoeken').fill('niet gevonden');
  await statusTab(page,1).click();
  await expect(statusTab(page,1)).toHaveAttribute('aria-selected','true');
  await page.getByRole('button',{name:'Filters wissen'}).click();
  await expect(page.getByLabel('Zoeken')).toHaveValue('');
  await expect(statusTab(page,0)).toHaveAttribute('aria-selected','true');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 const last=Object.values(modules).at(-1).title;
 await navigate(page,'Rapportages');await expect(page.getByRole('heading',{name:'Rapportages',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.goBack();await expect(page.getByRole('heading',{name:last,exact:true})).toBeVisible();
 await page.goForward();await expect(page.getByRole('heading',{name:'Rapportages',exact:true})).toBeVisible();
 await navigate(page,'Back-up');await expect(page.getByRole('heading',{name:'Back-up',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await openMenu(page);await page.locator('.brand').click();
 await expect(page.getByRole('heading',{name:'Overzicht',exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Inzet toevoegen',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Inzet',exact:true})).toBeVisible();
 await expect(page.locator('.editor')).toHaveCount(1);
 await page.goto('/#/missing');await page.getByRole('link',{name:'Naar dashboard',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Overzicht',exact:true})).toBeVisible();
});
