import { estimateFit } from '../src/packing/fitEstimator.js';

const VEHICLE_INDEX_PATH = '../configs/vehicles/index.json';

const BAG_COLORS = ['#2563eb', '#16a34a', '#f97316', '#9333ea', '#0891b2', '#e11d48', '#ca8a04', '#4f46e5'];
const DEFAULT_SEAT_BACK_ANGLE_DEGREES = 20;
const state = {
  luggageSet: null,
  vehicles: [],
  vehicleId: '',
  configurationId: '',
  activeView: '3d',
  seatBackEncroachmentAngleDegrees: DEFAULT_SEAT_BACK_ANGLE_DEGREES,
  rotation3d: { yaw: -45, pitch: 60 },
  activeOrientationLabel: ''
};

const $ = (selector) => document.querySelector(selector);
const vehicleSelect = $('#vehicleSelect');
const configurationSelect = $('#configurationSelect');
const seatBackEncroachmentDegreesInput = $('#seatBackEncroachmentDegrees');
const seatBackEncroachmentNote = $('#seatBackEncroachmentNote');
const luggageControls = $('#luggageControls');
const resetLuggageButton = $('#resetLuggageButton');
const visualization = $('#visualization');

async function readJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Unable to load ${path}`);
  return response.json();
}

async function loadVehicles() {
  const vehicleIndex = await readJson(VEHICLE_INDEX_PATH);
  return Promise.all(vehicleIndex.files.map((file) => readJson(`../configs/vehicles/${file}`)));
}

function dimensionsLabel(dimensions) {
  return `${Math.round(dimensions.length)} × ${Math.round(dimensions.width)} × ${Math.round(dimensions.height)} mm`;
}

function defaultSeatBackAngleDegrees(zones) {
  return zones.find((zone) => zone.seatBackEncroachment)?.seatBackEncroachment?.angleFromVerticalDegrees ?? DEFAULT_SEAT_BACK_ANGLE_DEGREES;
}

function seatBackAngleDegrees(zone) {
  return zone.seatBackEncroachment ? state.seatBackEncroachmentAngleDegrees : (zone.seatBackEncroachment?.angleFromVerticalDegrees ?? DEFAULT_SEAT_BACK_ANGLE_DEGREES);
}

function seatBackEncroachmentMmAtHeight(zone, heightMm) {
  return heightMm * Math.tan(seatBackAngleDegrees(zone) * (Math.PI / 180));
}

function hasActiveSeatBackEncroachment(zones) {
  return zones.some((zone) => zone.seatBackEncroachment);
}

function vehicleLabel(vehicle) {
  return `${vehicle.make} ${vehicle.model} (${vehicle.bodyStyle})`;
}

function cloneLuggageWithQuantities() {
  return {
    ...state.luggageSet,
    items: state.luggageSet.items.map((item) => ({
      ...item,
      quantity: Number($(`#qty-${item.id}`).value)
    })).filter((item) => item.quantity > 0)
  };
}

function defaultVehicle() {
  return state.vehicles.find((vehicle) => vehicle.isDefault) ?? state.vehicles[0];
}

function selectedVehicle() {
  return state.vehicles.find((vehicle) => vehicle.id === state.vehicleId) ?? defaultVehicle();
}

function selectedConfiguration(vehicle = selectedVehicle()) {
  return vehicle.seatConfigurations.find((config) => config.id === state.configurationId) ?? vehicle.seatConfigurations[0];
}

function renderVehicleOptions() {
  vehicleSelect.innerHTML = state.vehicles.map((vehicle) =>
    `<option value="${vehicle.id}">${vehicleLabel(vehicle)}</option>`
  ).join('');
  vehicleSelect.value = state.vehicleId;
}

function renderConfigurationOptions() {
  const vehicle = selectedVehicle();
  configurationSelect.innerHTML = vehicle.seatConfigurations.map((config) =>
    `<option value="${config.id}">${config.label} · ${config.seatsAvailable} seats</option>`
  ).join('');
  if (!vehicle.seatConfigurations.some((config) => config.id === state.configurationId)) {
    state.configurationId = vehicle.seatConfigurations[0].id;
  }
  configurationSelect.value = state.configurationId;
}

