import { readFile } from 'node:fs/promises';
import { loadLuggageSet, loadVehicles } from './loadConfigs.js';
import { estimateFit } from './fitEstimator.node.js';

const [html, css, app, luggageSet, vehicles] = await Promise.all([
  readFile('index.html', 'utf8'),
  readFile('styles.css', 'utf8'),
  readFile('app.js', 'utf8'),
  loadLuggageSet(),
  loadVehicles()
]);

for (const marker of ['vehicleSelect', 'configurationSelect', 'seatBackEncroachmentDegrees', 'seatBackEncroachmentNote', 'luggageControls', 'resetLuggageButton', 'visualization']) {
  if (!html.includes(marker)) throw new Error(`App shell missing #${marker}`);
}
for (const marker of ['estimateFit', 'renderVisualization', 'seatEncroachmentOverlay', 'renderSeatEncroachmentWedge3d', 'view-tab', 'orientation-axis-control', 'defaultVehicle', 'resetLuggageQuantities', 'loadVehicles', 'VEHICLE_INDEX_PATH', "activeView: '3d'"]) {
  if (!app.includes(marker)) throw new Error(`Browser app missing ${marker}`);
}
for (const marker of ['bootView', 'sideView', 'topView', 'activeOrientationLabel']) {
  if (!app.includes(marker)) throw new Error(`Browser app missing orientation preset label ${marker}`);
}
if (!css.includes('.zone-card')) throw new Error('Styles missing visualization card rules');
if (!css.includes('.seat-encroachment-line') || !css.includes('.seat-encroachment-face')) throw new Error('Styles missing seat-back encroachment rules');
if (!css.includes('.orientation-axis-button')) throw new Error('Styles missing 3D orientation axis controls');
if (!css.includes('.orientation-axis-preset-label')) throw new Error('Styles missing 3D orientation preset label');
if (!css.includes('.orientation-axis-angle-label')) throw new Error('Styles missing 3D orientation angle label');
if (!css.includes('.secondary-button')) throw new Error('Styles missing secondary button rules');

if (app.includes('VEHICLE_FILES')) {
  throw new Error('Browser app should load the generated vehicle index instead of a hard-coded VEHICLE_FILES list');
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
const traficOddsonEleven = traficOddsonMonotonicCounts.find((entry) => entry.quantity === 11);
const traficOddsonTwelve = traficOddsonMonotonicCounts.find((entry) => entry.quantity === 12);
if (traficOddsonEleven.placed !== 11 || traficOddsonTwelve.placed < traficOddsonEleven.placed) {
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

console.log(`Smoke-tested app shell and ${vehicles.length} vehicles across every seat configuration.`);
