import { clampNumber } from '../state/validators.js';

export function dimensionsLabel(dimensions) {
  return `${Math.round(dimensions.length)} × ${Math.round(dimensions.width)} × ${Math.round(dimensions.height)} mm`;
}

export function clamp(value, min, max) {
  return clampNumber(value, min, max);
}

export function shadeColor(hex, percent) {
  const number = Number.parseInt(hex.replace('#', ''), 16);
  const amount = Math.round(2.55 * percent);
  const red = clamp((number >> 16) + amount, 0, 255);
  const green = clamp(((number >> 8) & 0x00ff) + amount, 0, 255);
  const blue = clamp((number & 0x0000ff) + amount, 0, 255);
  return `#${((1 << 24) + (red << 16) + (green << 8) + blue).toString(16).slice(1)}`;
}

export function mixWithWhite(hex, ratio = 0.9) {
  const number = Number.parseInt(hex.replace('#', ''), 16);
  const red = (number >> 16) & 0xff;
  const green = (number >> 8) & 0xff;
  const blue = number & 0xff;
  const blend = (channel) => clamp(Math.round(channel * (1 - ratio) + 255 * ratio), 0, 255);
  return `#${((1 << 24) + (blend(red) << 16) + (blend(green) << 8) + blend(blue)).toString(16).slice(1)}`;
}

export function projectBox(placement, view) {
  const { positionMm: position, orientationMm: size } = placement;
  if (view === 'side') return { x: position.x, y: position.z, width: size.length, height: size.height };
  if (view === 'front') return { x: position.y, y: position.z, width: size.width, height: size.height };
  return { x: position.x, y: position.y, width: size.length, height: size.width };
}

export function projectZone(zone, view, t) {
  const dimensions = zone.dimensionsMm;
  if (view === 'side') return { width: dimensions.length, height: dimensions.height, xLabel: t('length'), yLabel: t('height') };
  if (view === 'front') return { width: dimensions.width, height: dimensions.height, xLabel: t('width'), yLabel: t('height') };
  return { width: dimensions.length, height: dimensions.width, xLabel: t('length'), yLabel: t('width') };
}

export function createBoxVertices(position, size) {
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

export function createSeatGuideVertices(zone) {
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

export function normalizeYaw(yaw) {
  return ((yaw % 360) + 360) % 360;
}

export function displayYawDegrees(yaw) {
  return Math.round(normalizeYaw(yaw)) % 360;
}

export function rotatePoint3d(point, center, angles) {
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

export function createProjector(zone, placements, canvasWidth, canvasHeight, padding, angles, extraPoints = []) {
  const dimensions = zone.dimensionsMm;
  const center = { x: dimensions.length / 2, y: dimensions.width / 2, z: dimensions.height / 2 };
  const allPoints = [
    ...createBoxVertices({ x: 0, y: 0, z: 0 }, dimensions),
    ...placements.flatMap((placement) => createBoxVertices(placement.positionMm, placement.orientationMm)),
    ...extraPoints
  ];
  const raw = (point) => rotatePoint3d(point, center, angles);
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

export function polygonPoints(points) {
  return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
}

export function renderFace(vertices, indices, fill, className, title = '') {
  const points = indices.map((faceIndex) => vertices[faceIndex]);
  const depth = points.reduce((total, point) => total + point.depth, 0) / points.length;
  return {
    depth,
    markup: `<polygon class="${className}" points="${polygonPoints(points)}" fill="${fill}">${title ? `<title>${title}</title>` : ''}</polygon>`
  };
}
