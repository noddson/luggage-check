const MM3_PER_LITRE = 1_000_000;
const MIN_SPACE_MM = 1;
const DEFAULT_SEAT_BACK_ANGLE_DEGREES = 20;
const DEFAULT_SUPPORT_POLICY = {
  mergeAdjacentCoplanarSpaces: true
};

function permutations(dimensions) {
  const { length, width, height } = dimensions;
  return [
    { length, width, height },
    { length, width: height, height: width },
    { length: width, width: length, height },
    { length: width, width: height, height: length },
    { length: height, width: length, height: width },
    { length: height, width, height: length }
  ].filter((value, index, list) => list.findIndex((candidate) =>
    candidate.length === value.length && candidate.width === value.width && candidate.height === value.height
  ) === index);
}

function volumeLitres(dimensions) {
  return (dimensions.length * dimensions.width * dimensions.height) / MM3_PER_LITRE;
}

function volumeMm3(dimensions) {
  return dimensions.length * dimensions.width * dimensions.height;
}

function effectiveDimensions(item) {
  const compression = item.shapeType === 'box' ? 0 : Math.min(item.compressibility ?? 0, 0.35);
  const scale = 1 - compression * 0.2;
  return {
    length: Math.round(item.dimensionsMm.length * scale),
    width: Math.round(item.dimensionsMm.width * scale),
    height: Math.round(item.dimensionsMm.height * scale)
  };
}

function expandItems(items) {
  return items.flatMap((item) => Array.from({ length: item.quantity }, (_, index) => ({
    id: `${item.id}#${index + 1}`,
    label: item.quantity > 1 ? `${item.label} ${index + 1}` : item.label,
    sourceId: item.id,
    shapeType: item.shapeType,
    dimensionsMm: effectiveDimensions(item),
    rotationAllowed: item.rotationAllowed,
    compressibility: item.compressibility ?? 0
  })));
}

function itemFitsOpening(item, orientation, zone) {
  if (!zone.openingMm) return true;
  const faces = [
    [orientation.width, orientation.height],
    [orientation.length, orientation.height],
    [orientation.length, orientation.width]
  ];
  return faces.some(([width, height]) =>
    Math.min(width, height) <= Math.min(zone.openingMm.width, zone.openingMm.height)
    && Math.max(width, height) <= Math.max(zone.openingMm.width, zone.openingMm.height)
  );
}

function orientationsForZone(item, zone) {
  if (!zone.dimensionsMm) return [];
  const candidates = item.rotationAllowed === false ? [item.dimensionsMm] : permutations(item.dimensionsMm);
  return candidates.filter((candidate) =>
    candidate.length <= zone.dimensionsMm.length
    && candidate.width <= zone.dimensionsMm.width
    && candidate.height <= zone.dimensionsMm.height
    && itemFitsOpening(item, candidate, zone)
  );
}

function initialZoneState(zone) {
  return {
    zone,
    remainingLitres: zone.volumeLitres * (zone.usableFraction ?? 0.75),
    spaces: [{
      x: 0,
      y: 0,
      z: 0,
      length: zone.dimensionsMm?.length ?? 0,
      width: zone.dimensionsMm?.width ?? 0,
      height: zone.dimensionsMm?.height ?? 0
    }],
    placements: []
  };
}

function spaceVolume(space) {
  return space.length * space.width * space.height;
}

function fitsInSpace(orientation, space) {
  return orientation.length <= space.length
    && orientation.width <= space.width
    && orientation.height <= space.height;
}

function seatBackAngleDegrees(zone, options = {}) {
  return options.seatBackAngleDegrees ?? zone.seatBackEncroachment?.angleFromVerticalDegrees ?? DEFAULT_SEAT_BACK_ANGLE_DEGREES;
}

function seatBackEncroachmentMmAtHeight(zone, heightMm, options = {}) {
  const angleDegrees = seatBackAngleDegrees(zone, options);
  const angleRadians = angleDegrees * (Math.PI / 180);
  return heightMm * Math.tan(angleRadians);
}

function fitsSeatBackEncroachment(position, orientation, zone, options) {
  if (!options.considerSeatBackEncroachment || !zone.seatBackEncroachment || !zone.dimensionsMm) return true;
  const topHeightMm = position.z + orientation.height;
  const maxLengthAtTop = zone.dimensionsMm.length - seatBackEncroachmentMmAtHeight(zone, topHeightMm, options);
  return position.x + orientation.length <= maxLengthAtTop;
}