function renderVehicleMeta() {
  const vehicle = selectedVehicle();
  const config = selectedConfiguration(vehicle);
  const zones = config.cargoZoneIds.map((id) => vehicle.cargoZones.find((zone) => zone.id === id)).filter(Boolean);
  const encroachmentZones = zones.filter((zone) => zone.seatBackEncroachment);
  renderSeatBackEncroachmentControl(zones);
  $('#vehicleMeta').innerHTML = `
    <strong>${vehicle.generation}</strong>
    <span>${vehicle.rentalClasses.join(' · ')}</span>
    <span>${zones.length} cargo zone${zones.length === 1 ? '' : 's'} active · ${config.seatsAvailable} seats available</span>
    ${encroachmentZones.length ? `<span>Seat-back encroachment defaults: ${encroachmentZones.map((zone) => `${zone.seatBackEncroachment.angleFromVerticalDegrees}° for ${zone.label}`).join(' · ')}</span>` : ''}
    ${config.notes ? `<em>${config.notes}</em>` : ''}
  `;
}

function renderSeatBackEncroachmentControl(zones) {
  const defaultAngle = defaultSeatBackAngleDegrees(zones);
  const hasEncroachment = hasActiveSeatBackEncroachment(zones);
  seatBackEncroachmentDegreesInput.value = state.seatBackEncroachmentAngleDegrees;
  seatBackEncroachmentDegreesInput.disabled = !hasEncroachment;
  seatBackEncroachmentNote.textContent = hasEncroachment
    ? `Sloped rear seat backs constrain upper-depth clearance. Vehicle default: ${defaultAngle}°; edit the degree angle to override it.`
    : 'No active cargo zone defines sloped rear seat-back encroachment.';
}

function syncSeatBackEncroachmentDefault() {
  const vehicle = selectedVehicle();
  const config = selectedConfiguration(vehicle);
  const zones = config.cargoZoneIds.map((id) => vehicle.cargoZones.find((zone) => zone.id === id)).filter(Boolean);
  state.seatBackEncroachmentAngleDegrees = defaultSeatBackAngleDegrees(zones);
}

function resetLuggageQuantities() {
  luggageControls.querySelectorAll('input').forEach((input) => {
    input.value = 0;
  });
  renderResults();
}

function renderLuggageControls() {
  luggageControls.innerHTML = state.luggageSet.items.map((item) => `
    <article class="luggage-item">
      <div>
        <strong>${item.label}</strong>
        <span>${dimensionsLabel(item.dimensionsMm)} · ${item.shapeType.replace('_', ' ')}</span>
      </div>
      <label>
        <span class="sr-only">Quantity for ${item.label}</span>
        <input id="qty-${item.id}" type="number" min="0" max="12" step="1" value="${item.quantity}" />
      </label>
    </article>
  `).join('');
  luggageControls.querySelectorAll('input').forEach((input) => input.addEventListener('input', renderResults));
}

function metricCard(label, value, detail = '') {
  return `<article class="metric"><span>${label}</span><strong>${value}</strong>${detail ? `<small>${detail}</small>` : ''}</article>`;
}

function colorForPlacement(placement) {
  const source = placement.sourceId ?? placement.itemId.split('#')[0];
  const uniqueSources = [...new Set(estimateSources().map((item) => item.id))];
  const index = uniqueSources.indexOf(source);
  return BAG_COLORS[(index < 0 ? 0 : index) % BAG_COLORS.length];
}

function estimateSources() {
  return state.luggageSet?.items ?? [];
}

function projectBox(placement, view) {
  const { positionMm: position, orientationMm: size } = placement;
  if (view === 'side') return { x: position.x, y: position.z, width: size.length, height: size.height };
  if (view === 'front') return { x: position.y, y: position.z, width: size.width, height: size.height };
  return { x: position.x, y: position.y, width: size.length, height: size.width };
}

function projectZone(zone, view) {
  const dimensions = zone.dimensionsMm;
  if (view === 'side') return { width: dimensions.length, height: dimensions.height, xLabel: 'length', yLabel: 'height' };
  if (view === 'front') return { width: dimensions.width, height: dimensions.height, xLabel: 'width', yLabel: 'height' };
  return { width: dimensions.length, height: dimensions.width, xLabel: 'length', yLabel: 'width' };
}

function seatEncroachmentOverlay(zone, projection, view, padding, scale) {
  if (view !== 'side' || !hasActiveSeatBackEncroachment([zone]) || !zone.dimensionsMm) return '';

  const floorX = padding + projection.width * scale;
  const topX = padding + Math.max(0, projection.width - seatBackEncroachmentMmAtHeight(zone, zone.dimensionsMm.height)) * scale;
  const floorY = padding + projection.height * scale;
  const topY = padding;
  return `
    <g aria-label="Seat-back encroachment envelope">
      <polygon class="seat-encroachment-area" points="${floorX},${floorY} ${floorX},${topY} ${topX},${topY}" />
      <line class="seat-encroachment-line" x1="${floorX}" y1="${floorY}" x2="${topX}" y2="${topY}" />
    </g>
  `;
}

