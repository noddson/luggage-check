import { clamp, normalizeYaw } from '../render/helpers.js';
import {
  validateSeatBackAngleInput,
  validateUsableVolumeBufferInput
} from '../state/validators.js';

export function createActions({
  state,
  document,
  $,
  constants,
  render,
  persistence,
  validConfigurationId,
  defaultSeatBackAngleForSelection,
  orientationPresets
}) {
  const {
    customBagIds,
    customBagMinDimensionsMm,
    customBagMaxDimensionsMm,
    defaultSeatBackAngleDegrees,
    maxSeatBackAngleDegrees,
    defaultUsableVolumeBufferPercent,
    minUsableVolumeBufferPercent,
    maxUsableVolumeBufferPercent
  } = constants;

  function resetSeatBackAngleToDefault() {
    state.seatBackEncroachmentAngleDegrees = defaultSeatBackAngleForSelection();
    state.seatBackEncroachmentInputDegrees = String(state.seatBackEncroachmentAngleDegrees);
  }

  function setVehicle(vehicleId) {
    state.vehicleId = vehicleId;
    state.configurationId = validConfigurationId();
    render.configurationOptions();
    resetSeatBackAngleToDefault();
    state.usableVolumeBufferPercent = defaultUsableVolumeBufferPercent;
    state.usableVolumeBufferInputPercent = String(defaultUsableVolumeBufferPercent);
    render.seatBackEncroachmentState();
    persistence.persistTripSetupPreference();
    render.results();
  }

  function setConfiguration(configurationId) {
    state.configurationId = configurationId;
    resetSeatBackAngleToDefault();
    render.seatBackEncroachmentState();
    persistence.persistTripSetupPreference();
    render.results();
  }

  function setSeatBackAngle(value) {
    state.seatBackEncroachmentInputDegrees = value;
    const validation = validateSeatBackAngleInput(value, {
      defaultValue: defaultSeatBackAngleDegrees,
      max: maxSeatBackAngleDegrees
    });
    render.boundaryStatus(render.elements.seatBackAngleInput, validation.outOfBounds);
    state.seatBackEncroachmentAngleDegrees = validation.normalized;
    persistence.persistTripSetupPreference();
    render.results();
  }

  function setBuffer(value) {
    state.usableVolumeBufferInputPercent = value;
    const validation = validateUsableVolumeBufferInput(value, {
      min: minUsableVolumeBufferPercent,
      max: maxUsableVolumeBufferPercent,
      defaultValue: defaultUsableVolumeBufferPercent
    });
    render.boundaryStatus(render.elements.bufferInput, validation.outOfBounds);
    state.usableVolumeBufferPercent = validation.normalized;
    persistence.persistTripSetupPreference();
    render.results();
  }

  function setItemQuantity() {
    render.results();
  }

  function setCustomBagDimension(customBagId, axis, value) {
    if (!customBagIds.includes(customBagId) || !['height', 'width', 'length'].includes(axis)) return;
    const input = $(`#${customBagId}-${axis}`);
    const customBag = state.luggageSet?.items?.find((item) => item.id === customBagId);
    if (!input || !customBag || input.disabled) return;

    const parsed = Number.parseInt(value, 10);
    const hasValue = Number.isFinite(parsed);
    const isOutOfBounds = !hasValue
      || parsed < customBagMinDimensionsMm[axis]
      || parsed > customBagMaxDimensionsMm[axis];
    render.boundaryStatus(input, isOutOfBounds);
    customBag.dimensionsMm[axis] = hasValue ? parsed : 0;
    render.results();
  }

  function resetLuggageQuantities() {
    render.elements.luggageControls.querySelectorAll('input').forEach((input) => {
      input.value = '0';
    });
    state.luggageSet?.items?.filter((item) => customBagIds.includes(item.id)).forEach((customBag) => {
      ['height', 'width', 'length'].forEach((axis) => {
        customBag.dimensionsMm[axis] = 0;
      });
    });
    render.syncCustomBagControlState();
    render.results();
  }

  function decrementItemQuantity(sourceId) {
    const quantityInput = $(`#qty-${sourceId}`);
    if (!quantityInput) return;
    const current = Math.max(0, Number(quantityInput.value) || 0);
    quantityInput.value = String(Math.max(0, current - 1));
    render.results();
  }

  function setView(view) {
    state.activeView = view;
    render.activeViewTab(view);
    render.results('view');
  }

  function setLanguage(language) {
    state.language = language;
    document.documentElement.lang = language;
    if (render.elements.languageSelect.value !== language) {
      render.elements.languageSelect.value = language;
    }
    persistence.persistLanguagePreference(language);
    render.staticTranslations();
    render.vehicleOptions();
    render.configurationOptions();
    render.seatBackEncroachmentState();
    render.luggageControls();
    render.results('localization');
  }

  function set3dOrientation(axis) {
    const preset = orientationPresets()[axis];
    if (!preset) return;
    state.rotation3d = { yaw: normalizeYaw(preset.yaw), pitch: preset.pitch };
    state.activeOrientationLabel = preset.label;
    render.results('orientation3d');
  }

  function rotate3d(dx, dy) {
    state.rotation3d.yaw = normalizeYaw(state.rotation3d.yaw - dx * 0.35);
    state.rotation3d.pitch = clamp(state.rotation3d.pitch - dy * 0.25, 0, 90);
    if (dx || dy) state.activeOrientationLabel = '';
    render.results('orientation3d');
  }

  return {
    setVehicle,
    setConfiguration,
    resetSeatBackAngleToDefault,
    setSeatBackAngle,
    setBuffer,
    setItemQuantity,
    setCustomBagDimension,
    resetLuggageQuantities,
    decrementItemQuantity,
    setView,
    setLanguage,
    set3dOrientation,
    rotate3d
  };
}
