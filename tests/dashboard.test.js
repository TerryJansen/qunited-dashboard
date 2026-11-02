import {test,expect} from '@playwright/test';
test('starts empty and honest',async({page})=>{
 await page.goto('/');
 await expect(page.getByText('Alleen opgeslagen in deze browser',{exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Dashboard',exact:true})).toBeVisible();
 await expect(page.getByText('North Sea Alpha')).toHaveCount(0);
 await expect(page.getByTestId('project-count')).toHaveText('0');
});