function candidatePosition(space) {
  return { x: space.x, y: space.y, z: space.z };
}

function boxesOverlap(aPosition, aSize, bPosition, bSize) {
  return aPosition.x < bPosition.x + bSize.length
    && aPosition.x + aSize.length > bPosition.x
    && aPosition.y < bPosition.y + bSize.width
    && aPosition.y + aSize.width > bPosition.y
    && aPosition.z < bPosition.z + bSize.height
    && aPosition.z + aSize.height > bPosition.z;
}

function collidesWithPlacement(position, orientation, placements) {
  return placements.some((placement) => boxesOverlap(position, orientation, placement.positionMm, placement.orientationMm));
}

function isContainedBy(inner, outer) {
  return inner.x >= outer.x
    && inner.y >= outer.y
    && inner.z >= outer.z
    && inner.x + inner.length <= outer.x + outer.length
    && inner.y + inner.width <= outer.y + outer.width
    && inner.z + inner.height <= outer.z + outer.height;
}

function effectiveSupportPolicy(options = {}) {
  return {
    ...DEFAULT_SUPPORT_POLICY,
    ...(options.supportPolicy ?? {})
  };
}

function sameNumber(...values) {
  return values.every((value) => value === values[0]);
}

function mergePair(a, b) {
  if (!sameNumber(a.z, b.z) || !sameNumber(a.height, b.height)) return null;

  if (sameNumber(a.x, b.x) && sameNumber(a.length, b.length)) {
    const aEnd = a.y + a.width;
    const bEnd = b.y + b.width;
    if (aEnd === b.y || bEnd === a.y) {
      return {
        x: a.x,
        y: Math.min(a.y, b.y),
        z: a.z,
        length: a.length,
        width: a.width + b.width,
        height: a.height
      };
    }
  }

  if (sameNumber(a.y, b.y) && sameNumber(a.width, b.width)) {
    const aEnd = a.x + a.length;
    const bEnd = b.x + b.length;
    if (aEnd === b.x || bEnd === a.x) {
      return {
        x: Math.min(a.x, b.x),
        y: a.y,
        z: a.z,
        length: a.length + b.length,
        width: a.width,
        height: a.height
      };
    }
  }

  return null;
}

function mergeAdjacentCoplanarSpaces(spaces) {
  let merged = [...spaces];
  let changed = true;

  while (changed) {
    changed = false;
    outer:
    for (let i = 0; i < merged.length; i += 1) {
      for (let j = i + 1; j < merged.length; j += 1) {
        const candidate = mergePair(merged[i], merged[j]);
        if (candidate) {
          merged = [
            ...merged.slice(0, i),
            ...merged.slice(i + 1, j),
            ...merged.slice(j + 1),
            candidate
          ];
          changed = true;
          break outer;
        }
      }
    }
  }

  return merged;
}

function normalizeSpaces(spaces, options = {}) {
  const supportPolicy = effectiveSupportPolicy(options);
  const candidateSpaces = supportPolicy.mergeAdjacentCoplanarSpaces ? mergeAdjacentCoplanarSpaces(spaces) : spaces;
  return candidateSpaces
    .filter((space) => space.length >= MIN_SPACE_MM && space.width >= MIN_SPACE_MM && space.height >= MIN_SPACE_MM)
    .filter((space, index, list) => list.findIndex((candidate) =>
      candidate.x === space.x
      && candidate.y === space.y
      && candidate.z === space.z
      && candidate.length === space.length
      && candidate.width === space.width
      && candidate.height === space.height
    ) === index)
    .filter((space, index, list) => !list.some((candidate, candidateIndex) => candidateIndex !== index && isContainedBy(space, candidate)))
    .sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x || spaceVolume(a) - spaceVolume(b));
}

function splitSpace(space, position, orientation) {
  const xEnd = space.x + space.length;
  const yEnd = space.y + space.width;
  const zEnd = space.z + space.height;
  const placedXEnd = position.x + orientation.length;
  const placedYEnd = position.y + orientation.width;
  const placedZEnd = position.z + orientation.height;

  return [
    {
      x: placedXEnd,
      y: space.y,
      z: space.z,
      length: xEnd - placedXEnd,
      width: space.width,
      height: space.height
    },
    {
      x: space.x,
      y: placedYEnd,
      z: space.z,
      length: orientation.length,
      width: yEnd - placedYEnd,
      height: space.height
    },
    {
      x: space.x,
      y: space.y,
      z: placedZEnd,
      length: orientation.length,
      width: orientation.width,
      height: zEnd - placedZEnd
    }
  ];
}

