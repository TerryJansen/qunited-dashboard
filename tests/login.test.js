import {test,expect} from '@playwright/test';

test.use({storageState:{cookies:[],origins:[]}});

test('first visit shows the login page, and logging in opens the overview',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Welkom bij Qunited'})).toBeVisible();
 await expect(page.getByRole('navigation')).toHaveCount(0);
 await expect(page.locator('input[type="password"], input[type="email"]')).toHaveCount(0);
 await page.getByRole('button',{name:'Inloggen'}).click();
 await expect(page.getByRole('heading',{name:'Overzicht',exact:true})).toBeVisible();
 // na herladen blijf je binnen
 await page.reload();
 await expect(page.getByRole('heading',{name:'Overzicht',exact:true})).toBeVisible();
});

test('a deep link waits behind the login and opens after it',async({page})=>{
 await page.goto('/#/projecten');
 await page.getByRole('button',{name:'Inloggen'}).click();
 await expect(page.getByRole('heading',{name:'Projecten',exact:true})).toBeVisible();
});

test('logging out returns to the login page and keeps the data',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'Inloggen'}).click();
 await page.getByRole('link',{name:'Projecten',exact:true}).click();
 await page.getByRole('button',{name:'Toevoegen',exact:true}).click();
 await page.getByLabel('Projectnaam').fill('Blijft staan');
 await page.getByRole('button',{name:'Opslaan',exact:true}).click();
 await page.getByRole('button',{name:'Uitloggen'}).click();
 await expect(page.getByRole('heading',{name:'Welkom bij Qunited'})).toBeVisible();
 await page.getByRole('button',{name:'Inloggen'}).click();
 await expect(page.locator('tbody')).toContainText('Blijft staan');
});

test('on a phone the login page fits and the button is easy to hit',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 const box=await page.getByRole('button',{name:'Inloggen'}).boundingBox();
 expect(box.height).toBeGreaterThanOrEqual(46);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('the real logo is on the login page, in the menu and on the phone bar',async({page})=>{
 await page.goto('/');
 await expect(page.locator('.login-bar svg[aria-label="Qunited"]')).toBeVisible();
 await page.getByRole('button',{name:'Inloggen'}).click();
 await expect(page.locator('.sidebar .brand svg')).toBeVisible();
 await page.setViewportSize({width:390,height:844});
 await expect(page.locator('.topbar-logo svg')).toBeVisible();
 const fonts=await page.evaluate(async()=>{await document.fonts.ready;return ['Inter','Poppins'].map(f=>document.fonts.check(`500 16px "${f}"`))});
 expect(fonts).toEqual([true,true]);
});
