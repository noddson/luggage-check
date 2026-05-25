import test from 'node:test';
import assert from 'node:assert/strict';

import { estimateFit as estimateFitBrowserTarget } from '../fitEstimator.js';
import { estimateFit as estimateFitNodeTarget } from '../fitEstimator.node.js';
import vehicle from '../configs/vehicles/north-america/toyota-rav4-hybrid-2019-2025.json' with { type: 'json' };

const fixture = {
  luggageSet: {
    items: [
      {
        id: 'carry-on-1',
        label: 'Carry-on',
        quantity: 2,
        shapeType: 'box',
        dimensionsMm: { length: 550, width: 360, height: 230 },
        rotationAllowed: true,
        compressibility: 0
      },
      {
        id: 'duffel-1',
        label: 'Duffel',
        quantity: 1,
        shapeType: 'duffel',
        dimensionsMm: { length: 650, width: 300, height: 280 },
        rotationAllowed: true,
        compressibility: 0.3
      }
    ]
  },
  seatConfigurationId: 'seats_up',
  options: {
    considerSeatBackEncroachment: true,
    seatBackAngleDegrees: 60,
    defaultUsableFraction: 0.8,
    supportPolicy: {
      minimumSupportedFootprintRatio: 1.2
    }
  }
};

test('fit estimator browser and node entrypoints produce identical results for the same fixture', () => {
  const browserResult = estimateFitBrowserTarget(fixture.luggageSet, vehicle, fixture.seatConfigurationId, fixture.options);
  const nodeResult = estimateFitNodeTarget(fixture.luggageSet, vehicle, fixture.seatConfigurationId, fixture.options);

  assert.deepStrictEqual(nodeResult, browserResult);
});
