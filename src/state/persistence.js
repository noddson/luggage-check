const TRIP_SETUP_COOKIE_NAME = 'tripSetup';
const LANGUAGE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

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

export function persistTripSetupPreference(payload) {
  setCookie(TRIP_SETUP_COOKIE_NAME, JSON.stringify(payload));
}

export function readPersistedTripSetupPreference() {
  const raw = cookieValue(TRIP_SETUP_COOKIE_NAME);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { clearCookie(TRIP_SETUP_COOKIE_NAME); return null; }
}
