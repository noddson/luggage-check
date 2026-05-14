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

for (const marker of ['vehicleSelect', 'configurationSelect', 'luggageControls', 'visualization']) {
  if (!html.includes(marker)) throw new Error(`App shell missing #${marker}`);
}
for (const marker of ['estimateFit', 'renderVisualization', 'view-tab']) {
  if (!app.includes(marker)) throw new Error(`Browser app missing ${marker}`);
}
if (!css.includes('.zone-card')) throw new Error('Styles missing visualization card rules');

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
