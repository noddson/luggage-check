import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

export async function loadLuggageSet(filePath = 'configs/luggage/common.json') {
  return readJson(filePath);
}

export async function loadEuropeanVehicles(dir = 'configs/vehicles/europe') {
  const files = (await readdir(dir)).filter((file) => file.endsWith('.json')).sort();
  return Promise.all(files.map(async (file) => readJson(path.join(dir, file))));
}
