import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

export async function loadLuggageSet(filePath = 'configs/luggage/common.json') {
  return readJson(filePath);
}

export async function loadVehicles(dir = 'configs/vehicles') {
  const regions = (await readdir(dir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const vehiclesByRegion = await Promise.all(regions.map(async (region) => {
    const regionDir = path.join(dir, region);
    const files = (await readdir(regionDir)).filter((file) => file.endsWith('.json')).sort();
    return Promise.all(files.map(async (file) => readJson(path.join(regionDir, file))));
  }));

  return vehiclesByRegion.flat();
}

export async function loadEuropeanVehicles(dir = 'configs/vehicles/europe') {
  const files = (await readdir(dir)).filter((file) => file.endsWith('.json')).sort();
  return Promise.all(files.map(async (file) => readJson(path.join(dir, file))));
}