function residualSpacesAfterPlacement(candidate, options = {}) {
  const remainingSpaces = candidate.zoneState.spaces.filter((_, index) => index !== candidate.spaceIndex);
  return normalizeSpaces([
    ...remainingSpaces,
    ...splitSpace(candidate.space, candidate.position, candidate.orientation)
  ], options);
}

function effectiveSpaceLengthAtHeight(space, orientation, zone, options) {
  if (!options.considerSeatBackEncroachment || !zone.seatBackEncroachment || !zone.dimensionsMm) return space.length;
  const topHeightMm = space.z + orientation.height;
  const maxLengthAtTop = zone.dimensionsMm.length - seatBackEncroachmentMmAtHeight(zone, topHeightMm, options);
  return Math.max(0, Math.min(space.length, maxLengthAtTop - space.x));
}

function capacityForItemInSpaces(item, spaces, zone, options) {
  let bestCapacity = 0;

  for (const orientation of orientationsForZone(item, zone)) {
    const orientationCapacity = spaces.reduce((total, space) => {
      if (orientation.width > space.width || orientation.height > space.height) return total;
      const effectiveLength = effectiveSpaceLengthAtHeight(space, orientation, zone, options);
      if (orientation.length > effectiveLength) return total;
      return total
        + Math.floor(effectiveLength / orientation.length)
        * Math.floor(space.width / orientation.width)
        * Math.floor(space.height / orientation.height);
    }, 0);
    bestCapacity = Math.max(bestCapacity, orientationCapacity);
  }

  return bestCapacity;
}

function lookaheadCapacity(candidate, remainingItems, options = {}) {
  if (remainingItems.length === 0) return 0;

  const residualSpaces = residualSpacesAfterPlacement(candidate, options);
  const sameSourceItems = remainingItems.filter((item) => item.sourceId === candidate.item.sourceId);
  const candidateItems = sameSourceItems.length > 0 ? sameSourceItems : remainingItems;
  const capacityBySource = new Map();

  for (const item of candidateItems) {
    if (!capacityBySource.has(item.sourceId)) {
      capacityBySource.set(item.sourceId, capacityForItemInSpaces(item, residualSpaces, candidate.zoneState.zone, options));
    }
  }

  return candidateItems.reduce((count, item) => {
    const availableCapacity = capacityBySource.get(item.sourceId) ?? 0;
    if (availableCapacity <= 0) return count;
    capacityBySource.set(item.sourceId, availableCapacity - 1);
    return count + 1;
  }, 0);
}

function scoreCandidate(candidate, remainingItems = [], options = {}) {
  const { space, orientation, position, zoneIndex } = candidate;
  const leftover = spaceVolume(space) - volumeMm3(orientation);
  const slack = (space.length - orientation.length) + (space.width - orientation.width) + (space.height - orientation.height);
  const surfaceArea = orientation.length * orientation.width;
  return [
    zoneIndex,
    position.z,
    -lookaheadCapacity(candidate, remainingItems, options),
    position.y,
    position.x,
    leftover,
    slack,
    -surfaceArea,
    orientation.height,
    Math.max(orientation.length, orientation.width, orientation.height)
  ];
}

