import {test,expect} from '@playwright/test';
test('starts empty and honest',async({page})=>{
 await page.goto('/');
 await expect(page.getByText('alleen opgeslagen in deze browser')).toBeVisible();
 await expect(page.getByRole('heading',{name:'Overzicht',exact:true})).toBeVisible();
 await expect(page.getByText('North Sea Alpha')).toHaveCount(0);
 await expect(page.getByTestId('assignment-count')).toHaveText('0');
 await expect(page.getByTestId('available-count')).toHaveText('0');
 await expect(page.getByTestId('week-hours')).toHaveText('0');
 await expect(page.getByTestId('invoice-total')).toContainText('0,00');
 await expect(page.getByText('Nog geen actieve medewerkers vastgelegd.')).toBeVisible();
 await expect(page.getByTestId('alerts-empty')).toBeVisible();
 await expect(page.getByText('Geen projecten met status Planning of In uitvoering.')).toBeVisible();
});
