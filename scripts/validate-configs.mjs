import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { loadLuggageSet, loadVehicles } from '../src/config/loadConfigs.js';
import { estimateFit } from '../src/packing/fitEstimator.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const URL_LIKE = /^https?:\/\//;

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

function validateDimensions(value, label, errors) {
  assert(value && typeof value === 'object', `${label} must be an object`, errors);
  for (const axis of ['length', 'width', 'height']) {
    assert(Number.isFinite(value?.[axis]) && value[axis] > 0, `${label}.${axis} must be a positive number`, errors);
  }
}

function validateSources(sources, label, errors) {
  assert(Array.isArray(sources) && sources.length > 0, `${label}.sources must be a non-empty array`, errors);
  for (const [index, source] of (sources ?? []).entries()) {
    const prefix = `${label}.sources[${index}]`;
    for (const field of ['sourceType', 'publisher', 'title', 'url', 'retrievedAt', 'fieldsCovered', 'confidence']) {
      assert(source[field] !== undefined, `${prefix}.${field} is required`, errors);
    }
    assert(URL_LIKE.test(source.url ?? ''), `${prefix}.url must start with http(s)`, errors);
    assert(ISO_DATE.test(source.retrievedAt ?? ''), `${prefix}.retrievedAt must be YYYY-MM-DD`, errors);
    assert(Array.isArray(source.fieldsCovered) && source.fieldsCovered.length > 0, `${prefix}.fieldsCovered must be non-empty`, errors);
    assert(['high', 'medium', 'low'].includes(source.confidence), `${prefix}.confidence must be high, medium, or low`, errors);
  }
}

function validateLuggageSet(luggageSet) {
  const errors = [];
  assert(luggageSet.version === 1, 'luggage version must be 1', errors);
  assert(Array.isArray(luggageSet.items) && luggageSet.items.length > 0, 'luggage.items must be non-empty', errors);
  for (const item of luggageSet.items ?? []) {
    const label = `luggage item ${item.id ?? '<missing id>'}`;
    assert(typeof item.id === 'string' && item.id.length > 0, `${label}.id is required`, errors);
    assert(typeof item.label === 'string' && item.label.length > 0, `${label}.label is required`, errors);
    assert(Number.isInteger(item.quantity) && item.quantity > 0, `${label}.quantity must be a positive integer`, errors);
    assert(['box', 'soft_box', 'ellipsoid', 'cylinder', 'free_form'].includes(item.shapeType), `${label}.shapeType is invalid`, errors);
    validateDimensions(item.dimensionsMm, `${label}.dimensionsMm`, errors);
    if (item.compressibility !== undefined) assert(item.compressibility >= 0 && item.compressibility <= 1, `${label}.compressibility must be 0..1`, errors);
    if (item.boundingBoxes) item.boundingBoxes.forEach((box, index) => validateDimensions(box.dimensionsMm, `${label}.boundingBoxes[${index}].dimensionsMm`, errors));
    validateSources(item.sources, label, errors);
  }
  return errors;
}

function validateVehicle(vehicle) {
  const errors = [];
  const label = `vehicle ${vehicle.id ?? '<missing id>'}`;
  for (const field of ['id', 'make', 'model', 'generation', 'bodyStyle']) {
    assert(typeof vehicle[field] === 'string' && vehicle[field].length > 0, `${label}.${field} is required`, errors);
  }
  if (vehicle.isDefault !== undefined) assert(typeof vehicle.isDefault === 'boolean', `${label}.isDefault must be a boolean when provided`, errors);
  for (const field of ['modelYears', 'rentalClasses', 'commonRentalAliases', 'cargoZones', 'seatConfigurations']) {
    assert(Array.isArray(vehicle[field]) && vehicle[field].length > 0, `${label}.${field} must be a non-empty array`, errors);
  }
  validateSources(vehicle.sources, label, errors);
  assert(vehicle.sources?.some((source) => source.sourceType === 'manufacturer'), `${label} must include a manufacturer source`, errors);
  assert(vehicle.sources?.some((source) => ['rental-company', 'rental-broker'].includes(source.sourceType)), `${label} must include a rental-market source`, errors);

  const zoneIds = new Set();
  for (const zone of vehicle.cargoZones ?? []) {
    const zoneLabel = `${label}.cargoZones.${zone.id ?? '<missing id>'}`;
    assert(typeof zone.id === 'string' && zone.id.length > 0, `${zoneLabel}.id is required`, errors);
    assert(!zoneIds.has(zone.id), `${zoneLabel}.id must be unique`, errors);
    zoneIds.add(zone.id);
    assert(Number.isFinite(zone.volumeLitres) && zone.volumeLitres > 0, `${zoneLabel}.volumeLitres must be positive`, errors);
    if (zone.dimensionsMm) validateDimensions(zone.dimensionsMm, `${zoneLabel}.dimensionsMm`, errors);
    if (zone.seatBackEncroachment) {
      const angle = zone.seatBackEncroachment.angleFromVerticalDegrees;
      assert(Number.isFinite(angle) && angle >= 0 && angle < 90, `${zoneLabel}.seatBackEncroachment.angleFromVerticalDegrees must be >=0 and <90`, errors);
    }
    if (zone.usableFraction !== undefined) assert(zone.usableFraction > 0 && zone.usableFraction <= 1, `${zoneLabel}.usableFraction must be >0 and <=1`, errors);
    assert(['high', 'medium', 'low'].includes(zone.confidence), `${zoneLabel}.confidence must be high, medium, or low`, errors);
  }
  for (const config of vehicle.seatConfigurations ?? []) {
    const configLabel = `${label}.seatConfigurations.${config.id ?? '<missing id>'}`;
    assert(Number.isInteger(config.seatsAvailable) && config.seatsAvailable > 0, `${configLabel}.seatsAvailable must be positive`, errors);
    for (const zoneId of config.cargoZoneIds ?? []) assert(zoneIds.has(zoneId), `${configLabel} references unknown cargo zone ${zoneId}`, errors);
  }
  return errors;
}

const luggageSet = await loadLuggageSet();
const vehicles = await loadVehicles();
const errors = [...validateLuggageSet(luggageSet), ...vehicles.flatMap(validateVehicle)];
const europeFiles = (await readdir('configs/vehicles/europe')).filter((file) => file.endsWith('.json'));
const northAmericaFiles = (await readdir('configs/vehicles/north-america')).filter((file) => file.endsWith('.json'));
assert(europeFiles.length >= 6, 'expected at least six starter European vehicle configs', errors);
assert(northAmericaFiles.length >= 2, 'expected at least two North American vehicle configs', errors);
const defaultVehicles = vehicles.filter((vehicle) => vehicle.isDefault);
assert(defaultVehicles.length === 1, 'expected exactly one default vehicle config', errors);
assert(defaultVehicles[0]?.id === 'volkswagen-caddy-maxi-life', 'expected Volkswagen Caddy Maxi Life to be the default vehicle', errors);

for (const vehicle of vehicles) {
  const result = estimateFit(luggageSet, vehicle, 'seats_up');
  assert(typeof result.fits === 'boolean', `fit estimator did not return a boolean for ${vehicle.id}`, errors);
}

if (errors.length > 0) {
  console.error(`Config validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validated ${luggageSet.items.length} luggage presets and ${vehicles.length} vehicle configs.`);
console.log(`Config directories: ${path.resolve('configs/luggage')} and ${path.resolve('configs/vehicles')}`);