function compareScores(a, b) {
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

function findBestCandidate(item, zoneStates, options, remainingItems = []) {
  const itemVolume = volumeLitres(item.dimensionsMm);
  let best;

  for (const [zoneIndex, zoneState] of zoneStates.entries()) {
    if (itemVolume > zoneState.remainingLitres) continue;
    for (const orientation of orientationsForZone(item, zoneState.zone)) {
      for (const [spaceIndex, space] of zoneState.spaces.entries()) {
        if (!fitsInSpace(orientation, space)) continue;
        const position = candidatePosition(space);
        if (!fitsSeatBackEncroachment(position, orientation, zoneState.zone, options)) continue;
        if (collidesWithPlacement(position, orientation, zoneState.placements)) continue;
        const candidate = { zoneIndex, zoneState, spaceIndex, space, orientation, position, item };
        const score = scoreCandidate(candidate, remainingItems, options);
        if (!best || compareScores(score, best.score) < 0) best = { ...candidate, score };
      }
    }
  }

  return best;
}

function placeItem(item, candidate, options = {}) {
  const itemVolume = volumeLitres(item.dimensionsMm);
  const placement = {
    itemId: item.id,
    sourceId: item.sourceId,
    label: item.label,
    zoneId: candidate.zoneState.zone.id,
    zoneLabel: candidate.zoneState.zone.label,
    positionMm: candidate.position,
    orientationMm: candidate.orientation,
    volumeLitres: Number(itemVolume.toFixed(1))
  };

  const remainingSpaces = candidate.zoneState.spaces.filter((_, index) => index !== candidate.spaceIndex);
  candidate.zoneState.spaces = normalizeSpaces([
    ...remainingSpaces,
    ...splitSpace(candidate.space, candidate.position, candidate.orientation)
  ], options);
  candidate.zoneState.remainingLitres -= itemVolume;
  candidate.zoneState.placements.push(placement);
}

function cloneItem(item) {
  return { ...item, dimensionsMm: { ...item.dimensionsMm } };
}

function compareItems(...comparators) {
  return (a, b) => {
    for (const comparator of comparators) {
      const result = comparator(a, b);
      if (result !== 0) return result;
    }
    return a.sourceId.localeCompare(b.sourceId) || a.id.localeCompare(b.id);
  };
}

const itemComparators = {
  volumeDesc: (a, b) => volumeMm3(b.dimensionsMm) - volumeMm3(a.dimensionsMm),
  longestDesc: (a, b) => Math.max(b.dimensionsMm.length, b.dimensionsMm.width, b.dimensionsMm.height) - Math.max(a.dimensionsMm.length, a.dimensionsMm.width, a.dimensionsMm.height),
  heightDesc: (a, b) => b.dimensionsMm.height - a.dimensionsMm.height,
  footprintDesc: (a, b) => (b.dimensionsMm.length * b.dimensionsMm.width) - (a.dimensionsMm.length * a.dimensionsMm.width),
  maxFaceDesc: (a, b) => {
    const aFaces = [a.dimensionsMm.length * a.dimensionsMm.width, a.dimensionsMm.length * a.dimensionsMm.height, a.dimensionsMm.width * a.dimensionsMm.height];
    const bFaces = [b.dimensionsMm.length * b.dimensionsMm.width, b.dimensionsMm.length * b.dimensionsMm.height, b.dimensionsMm.width * b.dimensionsMm.height];
    return Math.max(...bFaces) - Math.max(...aFaces);
  }
};

function itemOrders(items) {
  const orderings = [
    compareItems(itemComparators.volumeDesc, itemComparators.longestDesc, itemComparators.footprintDesc),
    compareItems(itemComparators.longestDesc, itemComparators.volumeDesc, itemComparators.footprintDesc),
    compareItems(itemComparators.footprintDesc, itemComparators.volumeDesc, itemComparators.heightDesc),
    compareItems(itemComparators.heightDesc, itemComparators.volumeDesc, itemComparators.longestDesc),
    compareItems(itemComparators.maxFaceDesc, itemComparators.volumeDesc, itemComparators.longestDesc),
    compareItems((a, b) => a.sourceId.localeCompare(b.sourceId), itemComparators.volumeDesc)
  ];

  return orderings.map((comparator) => items.map(cloneItem).sort(comparator));
}

function packingScore(result, zones) {
  const zoneCount = new Set(result.placements.map((placement) => placement.zoneId)).size;
  const usedVolume = result.placements.reduce((sum, placement) => sum + placement.volumeLitres, 0);
  const totalUsableVolume = zones.reduce((sum, zone) => sum + (zone.volumeLitres * (zone.usableFraction ?? 0.75)), 0);
  const heightUsed = result.placements.reduce((max, placement) => Math.max(max, placement.positionMm.z + placement.orientationMm.height), 0);
  return [
    -result.unplacedItems.length,
    result.placements.length,
    usedVolume / Math.max(1, totalUsableVolume),
    -zoneCount,
    -heightUsed
  ];
}

function comparePackingScores(a, b) {
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return b[index] - a[index];
  }
  return 0;
}

