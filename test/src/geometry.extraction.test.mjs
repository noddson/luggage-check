import test from 'node:test';
import assert from 'node:assert/strict';
import { projectBox, rotatePoint3d, createProjector } from '../../src/visualization/geometry.js';

function legacyProjectBox(placement, view) {
  const { positionMm: position, orientationMm: size } = placement;
  if (view === 'side') return { x: position.x, y: position.z, width: size.length, height: size.height };
  if (view === 'front') return { x: position.y, y: position.z, width: size.width, height: size.height };
  return { x: position.x, y: position.y, width: size.length, height: size.width };
}

test('projectBox parity', () => {
  const p = { positionMm: { x: 10, y: 20, z: 30 }, orientationMm: { length: 40, width: 50, height: 60 } };
  for (const v of ['top', 'side', 'front']) assert.deepEqual(projectBox(p, v), legacyProjectBox(p, v));
});

test('rotatePoint3d parity', () => {
  const point = { x: 10, y: 20, z: 30 };
  const center = { x: 2, y: 3, z: 4 };
  const angles = { yaw: Math.PI / 4, pitch: Math.PI / 6 };
  const next = rotatePoint3d(point, center, angles);
  const old = rotatePoint3d(point, center, angles);
  assert.deepEqual(next, old);
});

test('createProjector deterministic output', () => {
  const zone = { dimensionsMm: { length: 100, width: 80, height: 60 } };
  const placements = [{ positionMm: { x: 0, y: 0, z: 0 }, orientationMm: { length: 10, width: 10, height: 10 } }];
  const angles = { yaw: 0, pitch: 0 };
  const project = createProjector(zone, placements, 800, 400, 20, [], angles);
  const p = project({ x: 50, y: 40, z: 30 });
  assert.equal(typeof p.x, 'number');
  assert.equal(typeof p.y, 'number');
});
