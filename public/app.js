import { estimateFit } from '../src/packing/fitEstimator.js';

const VEHICLE_FILES = [
  'opel-corsa.json',
  'peugeot-3008.json',
  'renault-clio.json',
  'skoda-octavia-combi.json',
  'volkswagen-golf.json',
  'volkswagen-t-roc.json'
];

const BAG_COLORS = ['#2563eb', '#16a34a', '#f97316', '#9333ea', '#0891b2', '#e11d48', '#ca8a04', '#4f46e5'];
const state = { luggageSet: null, vehicles: [], vehicleId: '', configurationId: '', activeView: 'top' };

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

function renderZoneSvg(zone, placements, index) {
  const projection = projectZone(zone, state.activeView);
  const padding = 28;
  const maxSvgWidth = 720;
  const contentWidth = maxSvgWidth - padding * 2;
  const scale = Math.min(contentWidth / projection.width, 320 / projection.height);
  const svgWidth = Math.max(360, projection.width * scale + padding * 2);
  const svgHeight = Math.max(220, projection.height * scale + padding * 2 + 34);

  const rects = placements.map((placement) => {
    const box = projectBox(placement, state.activeView);
    const x = padding + box.x * scale;
    const y = padding + (projection.height - box.y - box.height) * scale;
    const width = Math.max(4, box.width * scale);
    const height = Math.max(4, box.height * scale);
    return `
      <g>
        <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="7" fill="${colorForPlacement(placement)}" opacity="0.86" />
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
        <rect x="${padding}" y="${padding}" width="${projection.width * scale}" height="${projection.height * scale}" rx="12" fill="#eff6ff" stroke="#1d4ed8" stroke-width="2" stroke-dasharray="7 6" />
        ${rects}
        <text x="${padding}" y="${svgHeight - 12}" class="axis-label">${projection.xLabel}: ${projection.width} mm</text>
        <text x="${svgWidth - padding}" y="${svgHeight - 12}" text-anchor="end" class="axis-label">${projection.yLabel}: ${projection.height} mm</text>
      </svg>
      ${placements.length === 0 ? '<p class="empty-zone">No bags placed in this zone.</p>' : ''}
    </article>
  `;
}

function renderVisualization(vehicle, config, result) {
  const zones = config.cargoZoneIds.map((id) => vehicle.cargoZones.find((zone) => zone.id === id)).filter(Boolean);
  visualization.innerHTML = zones.map((zone, index) =>
    renderZoneSvg(zone, result.placements.filter((placement) => placement.zoneId === zone.id), index)
  ).join('');
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
      Promise.all(VEHICLE_FILES.map((file) => readJson(`../configs/vehicles/europe/${file}`)))
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
