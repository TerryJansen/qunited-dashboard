import {test,expect} from '@playwright/test';
import {emptyData} from '../src/modules.js';
import {seed,navigate} from './helpers.js';
import {week,weekNumber,weekRange} from '../src/agenda.js';

const iso=d=>d.toLocaleDateString('sv-SE');
const monday=()=>{const d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7));return d};
const plus=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return iso(x)};

const data={...emptyData(),
 personeel:[{id:'e1',name:'Ada',role:'Inspecteur',status:'Actief'},{id:'e2',name:'Bram',role:'Lasser',status:'Actief'},{id:'e3',name:'Cem',status:'Actief'}],
 projecten:[{id:'p1',name:'Platform K14',status:'In uitvoering'},{id:'p2',name:'Tankpark',status:'Planning'}],
 inzet:[
  {id:'i1',name:'x',status:'Actief',employeeId:'e1',projectId:'p1',start:plus(monday(),0),end:plus(monday(),4),role:'Inspectie'},
  {id:'i2',name:'x',status:'Gepland',employeeId:'e2',projectId:'p2',start:plus(monday(),2),end:plus(monday(),20)},
 ],
 afwezigheid:[{id:'a1',name:'x',status:'Vastgelegd',employeeId:'e3',kind:'Vakantie',start:plus(monday(),0),end:plus(monday(),1)}],
};

test('the week numbers and ranges read like a Dutch diary',()=>{
 expect(weekNumber('2026-11-09')).toBe(46);
 expect(weekNumber('2026-12-28')).toBe(53);
 expect(weekNumber('2027-01-04')).toBe(1);
 expect(weekRange('2026-11-09','2026-11-15')).toBe('9 t/m 15 november 2026');
 expect(weekRange('2026-11-30','2026-12-06')).toBe('30 november t/m 6 december 2026');
});

test('consecutive days merge into one block with the name in it',()=>{
 const view=week(data,iso(new Date()));
 const ada=view.rows.find(r=>r.name==='Ada');
 expect(ada.segments.map(s=>[s.span,s.entries.map(e=>e.label).join()])).toEqual([[5,'Platform K14'],[2,'']]);
 const bram=view.rows.find(r=>r.name==='Bram');
 expect(bram.segments[0]).toMatchObject({span:2,entries:[]});
 expect(bram.segments[1]).toMatchObject({span:5});
 const cem=view.rows.find(r=>r.name==='Cem');
 expect(cem.segments[0].entries[0]).toMatchObject({kind:'afwezig',label:'Vakantie'});
});

test('the planning page shows one readable week, sits next to Urenstaten and pages by week',async({page})=>{
 await seed(page,data);
 const links=await page.getByRole('navigation',{name:'Hoofdnavigatie'}).getByRole('link').allTextContents();
 expect(links.indexOf('Planning')).toBe(links.indexOf('Urenstaten')-1);
 await navigate(page,'Planning');
 const table=page.getByRole('table',{name:/Planning week \d+/});
 await expect(table.getByRole('columnheader')).toHaveCount(8);
 const ada=table.getByRole('row').filter({hasText:'Ada'});
 await expect(ada.getByRole('link',{name:/Platform K14/})).toBeVisible();
 expect(await ada.locator('td').first().getAttribute('colspan')).toBe('5');
 await expect(table.getByRole('row').filter({hasText:'Cem'})).toContainText('Vakantie');
 await expect(table.getByRole('row').filter({hasText:'Bram'})).toContainText('Gepland');
 const title=await page.locator('.agenda-when').textContent();
 await page.getByRole('button',{name:'Volgende week'}).click();
 await expect(page.locator('.agenda-when')).not.toHaveText(title);
 await expect(table.getByRole('row').filter({hasText:'Ada'})).toContainText('Vrij');
 await page.getByRole('button',{name:'Deze week'}).click();
 await expect(page.locator('.agenda-when')).toHaveText(title);
 await ada.getByRole('link',{name:/Platform K14/}).click();
 await expect(page.getByRole('heading',{name:'Platform K14',exact:true})).toBeVisible();
});

test('on a phone you pick a day and read who is where',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await seed(page,data);
 await page.goto('/#/planning');
 await page.getByRole('tab',{name:/^maandag/}).click();
 const list=page.getByRole('list',{name:/Wie staat waar op maandag/});
 await expect(list.locator('li').filter({hasText:'Ada'})).toContainText('Platform K14');
 await expect(list.locator('li').filter({hasText:'Cem'})).toContainText('Vakantie');
 await expect(list.locator('li').filter({hasText:'Bram'})).toContainText('Vrij');
 await page.getByRole('tab',{name:/^zaterdag/}).click();
 await expect(page.getByRole('list',{name:/zaterdag/}).locator('li').filter({hasText:'Ada'})).toContainText('Weekend');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('the overview no longer carries the timeline, and links to the planning',async({page})=>{
 await seed(page,data);
 await expect(page.locator('.chart')).toHaveCount(0);
 await page.getByRole('link',{name:'Hele planning bekijken'}).click();
 await expect(page.getByRole('heading',{name:'Planning',exact:true})).toBeVisible();
});
