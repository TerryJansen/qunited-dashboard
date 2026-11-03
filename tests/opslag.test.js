import {test,expect} from '@playwright/test';
import {emptyData} from '../src/modules.js';
import {seed,row,openFiles} from './helpers.js';

// Doe alsof de browser wel of geen blijvende opslag toezegt, en tel hoe vaak erom gevraagd wordt.
const fakeStorage=granted=>()=>{
 window.__persistCalls=0;
 let state=false;
 Object.defineProperty(navigator,'storage',{configurable:true,value:{
  persisted:async()=>state,
  persist:async()=>{window.__persistCalls+=1;state=GRANTED;return state},
  estimate:async()=>({usage:0,quota:1e9}),
 }});
};
const withStorage=(page,granted)=>page.addInitScript(`(${fakeStorage(granted).toString().replace('GRANTED',String(granted))})()`);

test('saving something asks the browser to keep the data',async({page})=>{
 await withStorage(page,true);
 await page.goto('/#/projecten');
 expect(await page.evaluate(()=>window.__persistCalls)).toBe(0);
 await page.getByRole('button',{name:'Toevoegen',exact:true}).click();
 await page.getByLabel('Projectnaam').fill('Bewaar mij');
 await page.getByRole('button',{name:'Opslaan',exact:true}).click();
 await expect(row(page,'Bewaar mij')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.__persistCalls)).toBeGreaterThan(0);
});

test('a browser that will not keep the data gets a plain warning',async({page})=>{
 await withStorage(page,false);
 await page.goto('/');
 await expect(page.getByTestId('storage-notice')).toContainText('bewaart je gegevens misschien niet');
});

test('no warning when the browser has promised to keep the data',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'storage',{configurable:true,value:{persisted:async()=>true,persist:async()=>true}}));
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Overzicht',exact:true})).toBeVisible();
 await expect(page.getByTestId('storage-notice')).toHaveCount(0);
});

test('on an iPhone the warning says how to put the site on the home screen',async({browser})=>{
 const context=await browser.newContext({
  userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  viewport:{width:390,height:844},
 });
 const page=await context.newPage();
 await page.addInitScript(()=>Object.defineProperty(navigator,'storage',{configurable:true,value:{persisted:async()=>false,persist:async()=>false}}));
 await page.goto('/');
 const notice=page.getByTestId('storage-notice');
 await expect(notice).toContainText('Zet Qunited op je beginscherm');
 await expect(notice).toContainText('Zet op beginscherm');
 await context.close();
});

test('a backup reminder appears once there is something to lose, and goes after a backup',async({page})=>{
 await seed(page,{...emptyData(),personeel:[{id:'e1',name:'Ada',status:'Actief'}]});
 await expect(page.getByTestId('backup-reminder')).toContainText('nog geen back-up');
 await page.getByTestId('backup-reminder').getByRole('link',{name:'Back-up maken'}).click();
 await expect(page.getByText('Je hebt nog geen back-up gemaakt.')).toBeVisible();
 const download=page.waitForEvent('download');
 await page.getByRole('button',{name:'Back-up downloaden'}).click();
 await download;
 await expect(page.getByText(/Laatste back-up:/)).toBeVisible();
 await page.goto('/#/dashboard');
 await expect(page.getByTestId('backup-reminder')).toHaveCount(0);
});

test('an empty workspace does not nag about backups',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Overzicht',exact:true})).toBeVisible();
 await expect(page.getByTestId('backup-reminder')).toHaveCount(0);
});

test('an uploaded file is confirmed only after it reads back, and survives closing the browser',async({browser})=>{
 const context=await browser.newContext();
 const page=await context.newPage();
 await seed(page,{...emptyData(),personeel:[{id:'e1',name:'Ada',status:'Actief'}]});
 await page.goto('/#/personeel');
 await openFiles(page,'Ada');
 const form=page.getByRole('group',{name:'Certificaat toevoegen'});
 await form.getByLabel('Bestand').setInputFiles({name:'vca.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nbewaar\n%%EOF')});
 await form.getByLabel('Certificaatnaam').fill('VCA VOL');
 await form.getByRole('button',{name:'Bestand opslaan'}).click();
 await expect(page.getByRole('status')).toContainText('vca.pdf is opgeslagen.');
 // tabblad dicht, nieuw tabblad in hetzelfde profiel: het bestand is er nog
 await page.close();
 const again=await context.newPage();
 await again.goto('/#/personeel');
 await openFiles(again,'Ada');
 const attachment=again.locator('.attachment').filter({hasText:'vca.pdf'});
 await expect(attachment).toBeVisible();
 const downloadPromise=again.waitForEvent('download');
 await attachment.getByRole('button',{name:'Download'}).click();
 expect(await (await downloadPromise).failure()).toBeNull();
 await context.close();
});

test('the site can be put on the home screen as an app',async({page,request})=>{
 await page.goto('/');
 await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href','./manifest.webmanifest');
 await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href','./apple-touch-icon.png');
 const manifest=await (await request.get('/manifest.webmanifest')).json();
 expect(manifest.short_name).toBe('Qunited');
 expect(manifest.display).toBe('standalone');
 expect(manifest.lang).toBe('nl');
 for(const icon of manifest.icons)expect((await request.get('/'+icon.src)).ok()).toBe(true);
 expect((await request.get('/apple-touch-icon.png')).ok()).toBe(true);
});
