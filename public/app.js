import { estimateFit } from '../src/packing/fitEstimator.js';

const VEHICLE_FILES = [
  'europe/opel-corsa.json',
  'europe/peugeot-3008.json',
  'europe/renault-clio.json',
  'europe/skoda-octavia-combi.json',
  'europe/volkswagen-caddy-maxi-life.json',
  'europe/volkswagen-golf.json',
  'europe/volkswagen-t-roc.json',
  'north-america/gmc-sierra-1500-denali-4wd-crew-cab.json',
  'north-america/kia-soul-ev-2020.json'
];

const BAG_COLORS = ['#2563eb', '#16a34a', '#f97316', '#9333ea', '#0891b2', '#e11d48', '#ca8a04', '#4f46e5'];
const state = {
  luggageSet: null,
  vehicles: [],
  vehicleId: '',
  configurationId: '',
  activeView: 'top',
  rotation3d: { yaw: -38, pitch: 58 }
};

const $ = (selector) => document.querySelector(selector);
const vehicleSelect = $('#vehicleSelect');
const configurationSelect = $('#configurationSelect');
const luggageControls = $('#luggageControls');
const visualization = $('#visualization');

async function readJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Unable to load ${path}`);
  return response.json();
}

function dimensionsLabel(dimensions) {
  return `${Math.round(dimensions.length)} × ${Math.round(dimensions.width)} × ${Math.round(dimensions.height)} mm`;
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

function selectedVehicle() {
  return state.vehicles.find((vehicle) => vehicle.id === state.vehicleId) ?? state.vehicles[0];
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
  $('#vehicleMeta').innerHTML = `
    <strong>${vehicle.generation}</strong>
    <span>${vehicle.rentalClasses.join(' · ')}</span>
    <span>${zones.length} cargo zone${zones.length === 1 ? '' : 's'} active · ${config.seatsAvailable} seats available</span>
    ${config.notes ? `<em>${config.notes}</em>` : ''}
  `;
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

function createProjector(zone, placements, canvasWidth, canvasHeight, padding, extraPoints = []) {
  const dimensions = zone.dimensionsMm;
  const yaw = state.rotation3d.yaw * Math.PI / 180;
  const pitch = state.rotation3d.pitch * Math.PI / 180;
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const center = { x: dimensions.length / 2, y: dimensions.width / 2, z: dimensions.height / 2 };
  const allPoints = [
    ...createBoxVertices({ x: 0, y: 0, z: 0 }, dimensions),
    ...placements.flatMap((placement) => createBoxVertices(placement.positionMm, placement.orientationMm)),
    ...extraPoints
  ];
  const raw = (point) => {
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
  };
  const projected = allPoints.map(raw);
  const maxAbsX = Math.max(...projected.map((point) => Math.abs(point.x)), 1);
  const maxAbsY = Math.max(...projected.map((point) => Math.abs(point.y)), 1);
  const scale = Math.min((canvasWidth - padding * 2) / (maxAbsX * 2), (canvasHeight - padding * 2) / (maxAbsY * 2));
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
  const project = createProjector(zone, placements, svgWidth, svgHeight, padding, seatGuidePoints);
  const zoneVertices = createBoxVertices({ x: 0, y: 0, z: 0 }, zone.dimensionsMm).map(project);
  const faces = [
    ...renderSeatGuide3d(zone, project),
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
        <span>Drag to rotate around cargo centre · seats mark forward · yaw ${Math.round(state.rotation3d.yaw)}° · pitch ${Math.round(state.rotation3d.pitch)}°</span>
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
    svg.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      let previous = { x: event.clientX, y: event.clientY };
      svg.classList.add('is-dragging');

      const handleMove = (moveEvent) => {
        const dx = moveEvent.clientX - previous.x;
        const dy = moveEvent.clientY - previous.y;
        previous = { x: moveEvent.clientX, y: moveEvent.clientY };
        state.rotation3d.yaw += dx * 0.35;
        state.rotation3d.pitch = clamp(state.rotation3d.pitch - dy * 0.25, 18, 78);
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
  const luggageSet = cloneLuggageWithQuantities();
  const result = estimateFit(luggageSet, vehicle, config.id);
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
    renderVehicleMeta();
    renderResults();
  });
  configurationSelect.addEventListener('change', () => {
    state.configurationId = configurationSelect.value;
    renderVehicleMeta();
    renderResults();
  });
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
      Promise.all(VEHICLE_FILES.map((file) => readJson(`../configs/vehicles/${file}`)))
    ]);
    state.luggageSet = luggageSet;
    state.vehicles = vehicles.sort((a, b) => vehicleLabel(a).localeCompare(vehicleLabel(b)));
    state.vehicleId = state.vehicles[0].id;
    state.configurationId = state.vehicles[0].seatConfigurations[0].id;
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
