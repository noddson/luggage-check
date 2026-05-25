import test from 'node:test';
import assert from 'node:assert/strict';
import { projectBox, rotatePoint3d, createProjector } from '../src/visualization/geometry.js';

test('projectBox preserves projections', () => {
  const placement = { positionMm: { x: 10, y: 20, z: 30 }, orientationMm: { length: 100, width: 50, height: 40 } };
  assert.deepEqual(projectBox(placement, 'top'), { x: 10, y: 20, width: 100, height: 50 });
  assert.deepEqual(projectBox(placement, 'side'), { x: 10, y: 30, width: 100, height: 40 });
  assert.deepEqual(projectBox(placement, 'front'), { x: 20, y: 30, width: 50, height: 40 });
});

test('rotatePoint3d deterministic sample', () => {
  const out = rotatePoint3d({ x: 2, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { yaw: Math.PI / 2, pitch: 0 });
  assert(Math.abs(out.x) < 1e-9);
  assert(Math.abs(out.y - 2) < 1e-9);
});

test('createProjector is stable', () => {
  const zone = { dimensionsMm: { length: 100, width: 100, height: 100 } };
  const projector = createProjector(zone, [], 400, 200, 10, [], { yaw: 0, pitch: 0 });
  const p = projector({ x: 50, y: 50, z: 50 });
  assert.equal(Math.round(p.x), 200);
  assert.equal(Math.round(p.y), 100);
});
