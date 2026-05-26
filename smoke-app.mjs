import { loadLuggageSet, loadVehicles } from './loadConfigs.js';
import { estimateFit } from './fitEstimator.node.js';
import { I18N } from './configs/i18n/index.js';
import { createLocalization } from './src/i18n/localization.js';
import {
  createBoxVertices,
  dimensionsLabel,
  mixWithWhite,
  projectBox,
  projectZone,
  renderFace,
  rotatePoint3d,
  shadeColor
} from './src/render/helpers.js';

const [luggageSet, vehicles] = await Promise.all([
  loadLuggageSet(),
  loadVehicles()
]);

for (const locale of ['en', 'es', 'it', 'xx']) {
  if (!I18N[locale]) throw new Error(`I18N bundle missing locale ${locale}`);
}
for (const key of ['zoneViewAria', 'seatGuideTitle']) {
  if (typeof I18N.en?.[key] !== 'string' || I18N.en[key].length === 0) {
    throw new Error(`English localization missing required key ${key}`);
  }
}
const localizationState = { language: 'en' };
const { localeBundle, t, localizeEntity } = createLocalization({ state: localizationState, i18n: I18N });
const translatedEntity = {
  label: '@i18n:name',
  translations: { en: { name: 'English name' }, fr: { name: 'French name' } }
};
if (localeBundle() !== I18N.en || t('pageTitle') !== I18N.en.pageTitle || localizeEntity(translatedEntity, 'label') !== 'English name') {
  throw new Error('Extracted localization helpers should resolve the initial state language');
}
localizationState.language = 'fr';
if (localeBundle() !== I18N.fr || t('pageTitle') !== I18N.fr.pageTitle || localizeEntity(translatedEntity, 'label') !== 'French name') {
  throw new Error('Extracted localization helpers should follow state language changes');
}
localizationState.language = 'unknown';
if (localeBundle() !== I18N.en || t('pageTitle') !== I18N.en.pageTitle || localizeEntity(translatedEntity, 'label') !== 'English name') {
  throw new Error('Extracted localization helpers should retain English fallbacks');
}
const renderPlacement = {
  positionMm: { x: 10, y: 20, z: 30 },
  orientationMm: { length: 100, width: 50, height: 40 }
};
const renderZone = { dimensionsMm: { length: 800, width: 500, height: 600 } };
const translateAxis = (key) => ({ length: 'Length', width: 'Width', height: 'Height' }[key]);
if (dimensionsLabel({ length: 99.7, width: 49.6, height: 39.5 }) !== '100 × 50 × 40 mm') {
  throw new Error('Extracted render helpers should retain dimension formatting');
}
if (shadeColor('#2563eb', -18) !== '#0035bd' || mixWithWhite('#2563eb', 0.9) !== '#e9effd') {
  throw new Error('Extracted render helpers should retain placement color shading');
}
if (JSON.stringify(projectBox(renderPlacement, 'side')) !== JSON.stringify({ x: 10, y: 30, width: 100, height: 40 })) {
  throw new Error('Extracted render helpers should retain side-view box projection');
}
if (JSON.stringify(projectZone(renderZone, 'front', translateAxis)) !== JSON.stringify({ width: 500, height: 600, xLabel: 'Width', yLabel: 'Height' })) {
  throw new Error('Extracted render helpers should retain translated zone projection labels');
}
const boxVertices = createBoxVertices({ x: 0, y: 0, z: 0 }, { length: 100, width: 50, height: 40 });
if (boxVertices.length !== 8 || boxVertices[6].x !== 100 || boxVertices[6].y !== 50 || boxVertices[6].z !== 40) {
  throw new Error('Extracted render helpers should retain cuboid vertices');
}
const rotatedPoint = rotatePoint3d({ x: 10, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { yaw: Math.PI / 2, pitch: 0 });
if (Math.abs(rotatedPoint.x) > 0.00001 || Math.abs(rotatedPoint.y - 10) > 0.00001 || Math.abs(rotatedPoint.depth) > 0.00001) {
  throw new Error('Extracted render helpers should retain 3D rotation math');
}
const renderedFace = renderFace([
  { x: 0, y: 0, depth: 1 },
  { x: 2, y: 0, depth: 1 },
  { x: 2, y: 2, depth: 1 }
], [0, 1, 2], '#ffffff', 'test-face', 'Face');
if (renderedFace.depth !== 1 || !renderedFace.markup.includes('points="0.0,0.0 2.0,0.0 2.0,2.0"')) {
  throw new Error('Extracted render helpers should retain SVG face markup');
}
const defaultVehicles = vehicles.filter((vehicle) => vehicle.isDefault);
if (defaultVehicles.length !== 1 || defaultVehicles[0].id !== 'volkswagen-caddy-maxi-life') {
  throw new Error('Expected Volkswagen Caddy Maxi Life to be the single default vehicle');
}

const encroachmentRegressionLuggage = {
  items: [{
    id: 'tall-rigid-case',
    label: 'Tall rigid case',
    quantity: 1,
    shapeType: 'box',
    dimensionsMm: { length: 650, width: 450, height: 600 },
    rotationAllowed: false,
    sources: []
  }]
};
const encroachmentRegressionVehicle = {
  id: 'encroachment-regression',
  make: 'Test',
  model: 'Seatback',
  generation: 'Synthetic',
  modelYears: ['2026'],
  bodyStyle: 'test fixture',
  rentalClasses: ['test'],
  commonRentalAliases: ['test'],
  cargoZones: [{
    id: 'boot',
    label: 'Boot',
    volumeLitres: 600,
    dimensionsMm: { length: 800, width: 500, height: 700 },
    seatBackEncroachment: { angleFromVerticalDegrees: 30 },
    usableFraction: 1,
    confidence: 'high'
  }],
  seatConfigurations: [{ id: 'seats_up', label: 'Seats up', cargoZoneIds: ['boot'], seatsAvailable: 5 }],
  sources: []
};
const rectangularResult = estimateFit(encroachmentRegressionLuggage, encroachmentRegressionVehicle, 'seats_up');
const encroachedResult = estimateFit(encroachmentRegressionLuggage, encroachmentRegressionVehicle, 'seats_up', {
  considerSeatBackEncroachment: true
});
const customAngleResult = estimateFit(encroachmentRegressionLuggage, encroachmentRegressionVehicle, 'seats_up', {
  considerSeatBackEncroachment: true,
  seatBackAngleDegrees: 10
});
if (!rectangularResult.fits || encroachedResult.fits || !customAngleResult.fits) {
  throw new Error('Seat-back encroachment regression failed to apply default and overridden degree angles');
}
if (rectangularResult.usableVolumeLitres !== 600 || encroachedResult.usableVolumeLitres !== 529.3 || customAngleResult.usableVolumeLitres !== 578.4) {
  throw new Error(`Seat-back encroachment usable volume regression failed: ${rectangularResult.usableVolumeLitres}/${encroachedResult.usableVolumeLitres}/${customAngleResult.usableVolumeLitres}`);
}

const traficBridgeRegressionLuggage = {
  items: [
    {
      id: 'oddson-family-carry-on',
      label: 'Oddson Family carry-on',
      quantity: 6,
      shapeType: 'box',
      dimensionsMm: { length: 570, width: 360, height: 260 },
      rotationAllowed: true,
      sources: []
    },
    {
      id: 'soft-travel-backpack',
      label: 'Soft travel backpack',
      quantity: 5,
      shapeType: 'free_form',
      dimensionsMm: { length: 520, width: 330, height: 240 },
      compressibility: 0.25,
      rotationAllowed: true,
      sources: []
    }
  ]
};
const traficBridgeRegressionVehicle = vehicles.find((vehicle) => vehicle.id === 'renault-trafic');
if (!traficBridgeRegressionVehicle) throw new Error('Renault Trafic fixture is required for coplanar support regression');
const traficBridgeRegressionResult = estimateFit(traficBridgeRegressionLuggage, traficBridgeRegressionVehicle, 'seats_up', {
  considerSeatBackEncroachment: true
});
const traficBridgeRegressionBackpacks = traficBridgeRegressionResult.placements.filter((placement) => placement.sourceId === 'soft-travel-backpack');
if (!traficBridgeRegressionResult.fits || traficBridgeRegressionBackpacks.length !== 5 || !traficBridgeRegressionBackpacks.some((placement) => placement.orientationMm.width === 494)) {
  throw new Error('Coplanar support regression failed to bridge adjacent carry-on surfaces for additional backpack placements');
}

const traficOddsonMonotonicCounts = [10, 11, 12].map((quantity) => {
  const result = estimateFit({
    items: [{
      id: 'oddson-family-carry-on',
      label: 'Oddson Family carry-on',
      quantity,
      shapeType: 'box',
      dimensionsMm: { length: 570, width: 360, height: 260 },
      rotationAllowed: true,
      sources: []
    }]
  }, traficBridgeRegressionVehicle, 'seats_up', {
    considerSeatBackEncroachment: true,
    seatBackAngleDegrees: 15
  });
  return { quantity, placed: result.placements.length };
});
const traficOddsonHasRegression = traficOddsonMonotonicCounts.some((entry, index, counts) => {
  if (entry.placed > entry.quantity) return true;
  if (index === 0) return false;
  return entry.placed < counts[index - 1].placed;
});
if (traficOddsonHasRegression) {
  throw new Error(`Planning-surplus regression failed to avoid a lower-count Trafic/Oddson packing regression: ${JSON.stringify(traficOddsonMonotonicCounts)}`);
}

const caddyCarryOnOverhangLuggage = {
  items: [{
    id: 'oddson-family-carry-on',
    label: 'Oddson Family carry-on',
    quantity: 6,
    shapeType: 'box',
    dimensionsMm: { length: 570, width: 360, height: 260 },
    rotationAllowed: true,
    sources: []
  }]
};
const caddyCarryOnOverhangVehicle = vehicles.find((vehicle) => vehicle.id === 'volkswagen-caddy-maxi-life');
if (!caddyCarryOnOverhangVehicle) throw new Error('Volkswagen Caddy Maxi Life fixture is required for supported-overhang regression');
const caddyCarryOnOverhangResult = estimateFit(caddyCarryOnOverhangLuggage, caddyCarryOnOverhangVehicle, 'seats_up', {
  considerSeatBackEncroachment: true,
  seatBackAngleDegrees: 12
});
const caddyCarryOnOverhangUpperCases = caddyCarryOnOverhangResult.placements.filter((placement) =>
  placement.sourceId === 'oddson-family-carry-on'
  && placement.positionMm.z === 260
  && placement.orientationMm.length === 360
  && placement.orientationMm.width === 570
);
if (caddyCarryOnOverhangResult.placements.length < 5 || caddyCarryOnOverhangUpperCases.length < 2) {
  throw new Error('Supported-overhang regression failed to place a fifth Caddy/Oddson carry-on with 75% footprint support');
}

function placementsOverlap(a, b) {
  return a.positionMm.x < b.positionMm.x + b.orientationMm.length
    && a.positionMm.x + a.orientationMm.length > b.positionMm.x
    && a.positionMm.y < b.positionMm.y + b.orientationMm.width
    && a.positionMm.y + a.orientationMm.width > b.positionMm.y
    && a.positionMm.z < b.positionMm.z + b.orientationMm.height
    && a.positionMm.z + a.orientationMm.height > b.positionMm.z;
}

for (const vehicle of vehicles) {
  for (const config of vehicle.seatConfigurations) {
    const result = estimateFit(luggageSet, vehicle, config.id);
    const reversedResult = estimateFit({
      ...luggageSet,
      items: [...luggageSet.items].reverse()
    }, vehicle, config.id);

    if (result.placements.length !== reversedResult.placements.length || result.unplacedItems.length !== reversedResult.unplacedItems.length) {
      throw new Error(`${vehicle.id}/${config.id} stacking depends on luggage input order`);
    }

    for (const placement of result.placements) {
      if (!placement.positionMm || !placement.orientationMm || !placement.zoneLabel) {
        throw new Error(`${vehicle.id}/${config.id} generated an incomplete placement`);
      }

      const zone = vehicle.cargoZones.find((candidate) => candidate.id === placement.zoneId);
      if (placement.positionMm.x + placement.orientationMm.length > zone.dimensionsMm.length
        || placement.positionMm.y + placement.orientationMm.width > zone.dimensionsMm.width
        || placement.positionMm.z + placement.orientationMm.height > zone.dimensionsMm.height) {
        throw new Error(`${vehicle.id}/${config.id} placed ${placement.itemId} outside ${zone.id}`);
      }
    }

    for (const [index, placement] of result.placements.entries()) {
      for (const other of result.placements.slice(index + 1).filter((candidate) => candidate.zoneId === placement.zoneId)) {
        if (placementsOverlap(placement, other)) {
          throw new Error(`${vehicle.id}/${config.id} generated overlapping placements in ${placement.zoneId}`);
        }
      }
    }
  }
}

console.log(`Smoke-tested render helpers and ${vehicles.length} vehicles across every seat configuration.`);
