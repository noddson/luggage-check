import { readFile } from 'node:fs/promises';
import { loadEuropeanVehicles, loadLuggageSet } from '../src/config/loadConfigs.js';
import { estimateFit } from '../src/packing/fitEstimator.js';

const [html, css, app, luggageSet, vehicles] = await Promise.all([
  readFile('public/index.html', 'utf8'),
  readFile('public/styles.css', 'utf8'),
  readFile('public/app.js', 'utf8'),
  loadLuggageSet(),
  loadEuropeanVehicles()
]);

for (const marker of ['vehicleSelect', 'configurationSelect', 'luggageControls', 'visualization']) {
  if (!html.includes(marker)) throw new Error(`App shell missing #${marker}`);
}
for (const marker of ['estimateFit', 'renderVisualization', 'view-tab']) {
  if (!app.includes(marker)) throw new Error(`Browser app missing ${marker}`);
}
if (!css.includes('.zone-card')) throw new Error('Styles missing visualization card rules');

for (const vehicle of vehicles) {
  for (const config of vehicle.seatConfigurations) {
    const result = estimateFit(luggageSet, vehicle, config.id);
    for (const placement of result.placements) {
      if (!placement.positionMm || !placement.orientationMm || !placement.zoneLabel) {
        throw new Error(`${vehicle.id}/${config.id} generated an incomplete placement`);
      }
    }
  }
}

console.log(`Smoke-tested app shell and ${vehicles.length} vehicles across every seat configuration.`);
