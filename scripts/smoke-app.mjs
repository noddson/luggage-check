import { readFile } from 'node:fs/promises';
import { loadLuggageSet, loadVehicles } from '../src/config/loadConfigs.js';
import { estimateFit } from '../src/packing/fitEstimator.js';

const [html, css, app, luggageSet, vehicles] = await Promise.all([
  readFile('public/index.html', 'utf8'),
  readFile('public/styles.css', 'utf8'),
  readFile('public/app.js', 'utf8'),
  loadLuggageSet(),
  loadVehicles()
]);

for (const marker of ['vehicleSelect', 'configurationSelect', 'seatBackEncroachmentToggle', 'luggageControls', 'resetLuggageButton', 'visualization']) {
  if (!html.includes(marker)) throw new Error(`App shell missing #${marker}`);
}
for (const marker of ['estimateFit', 'renderVisualization', 'seatEncroachmentOverlay', 'view-tab', 'orientation-axis-control', 'defaultVehicle', 'resetLuggageQuantities', "activeView: '3d'"]) {
  if (!app.includes(marker)) throw new Error(`Browser app missing ${marker}`);
}
for (const marker of ['Boot View', 'Side View', 'Top View', 'activeOrientationLabel']) {
  if (!app.includes(marker)) throw new Error(`Browser app missing orientation preset label ${marker}`);
}
if (!css.includes('.zone-card')) throw new Error('Styles missing visualization card rules');
if (!css.includes('.seat-encroachment-line')) throw new Error('Styles missing seat-back encroachment rules');
if (!css.includes('.orientation-axis-button')) throw new Error('Styles missing 3D orientation axis controls');
if (!css.includes('.orientation-axis-preset-label')) throw new Error('Styles missing 3D orientation preset label');
if (!css.includes('.orientation-axis-angle-label')) throw new Error('Styles missing 3D orientation angle label');
if (!css.includes('.secondary-button')) throw new Error('Styles missing secondary button rules');

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
if (!rectangularResult.fits || encroachedResult.fits) {
  throw new Error('Seat-back encroachment regression failed to reject a tall case that only fits the rectangular envelope');
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
