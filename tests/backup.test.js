import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {emptyData} from '../src/modules.js';
import {seed,openFiles,row} from './helpers.js';
const seeded={...emptyData(),
 projecten:[{id:'p1',name:'Project A',status:'In uitvoering'}],
 personeel:[{id:'e1',name:'Ada',status:'Actief'}],
 facturatie:[{id:'f1',name:'F-1',client:'Klant',status:'Open',amount:'250'}]};

const start=page=>seed(page,seeded);

async function addCertificate(page){
 await page.goto('/#/personeel');
 await openFiles(page,'Ada');
 const form=page.getByRole('group',{name:'Certificaat toevoegen'});
 await form.getByLabel('Bestand').setInputFiles({name:'vca.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nfixture\n%%EOF')});
 await form.getByLabel('Certificaatnaam').fill('VCA VOL');
 await form.getByLabel('Geldig tot').fill('2099-01-01');
 await form.getByRole('button',{name:'Bestand opslaan'}).click();
 await expect(page.getByText('vca.pdf',{exact:true})).toBeVisible();
}

test('a backup round-trips records and files through a wiped workspace',async({page})=>{
 await start(page);
 await addCertificate(page);
 await page.goto('/#/backup');
 const waiting=page.waitForEvent('download');
 await page.getByRole('button',{name:'Back-up downloaden'}).click();
 const file=await waiting;
 expect(file.suggestedFilename()).toMatch(/^qunited-backup-\d{4}-\d{2}-\d{2}\.json$/);
 const path=await file.path();
 const payload=JSON.parse(await readFile(path,'utf8'));
 expect(payload.format).toBe('qunited.backup.v1');
 expect(payload.records.projecten).toHaveLength(1);
 expect(payload.attachments).toHaveLength(1);
 expect(payload.attachments[0].data.length).toBeGreaterThan(0);
 await expect(page.getByRole('status')).toContainText('1 bestand');

 page.once('dialog',d=>d.accept());
 await page.getByRole('button',{name:'Werkruimte wissen'}).click();
 await expect(page.getByRole('status')).toContainText('leeg');
 await page.goto('/#/projecten');
 await expect(page.getByText('Nog geen registraties')).toBeVisible();

 await page.goto('/#/backup');
 await page.getByLabel('Back-upbestand kiezen').setInputFiles(path);
 await expect(page.getByTestId('preview-files')).toHaveText('1');
 await expect(page.getByRole('table',{name:'Inhoud van de back-up'})).toContainText('Projecten');
 page.once('dialog',d=>d.accept());
 await page.getByRole('button',{name:'Alles vervangen'}).click();
 await expect(page.getByRole('status')).toContainText('Terugzetten gelukt');
 await page.goto('/#/projecten');
 await expect(row(page,'Project A')).toBeVisible();
 await page.goto('/#/personeel');
 await openFiles(page,'Ada');
 await expect(page.getByText('vca.pdf',{exact:true})).toBeVisible();
 const attachment=page.locator('.attachment').filter({hasText:'vca.pdf'});
 const download=page.waitForEvent('download');
 await attachment.getByRole('button',{name:'Download'}).click();
 expect(await (await download).failure()).toBeNull();
});

test('cancelling a restore changes nothing',async({page})=>{
 await start(page);
 await page.goto('/#/backup');
 const waiting=page.waitForEvent('download');
 await page.getByRole('button',{name:'Back-up downloaden'}).click();
 const path=await (await waiting).path();
 await page.getByLabel('Back-upbestand kiezen').setInputFiles(path);
 page.once('dialog',d=>d.dismiss());
 await page.getByRole('button',{name:'Alles vervangen'}).click();
 await expect(page.getByRole('status')).toHaveCount(0);
 await page.getByRole('button',{name:'Annuleren',exact:true}).click();
 await expect(page.getByTestId('preview-files')).toHaveCount(0);
 await page.goto('/#/projecten');
 await expect(row(page,'Project A')).toBeVisible();
});

test('a damaged or foreign file is refused without touching the workspace',async({page})=>{
 await start(page);
 await page.goto('/#/backup');
 for(const body of ['{"format":"iets-anders","records":{}}','niet eens json','{"format":"qunited.backup.v1","records":{"projecten":42}}']){
  await page.getByLabel('Back-upbestand kiezen').setInputFiles({name:'kapot.json',mimeType:'application/json',buffer:Buffer.from(body)});
  await expect(page.getByRole('alert')).toContainText('geen geldige Qunited back-up');
  await expect(page.getByTestId('preview-files')).toHaveCount(0);
 }
 await page.goto('/#/projecten');
 await expect(row(page,'Project A')).toBeVisible();
});

test('files without a matching employee are skipped, not restored',async({page})=>{
 await start(page);
 await page.goto('/#/backup');
 const payload={format:'qunited.backup.v1',exported:'2026-11-02T00:00:00.000Z',records:{...emptyData(),projecten:[{id:'p9',name:'Alleen project',status:'Planning'}]},
  attachments:[
   {id:'a1',personId:'bestaat-niet',kind:'Certificaat',name:'zwerver.pdf',type:'application/pdf',size:10,title:'',expiry:'',data:'eA=='},
   {id:'a2',personId:'bestaat-niet',kind:'Certificaat',name:'fout.exe',type:'application/x-msdownload',size:10,title:'',expiry:'',data:'eA=='},
  ]};
 await page.getByLabel('Back-upbestand kiezen').setInputFiles({name:'extern.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))});
 await expect(page.getByTestId('preview-files')).toHaveText('0');
 await expect(page.locator('.preview')).toContainText('onbekend type of te groot');
 await expect(page.locator('.preview')).toContainText('zit niet in deze back-up');
});

test('a backup without files stays small and still restores records',async({page})=>{
 await start(page);
 await addCertificate(page);
 await page.goto('/#/backup');
 await page.getByLabel(/Bestanden meenemen/).uncheck();
 const waiting=page.waitForEvent('download');
 await page.getByRole('button',{name:'Back-up downloaden'}).click();
 const file=await waiting;
 const payload=JSON.parse(await readFile(await file.path(),'utf8'));
 expect(payload.attachments).toHaveLength(0);
 expect(payload.records.personeel).toHaveLength(1);
 await expect(page.getByRole('status')).toContainText('zonder bestanden');
});
