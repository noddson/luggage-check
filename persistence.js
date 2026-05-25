export function cookieValue(name) {
  if (typeof document === 'undefined') return null;
  const segment = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`));
  if (!segment) return null;
  return decodeURIComponent(segment.split('=').slice(1).join('='));
}

export function setCookie(name, value, maxAgeSeconds) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

export function clearCookie(name) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function createPersistence({
  state,
  i18n,
  selectedVehicle,
  currentVehicleDefaults,
  validatePersistedTripSetupPayload,
  clamp,
  languageCookieName,
  languageCookieMaxAgeSeconds,
  defaultLanguage,
  tripSetupCookieName,
  minSeatBackAngleDegrees,
  maxSeatBackAngleDegrees,
  minUsableVolumeBufferPercent,
  maxUsableVolumeBufferPercent
}) {
  function persistTripSetupPreference() {
    const vehicle = selectedVehicle();
    if (!vehicle?.id) return;
    const defaults = currentVehicleDefaults(vehicle);
    const payload = {
      vehicleId: vehicle.id,
      configurationId: state.configurationId,
      seatBackAngleDegrees: state.seatBackEncroachmentAngleDegrees !== defaults.seatBackAngleDegrees ? state.seatBackEncroachmentAngleDegrees : undefined,
      usableVolumeBufferPercent: state.usableVolumeBufferPercent !== defaults.usableVolumeBufferPercent ? state.usableVolumeBufferPercent : undefined
    };
    setCookie(tripSetupCookieName, JSON.stringify(payload), languageCookieMaxAgeSeconds);
  }

  function applyPersistedTripSetupPreference() {
    const raw = cookieValue(tripSetupCookieName);
    if (!raw) return;
    try {
      const parsedPayload = JSON.parse(raw);
      const persisted = validatePersistedTripSetupPayload(parsedPayload);
      if (!persisted) {
        clearCookie(tripSetupCookieName);
        return;
      }
      const persistedVehicle = state.vehicles.find((vehicle) => vehicle.id === persisted.vehicleId);
      if (!persistedVehicle) return;
      state.vehicleId = persistedVehicle.id;
      const vehicle = selectedVehicle();
      const defaults = currentVehicleDefaults(vehicle);
      const validConfig = vehicle.seatConfigurations.some((config) => config.id === persisted.configurationId);
      state.configurationId = validConfig ? persisted.configurationId : defaults.configurationId;
      state.seatBackEncroachmentAngleDegrees = typeof persisted.seatBackAngleDegrees === 'number'
        ? clamp(persisted.seatBackAngleDegrees, minSeatBackAngleDegrees, maxSeatBackAngleDegrees)
        : defaults.seatBackAngleDegrees;
      state.seatBackEncroachmentInputDegrees = String(state.seatBackEncroachmentAngleDegrees);
      state.usableVolumeBufferPercent = typeof persisted.usableVolumeBufferPercent === 'number'
        ? clamp(persisted.usableVolumeBufferPercent, minUsableVolumeBufferPercent, maxUsableVolumeBufferPercent)
        : defaults.usableVolumeBufferPercent;
      state.usableVolumeBufferInputPercent = String(state.usableVolumeBufferPercent);
    } catch {
      clearCookie(tripSetupCookieName);
    }
  }

  function persistLanguagePreference(language) {
    if (typeof document === 'undefined') return;
    if (language === defaultLanguage) {
      clearCookie(languageCookieName);
      return;
    }
    setCookie(languageCookieName, language, languageCookieMaxAgeSeconds);
  }

  function getPersistedLanguagePreference() {
    const cookieLanguage = cookieValue(languageCookieName);
    if (!cookieLanguage) return null;
    return i18n[cookieLanguage] ? cookieLanguage : null;
  }

  return {
    cookieValue,
    setCookie,
    clearCookie,
    persistLanguagePreference,
    getPersistedLanguagePreference,
    persistTripSetupPreference,
    applyPersistedTripSetupPreference
  };
}
