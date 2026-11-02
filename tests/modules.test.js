import {test,expect} from '@playwright/test';
const cases=[['projecten','Projecten','Projectnaam'],['materiaal','Materiaal','Omschrijving'],['inventaris','Inventaris','Itemnaam'],['facturatie','Facturatie','Factuurnummer'],['support','IT & support','Onderwerp'],['procedures','Procedures','Titel'],['personeel','Personeel','Naam']];
for(const [route,title,label] of cases)test(`${title}: CRUD, search, filter, persistence`,async({page})=>{
 await page.goto(`/#/${route}`);
 await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Toevoegen',exact:true}).click();
 await page.getByLabel(label,{exact:true}).fill('Test registratie');
 if(route==='facturatie'){await page.getByLabel('Relatie',{exact:true}).fill('Test klant');await page.getByLabel('Bedrag (€)').fill('123.45');}
 if(route==='procedures')await page.getByLabel('Inhoud').fill('Eigen documenttekst.');
 await page.getByRole('button',{name:'Opslaan',exact:true}).click();
 await expect(page.getByRole('article').filter({hasText:'Test registratie'})).toBeVisible();
 await page.reload();
 await expect(page.getByRole('article').filter({hasText:'Test registratie'})).toBeVisible();
 await page.getByLabel('Zoeken').fill('onvindbaar');await expect(page.getByText('Geen resultaten')).toBeVisible();
 await page.getByLabel('Zoeken').fill('');
 await page.getByRole('button',{name:'Bewerken',exact:true}).click();
 await page.getByLabel(label,{exact:true}).fill('Gewijzigd');
 await page.getByLabel('Status',{exact:true}).selectOption({index:1});
 await page.getByRole('button',{name:'Opslaan',exact:true}).click();
 await page.getByLabel('Filter op status').selectOption({index:1});await expect(page.getByText('Geen resultaten')).toBeVisible();
 await page.getByLabel('Filter op status').selectOption('');
 page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Verwijderen',exact:true}).click();await expect(page.getByRole('heading',{name:'Gewijzigd',exact:true})).toBeVisible();
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Verwijderen',exact:true}).click();
 await page.reload();await expect(page.getByText('Nog geen registraties')).toBeVisible();
});
