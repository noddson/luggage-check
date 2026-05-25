import { I18N } from './resources.js';

const LANGUAGE_COOKIE_NAME = 'preferredLanguage';
const LANGUAGE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const DEFAULT_LANGUAGE = 'en';

export { I18N, DEFAULT_LANGUAGE, LANGUAGE_COOKIE_NAME };

export function createI18nContext(getLanguage) {
  const localeBundle = () => I18N[getLanguage()] ?? I18N.en;
  const t = (key) => localeBundle()[key] ?? I18N.en[key] ?? key;

  const localizeEntity = (entity, key) => {
    const language = getLanguage();
    const value = entity?.[key];
    if (typeof value === 'string' && value.startsWith('@i18n:')) {
      const token = value.slice(6);
      return entity?.translations?.[language]?.[token]
        ?? entity?.translations?.en?.[token]
        ?? token;
    }
    return entity?.translations?.[language]?.[key] ?? entity?.translations?.en?.[key] ?? value;
  };

  return { t, localizeEntity };
}

function cookieValue(name) {
  if (typeof document === 'undefined') return null;
  const segment = document.cookie.split(';').map((entry) => entry.trim()).find((entry) => entry.startsWith(`${name}=`));
  if (!segment) return null;
  return decodeURIComponent(segment.split('=').slice(1).join('='));
}

function setCookie(name, value, maxAgeSeconds = LANGUAGE_COOKIE_MAX_AGE_SECONDS) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

function clearCookie(name) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function persistLanguagePreference(language) {
  if (language === DEFAULT_LANGUAGE) {
    clearCookie(LANGUAGE_COOKIE_NAME);
    return;
  }
  setCookie(LANGUAGE_COOKIE_NAME, language);
}

export function getPersistedLanguagePreference() {
  const cookieLanguage = cookieValue(LANGUAGE_COOKIE_NAME);
  if (!cookieLanguage) return null;
  return I18N[cookieLanguage] ? cookieLanguage : null;
}