function seatOutlineFor2dView(projection, view, padding, scale) {
  const seatFill = '#fef3c7';
  const seatStroke = '#92400e';
  const label = view === 'front' ? 'Forward seats' : 'Forward / seats';

  if (view === 'side') {
    const x = padding + projection.width * scale + 14;
    const floorY = padding + projection.height * scale;
    const seatWidth = Math.min(58, projection.width * scale * 0.18);
    const seatHeight = Math.min(92, projection.height * scale * 0.7);
    const baseHeight = Math.max(12, seatHeight * 0.28);
    return `
      <g class="seat-outline seat-outline--side" aria-label="${label}">
        <path d="M ${x} ${floorY - baseHeight} h ${seatWidth} q 8 0 8 8 v ${baseHeight - 8} h ${-seatWidth - 8} z" fill="${seatFill}" stroke="${seatStroke}" />
        <path d="M ${x + seatWidth * 0.46} ${floorY - baseHeight} l ${seatWidth * 0.18} ${-seatHeight} q 3 -10 14 -7 l ${seatWidth * 0.18} 4 l ${-seatWidth * 0.23} ${seatHeight + 3} z" fill="${seatFill}" stroke="${seatStroke}" />
        <text x="${x + seatWidth / 2}" y="${Math.max(18, floorY - seatHeight - 14)}" text-anchor="middle" class="seat-label">front</text>
      </g>
    `;
  }

  if (view === 'front') {
    const cargoX = padding;
    const cargoY = padding;
    const cargoWidth = projection.width * scale;
    const seatWidth = Math.max(42, cargoWidth * 0.26);
    const seatHeight = Math.min(54, projection.height * scale * 0.28);
    const gap = Math.max(14, cargoWidth * 0.08);
    const startX = cargoX + (cargoWidth - seatWidth * 2 - gap) / 2;
    const y = Math.max(8, cargoY - seatHeight - 8);
    return `
      <g class="seat-outline seat-outline--front" aria-label="${label}">
        <rect x="${startX}" y="${y}" width="${seatWidth}" height="${seatHeight}" rx="11" fill="${seatFill}" stroke="${seatStroke}" />
        <rect x="${startX + seatWidth + gap}" y="${y}" width="${seatWidth}" height="${seatHeight}" rx="11" fill="${seatFill}" stroke="${seatStroke}" />
        <text x="${cargoX + cargoWidth / 2}" y="${Math.max(14, y - 6)}" text-anchor="middle" class="seat-label">front</text>
      </g>
    `;
  }

  const cargoX = padding;
  const cargoY = padding;
  const cargoWidth = projection.width * scale;
  const cargoHeight = projection.height * scale;
  const seatDepth = Math.min(76, cargoWidth * 0.18);
  const seatWidth = Math.max(44, cargoHeight * 0.28);
  const gap = Math.max(12, cargoHeight * 0.08);
  const startY = cargoY + (cargoHeight - seatWidth * 2 - gap) / 2;
  const x = cargoX + cargoWidth + 14;
  return `
    <g class="seat-outline seat-outline--top" aria-label="${label}">
      <rect x="${x}" y="${startY}" width="${seatDepth}" height="${seatWidth}" rx="12" fill="${seatFill}" stroke="${seatStroke}" />
      <rect x="${x}" y="${startY + seatWidth + gap}" width="${seatDepth}" height="${seatWidth}" rx="12" fill="${seatFill}" stroke="${seatStroke}" />
      <line x1="${cargoX + cargoWidth}" y1="${cargoY}" x2="${cargoX + cargoWidth}" y2="${cargoY + cargoHeight}" class="seat-back-line" />
      <text x="${x + seatDepth / 2}" y="${Math.max(18, startY - 8)}" text-anchor="middle" class="seat-label">front</text>
    </g>
  `;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function shadeColor(hex, percent) {
  const number = Number.parseInt(hex.replace('#', ''), 16);
  const amount = Math.round(2.55 * percent);
  const red = clamp((number >> 16) + amount, 0, 255);
  const green = clamp(((number >> 8) & 0x00ff) + amount, 0, 255);
  const blue = clamp((number & 0x0000ff) + amount, 0, 255);
  return `#${((1 << 24) + (red << 16) + (green << 8) + blue).toString(16).slice(1)}`;
}

function renderZoneSvg(zone, placements, index) {
  const projection = projectZone(zone, state.activeView);
  const padding = state.activeView === 'front' ? 82 : 28;
  const seatGutter = state.activeView === 'front' ? 0 : 112;
  const maxSvgWidth = 720;
  const contentWidth = maxSvgWidth - padding * 2 - seatGutter;
  const scale = Math.min(contentWidth / projection.width, 320 / projection.height);
  const svgWidth = Math.max(360, projection.width * scale + padding * 2 + seatGutter);
  const svgHeight = Math.max(220, projection.height * scale + padding * 2 + 34);
  const seatOutline = seatOutlineFor2dView(projection, state.activeView, padding, scale);
  const encroachmentOverlay = seatEncroachmentOverlay(zone, projection, state.activeView, padding, scale);

  const rects = placements.map((placement) => {
    const box = projectBox(placement, state.activeView);
    const x = padding + box.x * scale;
    const y = padding + (projection.height - box.y - box.height) * scale;
    const width = Math.max(4, box.width * scale);
    const height = Math.max(4, box.height * scale);
    return `
      <g>
        <rect class="luggage-rect" x="${x}" y="${y}" width="${width}" height="${height}" rx="7" fill="${colorForPlacement(placement)}" />
        <title>${placement.label}: ${dimensionsLabel(placement.orientationMm)}</title>
      </g>
    `;
  }).join('');

  return `
    <article class="zone-card">
      <div class="zone-card__header">
        <strong>${zone.label}</strong>
        <span>${dimensionsLabel(zone.dimensionsMm)} · ${zone.volumeLitres} L</span>
      </div>
      <svg viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-label="${zone.label} ${state.activeView} view">
        ${seatOutline}
        <rect class="cargo-outline" x="${padding}" y="${padding}" width="${projection.width * scale}" height="${projection.height * scale}" rx="12" fill="#eff6ff" />
        ${encroachmentOverlay}
        ${rects}
        <text x="${padding}" y="${svgHeight - 12}" class="axis-label">${projection.xLabel}: ${projection.width} mm</text>
        <text x="${svgWidth - padding}" y="${svgHeight - 12}" text-anchor="end" class="axis-label">${projection.yLabel}: ${projection.height} mm</text>
      </svg>
      ${placements.length === 0 ? '<p class="empty-zone">No bags placed in this zone.</p>' : ''}
    </article>
  `;
}


function createBoxVertices(position, size) {
  const { x, y, z } = position;
  const { length, width, height } = size;
  return [
    { x, y, z },
    { x: x + length, y, z },
    { x: x + length, y: y + width, z },
    { x, y: y + width, z },
    { x, y, z: z + height },
    { x: x + length, y, z: z + height },
    { x: x + length, y: y + width, z: z + height },
    { x, y: y + width, z: z + height }
  ];
}

function createSeatGuideVertices(zone) {
  const dimensions = zone.dimensionsMm;
  const seatDepth = Math.max(90, dimensions.length * 0.12);
  const seatHeight = Math.min(Math.max(360, dimensions.height * 0.82), dimensions.height + 140);
  const seatWidth = dimensions.width * 0.28;
  const gap = dimensions.width * 0.08;
  const startY = (dimensions.width - seatWidth * 2 - gap) / 2;

  return [0, 1].flatMap((index) => createBoxVertices(
    { x: dimensions.length + seatDepth * 0.15, y: startY + index * (seatWidth + gap), z: 0 },
    { length: seatDepth, width: seatWidth, height: seatHeight }
  ));
}

function createSeatEncroachmentWedgeVertices(zone) {
  if (!hasActiveSeatBackEncroachment([zone]) || !zone.dimensionsMm) return [];
  const dimensions = zone.dimensionsMm;
  const topEncroachment = clamp(seatBackEncroachmentMmAtHeight(zone, dimensions.height), 0, dimensions.length);
  const topX = dimensions.length - topEncroachment;
  return [
    { x: dimensions.length, y: 0, z: 0 },
    { x: dimensions.length, y: 0, z: dimensions.height },
    { x: topX, y: 0, z: dimensions.height },
    { x: dimensions.length, y: dimensions.width, z: 0 },
    { x: dimensions.length, y: dimensions.width, z: dimensions.height },
    { x: topX, y: dimensions.width, z: dimensions.height }
  ];
}

function current3dAngles() {
  return {
    yaw: state.rotation3d.yaw * Math.PI / 180,
    pitch: state.rotation3d.pitch * Math.PI / 180
  };
}

function rotatePoint3d(point, center, angles = current3dAngles()) {
  const cosYaw = Math.cos(angles.yaw);
  const sinYaw = Math.sin(angles.yaw);
  const cosPitch = Math.cos(angles.pitch);
  const sinPitch = Math.sin(angles.pitch);
  const centeredX = point.x - center.x;
  const centeredY = point.y - center.y;
  const centeredZ = point.z - center.z;
  const rotatedX = centeredX * cosYaw - centeredY * sinYaw;
  const rotatedY = centeredX * sinYaw + centeredY * cosYaw;

  return {
    x: rotatedX,
    y: rotatedY * cosPitch - centeredZ * sinPitch,
    depth: rotatedY * sinPitch + centeredZ * cosPitch
  };
}

function createProjector(zone, placements, canvasWidth, canvasHeight, padding, extraPoints = []) {
  const dimensions = zone.dimensionsMm;
  const center = { x: dimensions.length / 2, y: dimensions.width / 2, z: dimensions.height / 2 };
  const allPoints = [
    ...createBoxVertices({ x: 0, y: 0, z: 0 }, dimensions),
    ...placements.flatMap((placement) => createBoxVertices(placement.positionMm, placement.orientationMm)),
    ...extraPoints
  ];
  const raw = (point) => rotatePoint3d(point, center);
  const maxRadius = Math.max(...allPoints.map((point) => {
    const centeredX = point.x - center.x;
    const centeredY = point.y - center.y;
    const centeredZ = point.z - center.z;
    return Math.hypot(centeredX, centeredY, centeredZ);
  }), 1);
  const scale = Math.min((canvasWidth - padding * 2) / (maxRadius * 2), (canvasHeight - padding * 2) / (maxRadius * 2));
  return (point) => {
    const output = raw(point);
    return {
      x: canvasWidth / 2 + output.x * scale,
      y: canvasHeight / 2 + output.y * scale,
      depth: output.depth
    };
  };
}

function polygonPoints(points) {
  return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
}

function renderFace(vertices, indices, fill, className, title = '') {
  const points = indices.map((faceIndex) => vertices[faceIndex]);
  const depth = points.reduce((total, point) => total + point.depth, 0) / points.length;
  return {
    depth,
    markup: `<polygon class="${className}" points="${polygonPoints(points)}" fill="${fill}">${title ? `<title>${title}</title>` : ''}</polygon>`
  };
}

const ORIENTATION_PRESETS = {
  x: { label: 'Boot View', yaw: 270, pitch: 90 },
  y: { label: 'Side View', yaw: 0, pitch: 90 },
  z: { label: 'Top View', yaw: -90, pitch: 0 }
};

function renderOrientationAxisControl() {
  const origin = { x: 710, y: 96 };
  const axisLength = 44;
  const center = { x: 0, y: 0, z: 0 };
  const axes = [
    { key: 'x', label: 'X', color: '#dc2626', vector: { x: axisLength, y: 0, z: 0 }, title: 'Boot view' },
    { key: 'y', label: 'Y', color: '#16a34a', vector: { x: 0, y: axisLength, z: 0 }, title: 'Side view' },
    { key: 'z', label: 'Z', color: '#2563eb', vector: { x: 0, y: 0, z: axisLength }, title: 'Top-down view' }
  ];

  const axisMarkup = axes.map((axis) => {
    const endpoint = rotatePoint3d(axis.vector, center);
    const x = origin.x + endpoint.x;
    const y = origin.y + endpoint.y;
    const labelX = origin.x + endpoint.x * 1.18;
    const labelY = origin.y + endpoint.y * 1.18;

    return `
      <g class="orientation-axis-button" role="button" tabindex="0" data-axis="${axis.key}" aria-label="Switch to ${axis.title}" style="--axis-color:${axis.color}">
        <line class="orientation-axis-line" x1="${origin.x}" y1="${origin.y}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" />
        <circle class="orientation-axis-end" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" />
        <text class="orientation-axis-label" x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" dominant-baseline="middle">${axis.label}</text>
        <title>${axis.label} axis · ${axis.title}</title>
      </g>
    `;
  }).join('');

  const orientationStatus = state.activeOrientationLabel
    ? `<text class="orientation-axis-preset-label" x="722" y="150" text-anchor="middle">${state.activeOrientationLabel}</text>`
    : `<text class="orientation-axis-angle-label" x="722" y="138" text-anchor="middle">
        <tspan x="722">yaw ${Math.round(state.rotation3d.yaw)}°</tspan>
        <tspan x="722" dy="16">pitch ${Math.round(state.rotation3d.pitch)}°</tspan>
      </text>`;

  return `
    <g class="orientation-axis-control" aria-label="3D orientation axis control">
      <rect class="orientation-axis-panel" x="648" y="18" width="148" height="158" rx="16" />
      <text class="orientation-axis-heading" x="722" y="40" text-anchor="middle">orientation</text>
      ${axisMarkup}
      ${orientationStatus}
    </g>
  `;
}

function set3dOrientation(axis) {
  const preset = ORIENTATION_PRESETS[axis];
  if (!preset) return;
  state.rotation3d = { yaw: preset.yaw, pitch: preset.pitch };
  state.activeOrientationLabel = preset.label;
  renderResults();
}

function renderSeatEncroachmentWedge3d(zone, project) {
  const rawVertices = createSeatEncroachmentWedgeVertices(zone);
  if (rawVertices.length === 0) return [];
  const vertices = rawVertices.map(project);
  const title = `Seat-back encroachment wedge: ${seatBackAngleDegrees(zone)}°`;
  return [
    renderFace(vertices, [0, 1, 2], '#fecaca', 'seat-encroachment-face', title),
    renderFace(vertices, [3, 5, 4], '#fecaca', 'seat-encroachment-face', title),
    renderFace(vertices, [1, 4, 5, 2], '#fee2e2', 'seat-encroachment-face', title),
    renderFace(vertices, [0, 3, 4, 1], '#fecaca', 'seat-encroachment-face', title),
    renderFace(vertices, [0, 2, 5, 3], '#fee2e2', 'seat-encroachment-face', title)
  ];
}

function renderSeatGuide3d(zone, project) {
  const dimensions = zone.dimensionsMm;
  const seatDepth = Math.max(90, dimensions.length * 0.12);
  const seatHeight = Math.min(Math.max(360, dimensions.height * 0.82), dimensions.height + 140);
  const seatWidth = dimensions.width * 0.28;
  const gap = dimensions.width * 0.08;
  const startY = (dimensions.width - seatWidth * 2 - gap) / 2;

  return [0, 1].flatMap((index) => {
    const vertices = createBoxVertices(
      { x: dimensions.length + seatDepth * 0.15, y: startY + index * (seatWidth + gap), z: 0 },
      { length: seatDepth, width: seatWidth, height: seatHeight }
    ).map(project);

    return [
      renderFace(vertices, [0, 1, 2, 3], '#fde68a', 'seat-face', 'Forward seat outline'),
      renderFace(vertices, [3, 0, 4, 7], '#fef3c7', 'seat-face', 'Forward seat outline'),
      renderFace(vertices, [4, 5, 6, 7], '#fef3c7', 'seat-face', 'Forward seat outline')
    ];
  });
}

function renderZone3dSvg(zone, placements) {
  const svgWidth = 820;
  const svgHeight = 440;
  const padding = 34;
  const seatGuidePoints = createSeatGuideVertices(zone);
  const seatEncroachmentWedgePoints = createSeatEncroachmentWedgeVertices(zone);
  const project = createProjector(zone, placements, svgWidth, svgHeight, padding, [...seatGuidePoints, ...seatEncroachmentWedgePoints]);
  const zoneVertices = createBoxVertices({ x: 0, y: 0, z: 0 }, zone.dimensionsMm).map(project);
  const faces = [
    ...renderSeatGuide3d(zone, project),
    ...renderSeatEncroachmentWedge3d(zone, project),
    renderFace(zoneVertices, [0, 1, 2, 3], '#dbeafe', 'zone-face zone-face--floor'),
    ...placements.flatMap((placement) => {
      const color = colorForPlacement(placement);
      const vertices = createBoxVertices(placement.positionMm, placement.orientationMm).map(project);
      const title = `${placement.label}: ${dimensionsLabel(placement.orientationMm)}`;
      return [
        renderFace(vertices, [0, 1, 2, 3], shadeColor(color, -18), 'bag-face', title),
        renderFace(vertices, [0, 1, 5, 4], shadeColor(color, -8), 'bag-face', title),
        renderFace(vertices, [1, 2, 6, 5], shadeColor(color, -14), 'bag-face', title),
        renderFace(vertices, [2, 3, 7, 6], shadeColor(color, 2), 'bag-face', title),
        renderFace(vertices, [3, 0, 4, 7], shadeColor(color, -22), 'bag-face', title),
        renderFace(vertices, [4, 5, 6, 7], shadeColor(color, 12), 'bag-face', title)
      ];
    })
  ].sort((a, b) => a.depth - b.depth).map((face) => face.markup).join('');

  return `
    <article class="zone-card zone-card--3d">
      <div class="zone-card__header">
        <div>
          <strong>${zone.label}</strong>
          <span>${dimensionsLabel(zone.dimensionsMm)} · ${zone.volumeLitres} L</span>
        </div>
        <span>Drag to pivot around cargo centre · click X/Y/Z for axis presets</span>
      </div>
      <svg class="zone-3d-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-label="${zone.label} rotatable 3D luggage view">
        <rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" rx="18" fill="#f8fafc" />
        ${faces}
        <polyline class="zone-wire" points="${polygonPoints([zoneVertices[0], zoneVertices[1], zoneVertices[2], zoneVertices[3], zoneVertices[0]])}" />
        <line class="zone-wire" x1="${zoneVertices[0].x}" y1="${zoneVertices[0].y}" x2="${zoneVertices[4].x}" y2="${zoneVertices[4].y}" />
        <line class="zone-wire" x1="${zoneVertices[1].x}" y1="${zoneVertices[1].y}" x2="${zoneVertices[5].x}" y2="${zoneVertices[5].y}" />
        <line class="zone-wire" x1="${zoneVertices[2].x}" y1="${zoneVertices[2].y}" x2="${zoneVertices[6].x}" y2="${zoneVertices[6].y}" />
        <line class="zone-wire" x1="${zoneVertices[3].x}" y1="${zoneVertices[3].y}" x2="${zoneVertices[7].x}" y2="${zoneVertices[7].y}" />
        <polyline class="zone-wire" points="${polygonPoints([zoneVertices[4], zoneVertices[5], zoneVertices[6], zoneVertices[7], zoneVertices[4]])}" />
        ${renderOrientationAxisControl()}
      </svg>
      ${placements.length === 0 ? '<p class="empty-zone">No bags placed in this zone.</p>' : ''}
    </article>
  `;
}

function renderVisualization(vehicle, config, result) {
  const zones = config.cargoZoneIds.map((id) => vehicle.cargoZones.find((zone) => zone.id === id)).filter(Boolean);
  visualization.innerHTML = zones.map((zone, index) => {
    const placements = result.placements.filter((placement) => placement.zoneId === zone.id);
    return state.activeView === '3d' ? renderZone3dSvg(zone, placements) : renderZoneSvg(zone, placements, index);
  }).join('');
  bind3dRotation();
}

function bind3dRotation() {
  if (state.activeView !== '3d') return;
  visualization.querySelectorAll('.zone-3d-svg').forEach((svg) => {
    svg.querySelectorAll('.orientation-axis-button').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        set3dOrientation(button.dataset.axis);
      });
      button.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        set3dOrientation(button.dataset.axis);
      });
    });

    svg.addEventListener('pointerdown', (event) => {
      if (event.target.closest('.orientation-axis-control')) return;
      event.preventDefault();
      let previous = { x: event.clientX, y: event.clientY };
      svg.classList.add('is-dragging');

      const handleMove = (moveEvent) => {
        const dx = moveEvent.clientX - previous.x;
        const dy = moveEvent.clientY - previous.y;
        previous = { x: moveEvent.clientX, y: moveEvent.clientY };
        state.rotation3d.yaw += dx * 0.35;
        state.rotation3d.pitch = clamp(state.rotation3d.pitch - dy * 0.25, 0, 90);
        if (dx || dy) state.activeOrientationLabel = '';
        renderResults();
      };
      const endDrag = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', endDrag);
        window.removeEventListener('pointercancel', endDrag);
        visualization.querySelectorAll('.zone-3d-svg').forEach((currentSvg) => currentSvg.classList.remove('is-dragging'));
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', endDrag, { once: true });
      window.addEventListener('pointercancel', endDrag, { once: true });
    });
  });
}

