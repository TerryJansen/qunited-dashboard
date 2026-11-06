import {test,expect} from '@playwright/test';

test.use({storageState:{cookies:[],origins:[]}});

test('first visit shows the login page, and logging in opens the overview',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{level:1,name:/^Goede(morgen|middag|navond|nacht)$/})).toBeVisible();
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
 await expect(page.getByRole('heading',{level:1,name:/^Goede(morgen|middag|navond|nacht)$/})).toBeVisible();
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
 await expect(page.locator('.login-card svg[aria-label="Qunited"]')).toBeVisible();
 await page.getByRole('button',{name:'Inloggen'}).click();
 await expect(page.locator('.sidebar .brand svg')).toBeVisible();
 await page.setViewportSize({width:390,height:844});
 await expect(page.locator('.topbar-logo svg')).toBeVisible();
 const fonts=await page.evaluate(async()=>{await document.fonts.ready;return ['Inter','Poppins'].map(f=>document.fonts.check(`500 16px "${f}"`))});
 expect(fonts).toEqual([true,true]);
});

test('the login page has the platform photo behind it, darkened, and nothing that moves',async({page})=>{
 await page.goto('/');
 await expect(page.locator('.login-backdrop')).toHaveAttribute('src','./login-achtergrond.jpg');
 expect(await page.locator('.login-backdrop').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
 const shade=await page.locator('.login').evaluate(el=>getComputedStyle(el,'::before').backgroundColor);
 expect(shade).toBe('rgba(10, 24, 40, 0.68)');
 await expect(page.locator('video')).toHaveCount(0);
});
