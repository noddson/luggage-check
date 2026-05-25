export const LANGUAGE_COOKIE_NAME = 'preferredLanguage';
export const LANGUAGE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
export const TRIP_SETUP_COOKIE_NAME = 'tripSetup';

export function cookieValue(name) {
  if (typeof document === 'undefined') return null;
  const segment = document.cookie.split(';').map((entry) => entry.trim()).find((entry) => entry.startsWith(`${name}=`));
  if (!segment) return null;
  return decodeURIComponent(segment.split('=').slice(1).join('='));
}
export function setCookie(name, value, maxAgeSeconds = LANGUAGE_COOKIE_MAX_AGE_SECONDS) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}
export function clearCookie(name) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function persistTripSetupPreference({ selectedVehicle, currentVehicleDefaults, state }) {
  const vehicle = selectedVehicle();
  if (!vehicle?.id) return;
  const defaults = currentVehicleDefaults(vehicle);
  const payload = {
    vehicleId: vehicle.id,
    configurationId: state.configurationId,
    seatBackAngleDegrees: state.seatBackEncroachmentAngleDegrees !== defaults.seatBackAngleDegrees ? state.seatBackEncroachmentAngleDegrees : undefined,
    usableVolumeBufferPercent: state.usableVolumeBufferPercent !== defaults.usableVolumeBufferPercent ? state.usableVolumeBufferPercent : undefined
  };
  setCookie(TRIP_SETUP_COOKIE_NAME, JSON.stringify(payload));
}

export function persistLanguagePreference({ language, defaultLanguage, clearCookieFn = clearCookie, setCookieFn = setCookie }) {
  if (typeof document === 'undefined') return;
  if (language === defaultLanguage) {
    clearCookieFn(LANGUAGE_COOKIE_NAME);
    return;
  }
  setCookieFn(LANGUAGE_COOKIE_NAME, language);
}

export function getPersistedLanguagePreference({ i18n }) {
  const cookieLanguage = cookieValue(LANGUAGE_COOKIE_NAME);
  if (!cookieLanguage) return null;
  return i18n[cookieLanguage] ? cookieLanguage : null;
}
