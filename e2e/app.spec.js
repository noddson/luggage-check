import { test, expect } from '@playwright/test';
import { I18N } from '../configs/i18n/index.js';

const DEFAULT_VEHICLE_ID = 'volkswagen-caddy-maxi-life';
const SAVED_VEHICLE_ID = 'toyota-corolla-sedan-2025';

async function openReadyApp(page) {
  await page.goto('/');
  await expect(page.locator('#fitBadge')).not.toHaveText('Loading');
  await expect(page.locator('.zone-3d-svg')).toBeVisible();
}

test.beforeEach(async ({ context, page }) => {
  await context.clearCookies();
  await openReadyApp(page);
});

test('loads the default planning result and 3D visualization', async ({ page }) => {
  await expect(page).toHaveTitle('Luggage Check');
  await expect(page.locator('#vehicleSelect')).toHaveValue(DEFAULT_VEHICLE_ID);
  await expect(page.locator('#configurationSelect')).toHaveValue('seats_up');
  await expect(page.locator('#metrics .metric')).toHaveCount(3);
  await expect(page.locator('#placedList .placed-item')).not.toHaveCount(0);
  await expect(page.locator('#unplacedList')).toBeVisible();
});

test('offers contribution and localized new-vehicle email links', async ({ page }) => {
  const contributionLink = page.getByRole('link', { name: 'pay-what-you-want contribution' });
  await expect(contributionLink).toHaveAttribute('href', 'https://paypal.me/noddson');

  const vehicleRequestLink = page.locator('#vehicleRequestEmail');
  await expect(vehicleRequestLink).toHaveAccessibleName('Request a new vehicle');
  for (const [locale, bundle] of Object.entries(I18N)) {
    await page.locator('#languageSelect').selectOption(locale);
    await expect(vehicleRequestLink).toHaveAttribute('aria-label', bundle.vehicleRequestEmailLabel);
    await expect(vehicleRequestLink).toHaveAttribute(
      'href',
      `mailto:noddson+luggage-check@gmail.com?subject=${encodeURIComponent(bundle.vehicleRequestEmailSubject)}`
    );
  }
});

test('persists vehicle, configuration, input overrides, and language', async ({ page }) => {
  await page.locator('#vehicleSelect').selectOption(SAVED_VEHICLE_ID);
  await expect(page.locator('#resultTitle')).toContainText('Toyota Corolla');
  await page.locator('#configurationSelect').selectOption('rear_folded');
  await page.locator('#seatBackEncroachmentDegrees').fill('10');
  await page.locator('#usableVolumeBufferPercent').fill('20');
  await page.locator('#languageSelect').selectOption('fr');

  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.getByRole('heading', { name: 'Pr\u00e9paration du trajet' })).toBeVisible();
  await page.reload();

  await expect(page.locator('#vehicleSelect')).toHaveValue(SAVED_VEHICLE_ID);
  await expect(page.locator('#configurationSelect')).toHaveValue('rear_folded');
  await expect(page.locator('#seatBackEncroachmentDegrees')).toHaveValue('10');
  await expect(page.locator('#usableVolumeBufferPercent')).toHaveValue('20');
  await expect(page.locator('#languageSelect')).toHaveValue('fr');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
});

test('enables, places, and resets a custom bag only after dimensions are valid', async ({ page }) => {
  await page.getByRole('button', { name: 'Reset' }).click();
  const quantity = page.locator('#qty-custom-bag');
  await expect(quantity).toBeDisabled();

  await page.locator('#custom-height').fill('300');
  await page.locator('#custom-width').fill('400');
  await page.locator('#custom-length').fill('500');
  await expect(quantity).toBeEnabled();
  await quantity.fill('1');

  await expect(page.locator('#placedList .placed-item[data-source-id="custom-bag"], #unplacedList .placed-item[data-source-id="custom-bag"]')).toHaveCount(1);
  await expect(page.locator('#custom-height')).toBeDisabled();

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(quantity).toHaveValue('0');
  await expect(quantity).toBeDisabled();
  await expect(page.locator('#custom-height')).toBeEnabled();
});

test('removes a selected bag through the results list', async ({ page }) => {
  await page.getByRole('button', { name: 'Reset' }).click();
  const quantity = page.locator('#qty-iata-cabin-bag');
  await quantity.fill('2');
  await expect(page.locator('#placedList .placed-item[data-source-id="iata-cabin-bag"]')).toHaveCount(2);

  const firstPlacedBag = page.locator('#placedList .placed-item[data-source-id="iata-cabin-bag"]').first();
  await firstPlacedBag.hover();
  await firstPlacedBag.locator('.placed-delete').click();
  await expect(quantity).toHaveValue('1');
  await expect(page.locator('#placedList .placed-item[data-source-id="iata-cabin-bag"]')).toHaveCount(1);
});

test('changes the 3D orientation with axis controls and dragging', async ({ page }) => {
  await page.locator('.orientation-axis-button[data-axis="z"]').click();
  await expect(page.locator('.orientation-axis-preset-label')).toHaveText('Top view');

  const visual = page.locator('.zone-3d-svg').first();
  const box = await visual.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box.x + 180, box.y + 180);
  await page.mouse.down();
  await page.mouse.move(box.x + 230, box.y + 210, { steps: 3 });
  await page.mouse.up();

  await expect(page.locator('.orientation-axis-preset-label')).toHaveCount(0);
  await expect(page.locator('.orientation-axis-angle-label')).toContainText('yaw');
});
