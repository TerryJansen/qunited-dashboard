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