function packItems(order, zones, options = {}) {
  const zoneStates = zones.filter((zone) => zone.dimensionsMm).map(initialZoneState);
  const unplacedItems = [];

  for (const [itemIndex, item] of order.entries()) {
    const candidate = findBestCandidate(item, zoneStates, options, order.slice(itemIndex + 1));
    if (candidate) {
      placeItem(item, candidate, options);
    } else {
      unplacedItems.push({
        itemId: item.id,
        label: item.label,
        dimensionsMm: item.dimensionsMm,
        volumeLitres: Number(volumeLitres(item.dimensionsMm).toFixed(1))
      });
    }
  }

  return {
    placements: zoneStates.flatMap((zoneState) => zoneState.placements),
    unplacedItems
  };
}

/**
 * Multi-pass 3D fit estimator. Each estimate rebuilds the full packing plan from the currently selected
 * luggage set, tries every valid axis rotation for each bag, and compares several deterministic item orderings so
 * adding or removing bags triggers a fresh full-set stacking plan instead of appending to the prior layout.
 *
 * @param {{ items: import('../domain/types.js').LuggageItem[] }} luggageSet
 * @param {import('../domain/types.js').VehicleConfig} vehicle
 * @param {string} seatConfigurationId
 * @param {{considerSeatBackEncroachment?: boolean, seatBackAngleDegrees?: number, supportPolicy?: {mergeAdjacentCoplanarSpaces?: boolean}}=} options
 */
export function estimateFit(luggageSet, vehicle, seatConfigurationId = 'seats_up', options = {}) {
  const seatConfiguration = vehicle.seatConfigurations.find((candidate) => candidate.id === seatConfigurationId);
  if (!seatConfiguration) throw new Error(`Unknown seat configuration: ${seatConfigurationId}`);

  const zones = seatConfiguration.cargoZoneIds.map((id) => vehicle.cargoZones.find((zone) => zone.id === id)).filter(Boolean);
  const expandedItems = expandItems(luggageSet.items);
  const warnings = zones.flatMap((zone) => zone.confidence === 'low' ? [`${vehicle.id}/${zone.id}: cargo dimensions are estimated; result is a planning approximation.`] : []);
  const encroachmentZones = options.considerSeatBackEncroachment ? zones.filter((zone) => zone.seatBackEncroachment) : [];
  if (encroachmentZones.length > 0) {
    warnings.push(`${vehicle.id}: rear seat-back encroachment is enabled for ${encroachmentZones.map((zone) => `${zone.label} (${seatBackAngleDegrees(zone, options)}°)`).join(', ')}.`);
  }
  const unsupportedZones = zones.filter((zone) => !zone.dimensionsMm);
  if (unsupportedZones.length > 0) {
    warnings.push(`${vehicle.id}: ${unsupportedZones.map((zone) => zone.label).join(', ')} missing rectangular dimensions and were skipped by the stacking estimator.`);
  }

  let bestResult = { placements: [], unplacedItems: expandedItems.map((item) => ({
    itemId: item.id,
    label: item.label,
    dimensionsMm: item.dimensionsMm,
    volumeLitres: Number(volumeLitres(item.dimensionsMm).toFixed(1))
  })) };
  let bestScore = packingScore(bestResult, zones);

  for (const order of itemOrders(expandedItems)) {
    const result = packItems(order, zones, options);
    const score = packingScore(result, zones);
    if (comparePackingScores(score, bestScore) < 0) {
      bestResult = result;
      bestScore = score;
    }
  }

  const totalItemVolume = bestResult.placements.reduce((sum, placement) => sum + placement.volumeLitres, 0);
  const totalUsableVolume = zones.reduce((sum, zone) => sum + (zone.volumeLitres * (zone.usableFraction ?? 0.75)), 0);
  const fitScore = bestResult.placements.length / Math.max(1, bestResult.placements.length + bestResult.unplacedItems.length);

  return {
    vehicleId: vehicle.id,
    seatConfigurationId,
    fits: bestResult.unplacedItems.length === 0,
    fitScore: Number(fitScore.toFixed(2)),
    seatBackEncroachmentConsidered: encroachmentZones.length > 0,
    usedVolumeLitres: Number(totalItemVolume.toFixed(1)),
    usableVolumeLitres: Number(totalUsableVolume.toFixed(1)),
    placements: bestResult.placements,
    unplacedItems: bestResult.unplacedItems,
    warnings
  };
}