function renderLists(result) {
  $('#placedList').innerHTML = result.placements.length ? result.placements.map((placement) => `
    <li><span style="--dot:${colorForPlacement(placement)}"></span><strong>${placement.label}</strong><small>${placement.zoneLabel} · ${dimensionsLabel(placement.orientationMm)}</small></li>
  `).join('') : '<li class="muted">Nothing placed yet. Add luggage quantities to begin.</li>';

  $('#unplacedList').innerHTML = result.unplacedItems.length ? result.unplacedItems.map((item) => `
    <li class="problem"><span></span><strong>${item.label}</strong><small>${dimensionsLabel(item.dimensionsMm)} · ${item.volumeLitres} L</small></li>
  `).join('') : '<li class="success">Every selected bag is placed in the active configuration.</li>';
}

function renderResults() {
  const vehicle = selectedVehicle();
  const config = selectedConfiguration(vehicle);
  const zones = config.cargoZoneIds.map((id) => vehicle.cargoZones.find((zone) => zone.id === id)).filter(Boolean);
  const luggageSet = cloneLuggageWithQuantities();
  const result = estimateFit(luggageSet, vehicle, config.id, {
    considerSeatBackEncroachment: hasActiveSeatBackEncroachment(zones),
    seatBackAngleDegrees: state.seatBackEncroachmentAngleDegrees
  });
  const percent = Math.round(result.fitScore * 100);
  const volumePercent = Math.round((result.usedVolumeLitres / Math.max(1, result.usableVolumeLitres)) * 100);

  $('#heroResult').textContent = result.fits ? 'Fits' : 'Does not fully fit';
  $('#heroDetail').textContent = `${result.placements.length} placed · ${result.unplacedItems.length} unplaced · ${volumePercent}% usable volume used`;
  $('#resultTitle').textContent = `${vehicle.make} ${vehicle.model} · ${config.label}`;
  $('#fitBadge').className = `fit-badge ${result.fits ? 'fit-badge--ok' : 'fit-badge--bad'}`;
  $('#fitBadge').textContent = result.fits ? 'All bags fit' : 'Some bags unplaced';
  $('#metrics').innerHTML = [
    metricCard('Fit score', `${percent}%`, `${result.placements.length}/${result.placements.length + result.unplacedItems.length} bags placed`),
    metricCard('Usable volume', `${result.usableVolumeLitres} L`, `${result.usedVolumeLitres} L used`),
    metricCard('Seats available', config.seatsAvailable, config.notes ?? 'Based on selected cargo setup')
  ].join('');
  renderVisualization(vehicle, config, result);
  renderLists(result);
  $('#warnings').innerHTML = result.warnings.map((warning) => `<p>${warning}</p>`).join('');
}

