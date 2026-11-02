import {test,expect} from '@playwright/test';
import {emptyData} from '../src/modules.js';
const day=offset=>{const d=new Date();d.setDate(d.getDate()+offset);return d.toLocaleDateString('sv-SE')};

test('dashboard reports no alerts when no dates are at stake',async({page})=>{
 await page.goto('/');
 await expect(page.getByTestId('alerts-empty')).toBeVisible();
 await page.evaluate(d=>localStorage.setItem('qunited.records.v1',JSON.stringify(d)),
  {...emptyData(),projecten:[{id:'p1',name:'Ver weg',status:'Planning',due:day(400)}],facturatie:[{id:'f1',name:'F1',client:'K',status:'Betaald',amount:'10',due:day(-40)}]});
 await page.reload();
 await expect(page.getByTestId('alerts-empty')).toBeVisible();
});

test('overdue and upcoming dates become alerts, ordered and labelled',async({page})=>{
 await page.goto('/');
 await page.evaluate(d=>localStorage.setItem('qunited.records.v1',JSON.stringify(d)),{...emptyData(),
  projecten:[{id:'p1',name:'Laat project',status:'In uitvoering',due:day(-3)},{id:'p2',name:'Bijna klaar',status:'Planning',due:day(7)},{id:'p3',name:'Afgerond project',status:'Afgerond',due:day(-9)}],
  facturatie:[{id:'f1',name:'F-100',client:'Klant',status:'Open',amount:'500',due:day(-10)}],
  inventaris:[{id:'v1',name:'Kraan',status:'In gebruik',due:day(12)}],
  personeel:[{id:'e1',name:'Ada',status:'Actief'}],
  inzet:[{id:'i1',name:'Ada — Laat project',status:'Gepland',employeeId:'e1',projectId:'p1',start:day(-2),end:day(60)}]});
 await page.reload();
 const alerts=page.locator('.alert');
 await expect(alerts).toHaveCount(5);
 await expect(alerts.first()).toContainText('F-100');
 await expect(alerts.first()).toContainText('Verstreken');
 await expect(page.locator('.alert-verlopen')).toHaveCount(2);
 await expect(page.locator('.alert-binnenkort')).toHaveCount(3);
 await expect(page.getByLabel('Attentiepunten')).toContainText('status staat nog op Gepland');
 await expect(page.getByLabel('Attentiepunten')).not.toContainText('Afgerond project');
 await alerts.filter({hasText:'F-100'}).click();
 await expect(page.getByRole('heading',{name:'Facturatie',exact:true})).toBeVisible();
});

test('an expiring certificate becomes an alert for its employee',async({page})=>{
 await page.goto('/');
 await page.evaluate(d=>localStorage.setItem('qunited.records.v1',JSON.stringify(d)),{...emptyData(),personeel:[{id:'e1',name:'Ada',status:'Actief'}]});
 await page.reload();
 await page.goto('/#/personeel');
 const form=page.getByRole('group',{name:'Certificaat toevoegen'});
 await form.getByLabel('Bestand').setInputFiles({name:'vca.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nx\n%%EOF')});
 await form.getByLabel('Certificaatnaam').fill('VCA VOL');
 await form.getByLabel('Geldig tot').fill(day(-1));
 await form.getByRole('button',{name:'Bestand opslaan'}).click();
 await expect(page.getByText('vca.pdf',{exact:true})).toBeVisible();
 await page.goto('/#/dashboard');
 const alert=page.locator('.alert').filter({hasText:'VCA VOL'});
 await expect(alert).toContainText('Ada');
 await expect(alert).toHaveClass(/alert-verlopen/);
});
