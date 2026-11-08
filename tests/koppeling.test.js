import {test,expect} from '@playwright/test';
import {emptyData} from '../src/modules.js';
import {seed,row} from './helpers.js';

const staf=[{id:'e1',name:'Terry Jansen',role:'QA/QC',email:'t@example.nl',phone:'06 1111 2222',status:'Actief',notes:''}];

test('a person added once is pickable everywhere, with function and phone carried along',async({page})=>{
 await seed(page,{...emptyData(),personeel:staf});
 // bij een project kies je de verantwoordelijke uit de lijst, je typt hem niet
 await page.goto('/#/projecten/nieuw');
 await page.getByLabel('Projectnaam').fill('IHC defense');await page.getByLabel('Locatie',{exact:true}).fill('Rotterdam');
 await page.getByLabel('Verantwoordelijke').selectOption({label:'Terry Jansen'});
 await page.getByRole('button',{name:'Opslaan',exact:true}).click();
 // in de lijst staat alleen de naam; de contactgegevens staan op de projectpagina
 const regel=row(page,'IHC defense');
 await expect(regel).toContainText('Terry Jansen');
 // op de projectpagina staan functie en telefoon erbij, zonder dat je ze invulde
 await regel.getByRole('link',{name:'IHC defense'}).click();
 const gegevens=page.locator('.detail-grid');
 await expect(gegevens).toContainText('Terry Jansen');
 await expect(gegevens).toContainText('QA/QC · 06 1111 2222');
 // en je klikt door naar de medewerker
 await gegevens.getByRole('link',{name:'Terry Jansen'}).click();
 await expect(page.getByRole('heading',{name:'Terry Jansen',exact:true})).toBeVisible();
});

test('every place a person belongs offers the same list',async({page})=>{
 await seed(page,{...emptyData(),personeel:staf,projecten:[{id:'p1',name:'IHC defense',status:'Planning'}]});
 for(const [route,label,naam] of [
  ['inventaris','Toegewezen aan','Itemnaam'],
  ['support','Melder','Onderwerp'],
  ['procedures','Eigenaar','Titel'],
 ]){
  await page.goto(`/#/${route}/nieuw`);
  await page.getByLabel(naam,{exact:true}).fill('Proef');
  if(route==='procedures')await page.getByLabel('Inhoud').fill('Tekst.');
  await page.getByLabel(label,{exact:true}).selectOption({label:'Terry Jansen'});
  await page.getByRole('button',{name:'Opslaan',exact:true}).click();
  await expect(row(page,'Proef')).toContainText('Terry Jansen');
 }
 // materiaal hangt nu aan een echt project
 await page.goto('/#/materiaal/nieuw');
 await page.getByLabel('Omschrijving',{exact:true}).fill('Koppelpasta');
 await page.getByLabel('Project',{exact:true}).selectOption({label:'IHC defense'});
 await page.getByRole('button',{name:'Opslaan',exact:true}).click();
 await expect(row(page,'Koppelpasta')).toContainText('IHC defense');
});

test('a name typed before these fields were lists is linked up, and unknown text is kept',async({page})=>{
 await seed(page,{...emptyData(),personeel:staf,projecten:[
  {id:'p1',name:'Oud project',status:'Planning',owner:'terry jansen'},
  {id:'p2',name:'Ander project',status:'Planning',owner:'Iemand van buiten'},
 ]});
 // de ingetypte naam is aan de medewerker gekoppeld, inclusief functie
 await page.goto('/#/projecten/p1');
 await expect(page.locator('.detail-grid')).toContainText('QA/QC · 06 1111 2222');
 await expect(page.locator('.detail-grid').getByRole('link',{name:'Terry Jansen'})).toBeVisible();
 // tekst die nergens op slaat blijft gewoon staan en overleeft een bewerking
 await page.goto('/#/projecten/p2');
 await expect(page.locator('.detail-grid')).toContainText('Iemand van buiten');
 await page.getByRole('button',{name:'Bewerken',exact:true}).click();
 await page.getByLabel('Locatie').fill('Kinderdijk');
 await page.getByRole('button',{name:'Opslaan',exact:true}).click();
 await page.reload();
 await expect(page.locator('.detail-grid')).toContainText('Iemand van buiten');
 await expect(page.locator('.detail-grid')).toContainText('Kinderdijk');
});

test('an optional person field does not demand staff before you can start',async({page})=>{
 await page.goto('/#/projecten');
 await expect(page.getByText('Voeg eerst medewerkers toe.')).toHaveCount(0);
 await page.getByRole('button',{name:'Toevoegen',exact:true}).click();
 await page.getByLabel('Projectnaam').fill('Zonder personeel');await page.getByLabel('Locatie',{exact:true}).fill('Rotterdam');
 await page.getByRole('button',{name:'Opslaan',exact:true}).click();
 await expect(row(page,'Zonder personeel')).toBeVisible();
});