function bindEvents() {
  vehicleSelect.addEventListener('change', () => {
    state.vehicleId = vehicleSelect.value;
    renderConfigurationOptions();
    syncSeatBackEncroachmentDefault();
    renderVehicleMeta();
    renderResults();
  });
  configurationSelect.addEventListener('change', () => {
    state.configurationId = configurationSelect.value;
    syncSeatBackEncroachmentDefault();
    renderVehicleMeta();
    renderResults();
  });
  seatBackEncroachmentDegreesInput.addEventListener('input', () => {
    state.seatBackEncroachmentAngleDegrees = clamp(Number(seatBackEncroachmentDegreesInput.value) || 0, 0, 89);
    seatBackEncroachmentDegreesInput.value = state.seatBackEncroachmentAngleDegrees;
    renderResults();
  });
  resetLuggageButton.addEventListener('click', resetLuggageQuantities);
  document.querySelectorAll('.view-tab').forEach((button) => button.addEventListener('click', () => {
    state.activeView = button.dataset.view;
    document.querySelectorAll('.view-tab').forEach((tab) => tab.classList.toggle('active', tab === button));
    renderResults();
  }));
}

async function init() {
  try {
    const [luggageSet, vehicles] = await Promise.all([
      readJson('../configs/luggage/common.json'),
      loadVehicles()
    ]);
    state.luggageSet = luggageSet;
    state.vehicles = vehicles.sort((a, b) => vehicleLabel(a).localeCompare(vehicleLabel(b)));
    const initialVehicle = defaultVehicle();
    state.vehicleId = initialVehicle.id;
    state.configurationId = initialVehicle.seatConfigurations[0].id;
    syncSeatBackEncroachmentDefault();
    renderVehicleOptions();
    renderConfigurationOptions();
    renderVehicleMeta();
    renderLuggageControls();
    bindEvents();
    renderResults();
  } catch (error) {
    $('#heroResult').textContent = 'Unable to load app';
    $('#heroDetail').textContent = error.message;
    console.error(error);
  }
}

init();
