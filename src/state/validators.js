export function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseInteger(value) {
  return Number.parseInt(value, 10);
}

export function validateSeatBackAngleInput(value, { defaultValue, max }) {
  const parsed = parseInteger(value);
  const hasValue = Number.isFinite(parsed);
  const outOfBounds = hasValue && (parsed < 0 || parsed > max);
  return {
    parsed,
    hasValue,
    outOfBounds,
    normalized: hasValue ? clampNumber(parsed, 0, max) : defaultValue
  };
}

export function validateUsableVolumeBufferInput(value, { min, max, defaultValue }) {
  const parsed = parseInteger(value);
  const hasValue = Number.isFinite(parsed);
  const outOfBounds = hasValue && (parsed < min || parsed > max);
  return {
    parsed,
    hasValue,
    outOfBounds,
    normalized: hasValue ? clampNumber(parsed, min, max) : defaultValue
  };
}

export function isValidCustomBagDimensions(dimensions, { min, max }) {
  return ['length', 'width', 'height'].every((axis) => {
    const value = Number(dimensions?.[axis]);
    return Number.isFinite(value) && value >= min[axis] && value <= max[axis];
  });
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function validatePersistedTripSetupPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

  const { vehicleId, configurationId, seatBackAngleDegrees, usableVolumeBufferPercent } = payload;
  if (typeof vehicleId !== 'string' || vehicleId.length === 0) return null;
  if (typeof configurationId !== 'string' || configurationId.length === 0) return null;

  if (seatBackAngleDegrees !== undefined && !isFiniteNumber(seatBackAngleDegrees)) return null;
  if (usableVolumeBufferPercent !== undefined && !isFiniteNumber(usableVolumeBufferPercent)) return null;

  return { vehicleId, configurationId, seatBackAngleDegrees, usableVolumeBufferPercent };
}
