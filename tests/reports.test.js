import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {emptyData} from '../src/modules.js';
import {seed,navigate,row} from './helpers.js';

const data={...emptyData(),projecten:[
 {id:'p1',name:'Platform K14',client:'NorthGas',status:'In uitvoering'},
 {id:'p2',name:'Tankpark',status:'Planning'},
 {id:'p3',name:'Oud project',status:'Afgerond'},
]};
const pdf=name=>({name,mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nrapport\n%%EOF')});

test('Rapportages keeps documents per project: add, list, reopen after reload, download, delete',async({page})=>{
 await seed(page,data);
 await navigate(page,'Rapportages');
 await expect(page.getByRole('heading',{name:'Rapportages',exact:true})).toBeVisible();
 // geen grafieken of CSV-knoppen meer
 await expect(page.locator('.chart')).toHaveCount(0);
 await expect(page.getByRole('button',{name:/CSV/})).toHaveCount(0);
 // lopende projecten bovenaan, het eerste is gekozen
 const projects=page.getByRole('navigation',{name:'Projecten'});
 await expect(projects.getByRole('button').first()).toContainText('Platform K14');
 await expect(page.getByRole('heading',{name:'Platform K14',level:2})).toBeVisible();
 const form=page.getByRole('form',{name:'Document toevoegen aan Platform K14'});
 await form.getByRole('button',{name:'Document opslaan'}).click();
 await expect(page.getByRole('alert')).toContainText('Kies eerst een bestand');
 await form.getByLabel('Bestand',{exact:true}).setInputFiles(pdf('k14-inspectie.pdf'));
 await form.getByLabel(/Titel/).fill('Inspectierapport week 45');
 await form.getByLabel('Datum').fill('2026-11-06');
 await form.getByText('Inspectierapport',{exact:true}).click();
 await form.getByRole('button',{name:'Document opslaan'}).click();
 await expect(page.getByRole('status')).toContainText('Inspectierapport week 45 is opgeslagen bij Platform K14');
 const list=page.getByRole('list',{name:'Documenten van Platform K14'});
 await expect(list).toContainText('Inspectierapport week 45');
 await expect(list).toContainText('Inspectierapport · 6 nov 2026');
 await expect(projects.getByRole('button',{name:/Platform K14/})).toContainText('1 document');
 // een ander project heeft zijn eigen, lege plank
 await projects.getByRole('button',{name:/Tankpark/}).click();
 await expect(page.getByText('Nog geen documenten bij dit project.')).toBeVisible();
 // na herladen nog steeds bij het juiste project
 await page.goto('/#/rapportages?project=p1');await page.reload();
 await expect(list).toContainText('Inspectierapport week 45');
 const waiting=page.waitForEvent('download');
 await list.getByRole('button',{name:'Downloaden'}).click();
 const download=await waiting;
 expect(download.suggestedFilename()).toBe('k14-inspectie.pdf');
 expect((await readFile(await download.path(),'utf8'))).toContain('rapport');
 page.once('dialog',d=>d.accept());
 await list.getByRole('button',{name:'Verwijderen'}).click();
 await expect(page.getByText('Nog geen documenten bij dit project.')).toBeVisible();
});

test('a wrong file type is refused with a plain message',async({page})=>{
 await seed(page,data);
 await page.goto('/#/rapportages');
 const form=page.getByRole('form',{name:/Document toevoegen/});
 await form.getByLabel('Bestand',{exact:true}).setInputFiles({name:'virus.exe',mimeType:'application/octet-stream',buffer:Buffer.from('MZ')});
 await form.getByRole('button',{name:'Document opslaan'}).click();
 await expect(page.getByRole('alert')).toContainText('PDF, Word, Excel, JPG of PNG');
});

test('the project page shows the same documents, and a project with documents cannot be deleted',async({page})=>{
 await seed(page,data);
 await page.goto('/#/projecten/p1');
 const shelf=page.getByRole('region',{name:'Documenten en rapporten'});
 await shelf.getByLabel('Bestand',{exact:true}).setInputFiles(pdf('tekening.pdf'));
 await shelf.getByText('Tekening',{exact:true}).click();
 await shelf.getByRole('button',{name:'Document opslaan'}).click();
 await expect(shelf.getByRole('list')).toContainText('tekening.pdf');
 await shelf.getByRole('link',{name:'Naar Rapportages'}).click();
 await expect(page.getByRole('list',{name:'Documenten van Platform K14'})).toContainText('Tekening');
 await page.goto('/#/projecten');
 page.once('dialog',d=>d.accept());
 await row(page,'Platform K14').getByRole('button',{name:'Verwijderen',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Verwijder eerst de documenten');
 await expect(row(page,'Platform K14')).toBeVisible();
});

test('project documents go along in a backup and come back',async({page})=>{
 await seed(page,data);
 await page.goto('/#/rapportages');
 const form=page.getByRole('form',{name:/Document toevoegen/});
 await form.getByLabel('Bestand',{exact:true}).setInputFiles(pdf('rapport.pdf'));
 await form.getByRole('button',{name:'Document opslaan'}).click();
 await expect(page.getByRole('status')).toContainText('opgeslagen');
 await page.goto('/#/backup');
 const waiting=page.waitForEvent('download');
 await page.getByRole('button',{name:'Back-up downloaden'}).click();
 const path=await (await waiting).path();
 const payload=JSON.parse(await readFile(path,'utf8'));
 expect(payload.attachments).toHaveLength(1);
 expect(payload.attachments[0]).toMatchObject({projectId:'p1',kind:'Rapport',name:'rapport.pdf'});
 page.once('dialog',d=>d.accept());
 await page.getByRole('button',{name:'Werkruimte wissen'}).click();
 await page.getByLabel('Back-upbestand kiezen').setInputFiles(path);
 await expect(page.getByTestId('preview-files')).toHaveText('1');
 page.once('dialog',d=>d.accept());
 await page.getByRole('button',{name:'Alles vervangen'}).click();
 await expect(page.getByRole('status')).toContainText('Terugzetten gelukt');
 await page.goto('/#/rapportages?project=p1');
 await expect(page.getByRole('list',{name:'Documenten van Platform K14'})).toContainText('rapport.pdf');
});

test('on a phone the project is a list to pick from and the page fits',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await seed(page,data);
 await page.goto('/#/rapportages');
 await page.getByLabel('Project',{exact:true}).selectOption('p2');
 await expect(page.getByRole('heading',{name:'Tankpark',level:2})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
