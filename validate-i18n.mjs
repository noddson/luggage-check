import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const i18nDir = path.join(__dirname, 'configs', 'i18n');

const files = (await fs.readdir(i18nDir)).filter((file) => file.endsWith('.json')).sort();
if (!files.includes('en.json')) {
  throw new Error('Missing baseline locale file: configs/i18n/en.json');
}

const localeEntries = await Promise.all(files.map(async (file) => {
  const locale = path.basename(file, '.json');
  const raw = await fs.readFile(path.join(i18nDir, file), 'utf8');
  return [locale, JSON.parse(raw)];
}));

const locales = Object.fromEntries(localeEntries);
const enKeys = new Set(Object.keys(locales.en));
let hasError = false;

for (const [locale, bundle] of Object.entries(locales)) {
  const keys = new Set(Object.keys(bundle));
  const missing = [...enKeys].filter((key) => !keys.has(key));
  const extra = [...keys].filter((key) => !enKeys.has(key));

  if (missing.length || extra.length) {
    hasError = true;
    console.error(`Locale "${locale}" key mismatch:`);
    if (missing.length) console.error(`  Missing keys (${missing.length}): ${missing.join(', ')}`);
    if (extra.length) console.error(`  Extra keys (${extra.length}): ${extra.join(', ')}`);
  }
}

if (hasError) {
  process.exit(1);
}

console.log(`I18N validation passed for ${Object.keys(locales).length} locales (${files.join(', ')}).`);
