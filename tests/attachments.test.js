import {test,expect} from '@playwright/test';
async function person(page){await page.goto('/#/personeel');await page.getByRole('button',{name:'Toevoegen',exact:true}).click();await page.getByLabel('Naam',{exact:true}).fill('Test medewerker');await page.getByRole('button',{name:'Opslaan',exact:true}).click()}
test('CV and certificate upload, reload, download, removal',async({page})=>{
 await person(page);
 for(const kind of ['CV','Certificaat']){
 const form=page.getByRole('group',{name:`${kind} toevoegen`});
 await form.getByLabel('Bestand').setInputFiles({name:`test-${kind}.pdf`,mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nTest fixture\n%%EOF')});
 if(kind==='Certificaat'){await form.getByLabel('Certificaatnaam').fill('Test opleiding');await form.getByLabel('Geldig tot').fill('2027-01-01')}
 await form.getByRole('button',{name:'Bestand opslaan'}).click();await expect(page.getByText(`test-${kind}.pdf`,{exact:true})).toBeVisible();
 }
 await page.reload();
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Verwijderen',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Verwijder eerst');
 for(const kind of ['CV','Certificaat']){
 const attachment=page.locator('.attachment').filter({hasText:`test-${kind}.pdf`});await expect(attachment).toContainText('application/pdf');
 const downloadPromise=page.waitForEvent('download');await attachment.getByRole('button',{name:'Download'}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toBe(`test-${kind}.pdf`);expect(await download.failure()).toBeNull();
 page.once('dialog',d=>d.accept());await attachment.getByRole('button',{name:'Bestand verwijderen'}).click();await expect(attachment).toHaveCount(0);
 }
 await page.reload();await expect(page.locator('.attachment')).toHaveCount(0);
});
test('upload rejects wrong file type and oversized files',async({page})=>{
 await person(page);const form=page.getByRole('group',{name:'CV toevoegen'});
 await form.getByLabel('Bestand').setInputFiles({name:'test.html',mimeType:'text/html',buffer:Buffer.from('<html/>')});await form.getByRole('button',{name:'Bestand opslaan'}).click();await expect(page.getByRole('alert')).toContainText('Bestandstype');
 await form.getByLabel('Bestand').setInputFiles({name:'large.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(10*1024*1024+1)});await form.getByRole('button',{name:'Bestand opslaan'}).click();await expect(page.getByRole('alert')).toContainText('10 MB');
});
