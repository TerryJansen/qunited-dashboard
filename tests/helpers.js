import { expect } from '@playwright/test';

/** Zet een werkruimte klaar in localStorage en laad opnieuw, zodat de app hem leest. */
export async function seed(page, data) {
 await page.goto('/');
 await page.evaluate(d => localStorage.setItem('qunited.records.v1', JSON.stringify(d)), data);
 await page.reload();
}

/** Een gegevensrij die deze tekst bevat. Alleen tbody, zodat een kolomkop niet meetelt. */
export const row = (page, text) => page.locator('tbody').getByRole('row').filter({ hasText: text });

/** Op de telefoon zit de navigatie achter de menuknop. */
export async function openMenu(page) {
 const toggle = page.getByRole('button', { name: 'Menu', exact: true });
 // De knop blijft zichtbaar terwijl het menu openstaat; aria-expanded zegt of er nog geklikt moet worden.
 if (await toggle.isVisible() && await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
}

export async function navigate(page, name) {
 await openMenu(page);
 await page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
}

/** Het statusfilter is een rij onderstreepte tabs; 'Alle' staat vooraan. */
export async function filterStatus(page, name) {
 await page.getByRole('tab', { name: new RegExp(`^${name}\\b`) }).click();
}
export const statusTab = (page, index) => page.getByRole('tab').nth(index);

/** De cv's en certificaten van een medewerker staan achter een rij-actie. */
export async function openFiles(page, person) {
 await row(page, person).getByRole('button', { name: 'Bestanden', exact: true }).click();
 await expect(page.getByRole('group', { name: 'CV toevoegen' })).toBeVisible();
}

/** Een eigen browsercontext neemt de standaardinstellingen niet over; zo begint hij ingelogd. */
export const SIGNED_IN = { cookies: [], origins: [{ origin: 'http://127.0.0.1:4182', localStorage: [{ name: 'qunited.session', value: 'test' }] }] };
