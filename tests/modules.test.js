import {test,expect} from '@playwright/test';
import {row,statusTab} from './helpers.js';
const cases=[['projecten','Projecten','Projectnaam'],['materiaal','Materiaal','Omschrijving'],['inventaris','Inventaris','Itemnaam'],['facturatie','Facturatie','Factuurnummer'],['support','IT & support','Onderwerp'],['procedures','Procedures','Titel'],['personeel','Personeel','Naam']];
for(const [route,title,label] of cases)test(`${title}: CRUD, search, filter, persistence`,async({page})=>{
 await page.goto(`/#/${route}`);
 await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Toevoegen',exact:true}).click();
 await page.getByLabel(label,{exact:true}).fill('Test registratie');
 if(route==='facturatie'){await page.getByLabel('Relatie',{exact:true}).fill('Test klant');await page.getByLabel('Bedrag (€)').fill('123.45');}
 if(route==='projecten')await page.getByLabel('Locatie',{exact:true}).fill('Rotterdam');
 if(route==='procedures')await page.getByLabel('Inhoud').fill('Eigen documenttekst.');
 await page.getByRole('button',{name:'Opslaan',exact:true}).click();
 await expect(row(page,'Test registratie')).toBeVisible();
 await page.reload();
 await expect(row(page,'Test registratie')).toBeVisible();
 await page.getByLabel('Zoeken').fill('onvindbaar');await expect(page.getByText('Geen resultaten')).toBeVisible();
 await page.getByLabel('Zoeken').fill('');
 await row(page,'Test registratie').getByRole('button',{name:'Bewerken',exact:true}).click();
 await page.getByLabel(label,{exact:true}).fill('Gewijzigd');
 await page.getByLabel('Status',{exact:true}).selectOption({index:1});
 await page.getByRole('button',{name:'Opslaan',exact:true}).click();
 await expect(row(page,'Gewijzigd')).toBeVisible();
 // tab 0 is "Alle"; tab 1 is de eerste status, die deze registratie nu niet meer heeft
 await statusTab(page,1).click();await expect(page.getByText('Geen resultaten')).toBeVisible();
 await statusTab(page,0).click();
 page.once('dialog',d=>d.dismiss());await row(page,'Gewijzigd').getByRole('button',{name:'Verwijderen',exact:true}).click();
 await expect(row(page,'Gewijzigd')).toBeVisible();
 page.once('dialog',d=>d.accept());await row(page,'Gewijzigd').getByRole('button',{name:'Verwijderen',exact:true}).click();
 await expect(row(page,'Gewijzigd')).toHaveCount(0);
 await page.reload();await expect(page.getByText('Nog geen registraties')).toBeVisible();
});
