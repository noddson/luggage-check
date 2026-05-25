import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

export async function loadLuggageSet(filePath = 'configs/luggage/common.json') {
  return readJson(filePath);
}

export async function loadVehicles(indexPath = 'configs/vehicles/index.json') {
  const vehicleIndex = await readJson(indexPath);
  const vehiclesDir = path.dirname(indexPath);
  return Promise.all(vehicleIndex.files.map((file) => readJson(path.join(vehiclesDir, file))));
}
