import { I18N } from './resources.js';

export { I18N };
export const DEFAULT_LANGUAGE = 'en';

export function t(state, key) {
  const bundle = I18N[state.language] ?? I18N.en;
  return bundle[key] ?? I18N.en[key] ?? key;
}

export function localizeEntity(state, entity, key) {
  const value = entity?.[key];
  if (typeof value === 'string' && value.startsWith('@i18n:')) {
    const token = value.slice(6);
    return entity?.translations?.[state.language]?.[token] ?? entity?.translations?.en?.[token] ?? token;
  }
  return entity?.translations?.[state.language]?.[key] ?? entity?.translations?.en?.[key] ?? value;
}
