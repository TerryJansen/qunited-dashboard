import {test,expect} from '@playwright/test';
test('starts empty and honest',async({page})=>{
 await page.goto('/');
 await expect(page.getByText('alleen opgeslagen in deze browser')).toBeVisible();
 await expect(page.getByRole('heading',{name:'Overzicht',exact:true})).toBeVisible();
 await expect(page.getByText('North Sea Alpha')).toHaveCount(0);
 await expect(page.getByTestId('deployed-count')).toContainText('0');
 await expect(page.getByTestId('available-count')).toHaveText('0');
 await expect(page.getByTestId('submitted-count')).toHaveText('0');
 await expect(page.getByTestId('project-count')).toHaveText(/0/);
 await expect(page.getByText(/factu/i)).toHaveCount(0);
 await expect(page.getByText('Nog geen actieve medewerkers.')).toBeVisible();
 await expect(page.getByTestId('actions-unknown')).toBeVisible();
 // de startchecklist wijst naar de drie eerste schermen
 const checklist=page.getByRole('region',{name:'Werkruimte inrichten'});
 for(const step of ['Voeg een medewerker toe','Maak een project aan','Plan de eerste inzet'])
  await expect(checklist.getByRole('link',{name:step})).toBeVisible();
});
test('core figures click through to the matching filtered list',async({page})=>{
 await page.evaluate(()=>{}).catch(()=>{});
 await page.goto('/');
 await page.evaluate(()=>localStorage.setItem('qunited.records.v1',JSON.stringify({
  projecten:[{id:'p1',name:'Loopt',status:'In uitvoering',location:'Rotterdam'}],inzet:[],afwezigheid:[],urenstaten:[{id:'t1',name:'Werk',status:'Ingediend',employeeId:'e1',projectId:'p1',date:'2026-11-02',hours:'8'}],
  personeel:[],materiaal:[],inventaris:[],
  support:[],procedures:[]})));
 await page.reload();
 await page.getByTestId('submitted-count').click();
 await expect(page.getByRole('heading',{name:'Urenstaten',exact:true})).toBeVisible();
 await expect(page.getByRole('tab',{name:/^Ingediend/})).toHaveAttribute('aria-selected','true');
 await page.goto('/#/dashboard');
 await page.getByTestId('project-count').click();
 await expect(page.getByRole('heading',{name:'Projecten',exact:true})).toBeVisible();
 await expect(page.getByRole('tab',{name:/^In uitvoering/})).toHaveAttribute('aria-selected','true');
});

test('Facturatie is gone from the menu, but invoices already in the browser are not wiped',async({page})=>{
 await page.goto('/');
 await page.evaluate(()=>localStorage.setItem('qunited.records.v1',JSON.stringify({
  projecten:[],inzet:[],afwezigheid:[],urenstaten:[],personeel:[],materiaal:[],inventaris:[],support:[],procedures:[],
  facturatie:[{id:'f1',name:'F-1',client:'Klant',status:'Open',amount:'100'}]})));
 await page.reload();
 await expect(page.getByRole('navigation',{name:'Hoofdnavigatie'}).getByRole('link',{name:'Facturatie'})).toHaveCount(0);
 await page.goto('/#/projecten/nieuw');
 await page.getByLabel('Projectnaam').fill('Na facturatie');
 await page.getByLabel('Locatie',{exact:true}).fill('Rotterdam');
 await page.getByRole('button',{name:'Opslaan',exact:true}).click();
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('qunited.records.v1')));
 expect(stored.projecten).toHaveLength(1);
 expect(stored.facturatie).toEqual([{id:'f1',name:'F-1',client:'Klant',status:'Open',amount:'100'}]);
});

test('the hours card adds up the week, shows a day per project and compares with the week before',async({page})=>{
 const iso=d=>d.toLocaleDateString('sv-SE');
 const monday=new Date();monday.setDate(monday.getDate()-((monday.getDay()+6)%7));
 const before=new Date(monday);before.setDate(before.getDate()-7);
 await page.goto('/');
 await page.evaluate(d=>localStorage.setItem('qunited.records.v1',JSON.stringify(d)),{
  projecten:[{id:'p1',name:'IHC',status:'In uitvoering',location:'Kinderdijk'},{id:'p2',name:'Botlek',status:'In uitvoering',location:'Botlek'}],
  personeel:[{id:'e1',name:'Ada',status:'Actief'}],inzet:[],afwezigheid:[],materiaal:[],inventaris:[],support:[],procedures:[],
  urenstaten:[
   {id:'t1',name:'A',status:'Concept',employeeId:'e1',projectId:'p1',date:iso(monday),hours:'7.5',pause:'30'},
   {id:'t2',name:'B',status:'Concept',employeeId:'e1',projectId:'p2',date:iso(monday),hours:'2.1',pause:'0'},
   {id:'t3',name:'C',status:'Goedgekeurd',employeeId:'e1',projectId:'p1',date:iso(before),hours:'8',pause:'30'},
  ]});
 await page.reload();
 const card=page.getByRole('region',{name:'Gewerkte uren'});
 await expect(card.getByTestId('hours-total')).toHaveText('9u 36min');
 await expect(card).toContainText('20%');
 await card.getByRole('group',{name:'Uren per dag'}).getByRole('button').first().click();
 await expect(card).toContainText('IHC');
 await expect(card).toContainText('7u 30min');
 await expect(card).toContainText('2u 6min');
 await card.getByRole('button',{name:'Vorige week'}).click();
 await expect(card.getByTestId('hours-total')).toHaveText('8u');
 await card.getByRole('link',{name:'Bekijk de urenstaten'}).click();
 // de urenstaten staan per dag in een kaart, met het dagtotaal erboven
 const day=page.getByRole('region',{name:new RegExp(String(monday.getFullYear()))}).first();
 await expect(day).toContainText('9u 36min');
 await expect(day.locator('tbody').getByRole('row')).toHaveCount(2);
});

test('on a phone the dashboard cards fit the screen',async({browser})=>{
 const context=await browser.newContext({storageState:{cookies:[],origins:[{origin:'http://127.0.0.1:4182',localStorage:[{name:'qunited.session',value:'test'}]}]},viewport:{width:390,height:844}});
 const page=await context.newPage();
 await page.goto('/');
 await expect(page.getByRole('region',{name:'Gewerkte uren'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await context.close();
});
