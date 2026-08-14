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

  const [tripSetupFontSize, bagListFontSize] = await page
    .locator('[data-i18n="tripSetup"], [data-i18n="bagList"]')
    .evaluateAll((headings) => headings.map((heading) => getComputedStyle(heading).fontSize));
  expect(bagListFontSize).toBe(tripSetupFontSize);
});

test('offers contribution and localized request email links', async ({ page }) => {
  const contributionLink = page.getByRole('link', { name: 'pay-what-you-want contribution' });
  await expect(contributionLink).toHaveAttribute('href', 'https://paypal.me/noddson');

  const vehicleRequestLink = page.locator('#vehicleRequestEmail');
  const bagRequestLink = page.locator('#bagRequestEmail');
  await expect(vehicleRequestLink).toHaveAccessibleName('Request a new vehicle');
  await expect(bagRequestLink).toHaveAccessibleName('Request a new bag type');
  for (const [locale, bundle] of Object.entries(I18N)) {
    await page.locator('#languageSelect').selectOption(locale);
    await expect(vehicleRequestLink).toHaveAttribute('aria-label', bundle.vehicleRequestEmailLabel);
    await expect(vehicleRequestLink).toHaveAttribute(
      'href',
      `mailto:noddson+luggage-check@gmail.com?subject=${encodeURIComponent(bundle.vehicleRequestEmailSubject)}`
    );
    await expect(bagRequestLink).toHaveAttribute('aria-label', bundle.bagRequestEmailLabel);
    await expect(bagRequestLink).toHaveAttribute(
      'href',
      `mailto:noddson+luggage-check@gmail.com?subject=${encodeURIComponent(bundle.bagRequestEmailSubject)}`
    );
    await expect(page.locator('.custom-bag-meta strong')).toHaveText(
      [1, 2, 3].map((number) => bundle.customBagNumber.replace('{number}', String(number)))
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

test('manages three independently sized custom bags and omits zero quantities from results', async ({ page }) => {
  await page.getByRole('button', { name: 'Reset' }).click();
  const customRows = page.locator('.luggage-item--custom');
  await expect(customRows).toHaveCount(3);
  await expect(customRows.locator('.custom-bag-meta strong')).toHaveText(['Custom Bag #1', 'Custom Bag #2', 'Custom Bag #3']);
  await expect(customRows.locator('.custom-bag-format')).toHaveText(['H×W×D (mm)', 'H×W×D (mm)', 'H×W×D (mm)']);
  const customRowLayouts = await customRows.evaluateAll((rows) => rows.map((row) => {
    const formatRect = row.querySelector('.custom-bag-format').getBoundingClientRect();
    const dimensionRects = [...row.querySelectorAll('[data-custom-bag-axis]')].map((input) => input.getBoundingClientRect());
    const quantityRect = row.querySelector('[id^="qty-custom-bag-"]').getBoundingClientRect();
    return {
      formatBottom: formatRect.bottom,
      dimensionTops: dimensionRects.map((rect) => rect.top),
      dimensionWidths: dimensionRects.map((rect) => rect.width),
      lastDimensionRight: dimensionRects.at(-1).right,
      quantityLeft: quantityRect.left,
      fitsWithinRow: row.scrollWidth <= row.clientWidth
    };
  }));
  customRowLayouts.forEach(({ formatBottom, dimensionTops, dimensionWidths, lastDimensionRight, quantityLeft, fitsWithinRow }) => {
    expect(Math.min(...dimensionTops)).toBeGreaterThanOrEqual(formatBottom);
    expect(Math.max(...dimensionTops) - Math.min(...dimensionTops)).toBeLessThan(2);
    expect(Math.min(...dimensionWidths)).toBeGreaterThan(50);
    expect(quantityLeft).toBeGreaterThan(lastDimensionRight);
    expect(fitsWithinRow).toBe(true);
  });

  const customBag1Quantity = page.locator('#qty-custom-bag-1');
  const customBag2Quantity = page.locator('#qty-custom-bag-2');
  const customBag3Quantity = page.locator('#qty-custom-bag-3');
  await expect(customBag1Quantity).toBeDisabled();
  await expect(customBag2Quantity).toBeDisabled();
  await expect(customBag3Quantity).toBeDisabled();

  await page.locator('#custom-bag-1-height').fill('300');
  await page.locator('#custom-bag-1-width').fill('400');
  await page.locator('#custom-bag-1-length').fill('500');
  await page.locator('#custom-bag-2-height').fill('200');
  await page.locator('#custom-bag-2-width').fill('300');
  await page.locator('#custom-bag-2-length').fill('400');
  await page.locator('#custom-bag-3-height').fill('100');
  await page.locator('#custom-bag-3-width').fill('200');
  await page.locator('#custom-bag-3-length').fill('300');
  await expect(customBag1Quantity).toBeEnabled();
  await expect(customBag2Quantity).toBeEnabled();
  await expect(customBag3Quantity).toBeEnabled();

  await customBag1Quantity.fill('1');
  await customBag2Quantity.fill('2');
  await expect(page.locator('#placedList .placed-item[data-source-id="custom-bag-1"], #unplacedList .placed-item[data-source-id="custom-bag-1"]')).toHaveCount(1);
  await expect(page.locator('#placedList .placed-item[data-source-id="custom-bag-2"], #unplacedList .placed-item[data-source-id="custom-bag-2"]')).toHaveCount(2);
  await expect(page.locator('#placedList .placed-item[data-source-id="custom-bag-3"], #unplacedList .placed-item[data-source-id="custom-bag-3"]')).toHaveCount(0);
  await expect(page.locator('#custom-bag-1-height')).toBeDisabled();
  await expect(page.locator('#custom-bag-2-height')).toBeDisabled();
  await expect(page.locator('#custom-bag-3-height')).toBeEnabled();

  await customBag1Quantity.fill('0');
  await expect(page.locator('#placedList .placed-item[data-source-id="custom-bag-1"], #unplacedList .placed-item[data-source-id="custom-bag-1"]')).toHaveCount(0);
  await expect(page.locator('#custom-bag-1-height')).toBeEnabled();

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(customBag1Quantity).toHaveValue('0');
  await expect(customBag2Quantity).toHaveValue('0');
  await expect(customBag3Quantity).toHaveValue('0');
  await expect(customBag1Quantity).toBeDisabled();
  await expect(customBag2Quantity).toBeDisabled();
  await expect(customBag3Quantity).toBeDisabled();
  await expect(page.locator('#placedList .placed-item[data-source-id^="custom-bag-"], #unplacedList .placed-item[data-source-id^="custom-bag-"]')).toHaveCount(0);
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
