const MM3_PER_LITRE = 1_000_000;
const MIN_SPACE_MM = 1;
const DEFAULT_SEAT_BACK_ANGLE_DEGREES = 20;
const DEFAULT_SUPPORT_POLICY = {
  mergeAdjacentCoplanarSpaces: true,
  minimumSupportedFootprintRatio: 0.75
};
const DEFAULT_MAX_PACKING_BRANCHES = 8;
const DEFAULT_MAX_PACKING_STATES = 1500;
const DEFAULT_MAX_PLANNING_SURPLUS_PER_SOURCE = 3;

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

function seatBackEncroachmentPrismVolumeLitres(zone, options = {}) {
  if (!options.considerSeatBackEncroachment || !zone.seatBackEncroachment || !zone.dimensionsMm) return 0;
  const encroachmentDepthMm = Math.min(
    zone.dimensionsMm.length,
    seatBackEncroachmentMmAtHeight(zone, zone.dimensionsMm.height, options)
  );
  return (encroachmentDepthMm * zone.dimensionsMm.width * zone.dimensionsMm.height) / (2 * MM3_PER_LITRE);
}

function usableZoneVolumeLitres(zone, options = {}) {
  const rectangularUsableVolumeLitres = zone.volumeLitres * (zone.usableFraction ?? options.defaultUsableFraction ?? 0.75);
  return Math.max(0, rectangularUsableVolumeLitres - seatBackEncroachmentPrismVolumeLitres(zone, options));
}

function initialZoneState(zone, options = {}) {
  return {
    zone,
    remainingLitres: usableZoneVolumeLitres(zone, options),
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

function candidatePositions(space, orientation) {
  const xAnchors = [
    space.x,
    space.x + space.length - orientation.length,
    space.x + Math.floor((space.length - orientation.length) / 2)
  ];
  const yAnchors = [
    space.y,
    space.y + space.width - orientation.width,
    space.y + Math.floor((space.width - orientation.width) / 2)
  ];
  const positions = [];

  for (const x of xAnchors) {
    for (const y of yAnchors) {
      const position = { x, y, z: space.z };
      if (!positions.some((candidate) => candidate.x === position.x && candidate.y === position.y && candidate.z === position.z)) {
        positions.push(position);
      }
    }
  }

  return positions;
}

function fitsAtPositionInSpace(position, orientation, space) {
  return position.x >= space.x
    && position.y >= space.y
    && position.z >= space.z
    && position.x + orientation.length <= space.x + space.length
    && position.y + orientation.width <= space.y + space.width
    && position.z + orientation.height <= space.z + space.height;
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

function rectangleIntersectionArea(aPosition, aSize, bPosition, bSize) {
  const xOverlap = Math.max(0, Math.min(aPosition.x + aSize.length, bPosition.x + bSize.length) - Math.max(aPosition.x, bPosition.x));
  const yOverlap = Math.max(0, Math.min(aPosition.y + aSize.width, bPosition.y + bSize.width) - Math.max(aPosition.y, bPosition.y));
  return xOverlap * yOverlap;
}

function supportedFootprintRatio(position, orientation, placements) {
  if (position.z === 0) return 1;
  const footprintArea = orientation.length * orientation.width;
  if (footprintArea <= 0) return 0;

  const supportingPlacements = placements.filter((placement) =>
    placement.positionMm.z + placement.orientationMm.height === position.z
  );
  const supportedArea = supportingPlacements.reduce((total, placement) => total + rectangleIntersectionArea(
    position,
    orientation,
    placement.positionMm,
    placement.orientationMm
  ), 0);

  return Math.min(1, supportedArea / footprintArea);
}

function hasSufficientSupport(position, orientation, placements, options = {}) {
  const supportPolicy = effectiveSupportPolicy(options);
  return supportedFootprintRatio(position, orientation, placements) >= supportPolicy.minimumSupportedFootprintRatio;
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
  const policy = {
    ...DEFAULT_SUPPORT_POLICY,
    ...(options.supportPolicy ?? {})
  };

  return {
    ...policy,
    minimumSupportedFootprintRatio: Math.min(1, Math.max(0, policy.minimumSupportedFootprintRatio))
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

function layerSpaceAbovePlacement(zone, position, orientation) {
  if (!zone.dimensionsMm) return null;
  const z = position.z + orientation.height;
  return {
    x: 0,
    y: 0,
    z,
    length: zone.dimensionsMm.length,
    width: zone.dimensionsMm.width,
    height: zone.dimensionsMm.height - z
  };
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

function spacesAfterPlacement(candidate, options = {}) {
  const remainingSpaces = candidate.zoneState.spaces.filter((_, index) => index !== candidate.spaceIndex);
  const layerSpace = layerSpaceAbovePlacement(candidate.zoneState.zone, candidate.position, candidate.orientation);
  return normalizeSpaces([
    ...remainingSpaces,
    ...splitSpace(candidate.space, candidate.position, candidate.orientation),
    ...(layerSpace ? [layerSpace] : [])
  ], options);
}

function residualSpacesAfterPlacement(candidate, options = {}) {
  return spacesAfterPlacement(candidate, options);
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

function candidatePlacements(item, zoneStates, options, remainingItems = []) {
  const itemVolume = volumeLitres(item.dimensionsMm);
  const candidates = [];

  for (const [zoneIndex, zoneState] of zoneStates.entries()) {
    if (itemVolume > zoneState.remainingLitres) continue;
    for (const orientation of orientationsForZone(item, zoneState.zone)) {
      for (const [spaceIndex, space] of zoneState.spaces.entries()) {
        if (!fitsInSpace(orientation, space)) continue;
        for (const position of candidatePositions(space, orientation)) {
          if (!fitsAtPositionInSpace(position, orientation, space)) continue;
          if (!fitsSeatBackEncroachment(position, orientation, zoneState.zone, options)) continue;
          if (collidesWithPlacement(position, orientation, zoneState.placements)) continue;
          if (!hasSufficientSupport(position, orientation, zoneState.placements, options)) continue;
          const candidate = { zoneIndex, zoneState, spaceIndex, space, orientation, position, item };
          candidates.push({ ...candidate, score: scoreCandidate(candidate, remainingItems, options) });
        }
      }
    }
  }

  return candidates
    .filter((candidate, index, list) => list.findIndex((other) =>
      other.zoneIndex === candidate.zoneIndex
      && other.spaceIndex === candidate.spaceIndex
      && other.position.x === candidate.position.x
      && other.position.y === candidate.position.y
      && other.position.z === candidate.position.z
      && other.orientation.length === candidate.orientation.length
      && other.orientation.width === candidate.orientation.width
      && other.orientation.height === candidate.orientation.height
    ) === index)
    .sort((a, b) => compareScores(a.score, b.score));
}

function findBestCandidate(item, zoneStates, options, remainingItems = []) {
  return candidatePlacements(item, zoneStates, options, remainingItems)[0];
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

  candidate.zoneState.spaces = spacesAfterPlacement(candidate, options);
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

function packingScore(result, zones, options = {}) {
  const zoneCount = new Set(result.placements.map((placement) => placement.zoneId)).size;
  const usedVolume = result.placements.reduce((sum, placement) => sum + placement.volumeLitres, 0);
  const totalUsableVolume = zones.reduce((sum, zone) => sum + usableZoneVolumeLitres(zone, options), 0);
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

function unplacedItem(item) {
  return {
    itemId: item.id,
    sourceId: item.sourceId,
    label: item.label,
    dimensionsMm: item.dimensionsMm,
    volumeLitres: Number(volumeLitres(item.dimensionsMm).toFixed(1))
  };
}

function cloneZoneStates(zoneStates) {
  return zoneStates.map((zoneState) => ({
    zone: zoneState.zone,
    remainingLitres: zoneState.remainingLitres,
    spaces: zoneState.spaces.map((space) => ({ ...space })),
    placements: zoneState.placements.map((placement) => ({
      ...placement,
      positionMm: { ...placement.positionMm },
      orientationMm: { ...placement.orientationMm }
    }))
  }));
}

function resultFromState(zoneStates, unplacedItems) {
  return {
    placements: zoneStates.flatMap((zoneState) => zoneState.placements),
    unplacedItems
  };
}

function packItemsGreedy(order, zones, options = {}) {
  const zoneStates = zones.filter((zone) => zone.dimensionsMm).map((zone) => initialZoneState(zone, options));
  const unplacedItems = [];

  for (const [itemIndex, item] of order.entries()) {
    const candidate = findBestCandidate(item, zoneStates, options, order.slice(itemIndex + 1));
    if (candidate) {
      placeItem(item, candidate, options);
    } else {
      unplacedItems.push(unplacedItem(item));
    }
  }

  return resultFromState(zoneStates, unplacedItems);
}

function packItems(order, zones, options = {}) {
  const initialStates = zones.filter((zone) => zone.dimensionsMm).map((zone) => initialZoneState(zone, options));
  const maxBranches = options.maxPackingBranches ?? DEFAULT_MAX_PACKING_BRANCHES;
  const maxStates = options.maxPackingStates ?? DEFAULT_MAX_PACKING_STATES;
  let bestResult = packItemsGreedy(order, zones, options);
  let bestScore = packingScore(bestResult, zones, options);
  let visitedStates = 0;

  function considerResult(result) {
    const score = packingScore(result, zones, options);
    if (comparePackingScores(score, bestScore) < 0) {
      bestResult = result;
      bestScore = score;
    }
  }

  function search(zoneStates, itemIndex, unplacedItems) {
    visitedStates += 1;
    if (visitedStates > maxStates) return;

    const placedCount = zoneStates.reduce((count, zoneState) => count + zoneState.placements.length, 0);
    if (placedCount + (order.length - itemIndex) < bestResult.placements.length) return;

    if (itemIndex >= order.length) {
      considerResult(resultFromState(zoneStates, unplacedItems));
      return;
    }

    const item = order[itemIndex];
    const remainingItems = order.slice(itemIndex + 1);
    const candidates = candidatePlacements(item, zoneStates, options, remainingItems).slice(0, maxBranches);

    for (const candidate of candidates) {
      const branchStates = cloneZoneStates(zoneStates);
      const branchCandidate = {
        ...candidate,
        zoneState: branchStates[candidate.zoneIndex],
        space: branchStates[candidate.zoneIndex].spaces[candidate.spaceIndex],
        position: { ...candidate.position },
        orientation: { ...candidate.orientation }
      };
      placeItem(item, branchCandidate, options);
      search(branchStates, itemIndex + 1, unplacedItems);
    }

    search(zoneStates, itemIndex + 1, [...unplacedItems, unplacedItem(item)]);
  }

  search(initialStates, 0, []);
  return bestResult;
}

function bestPackingForItems(expandedItems, zones, options = {}) {
  let bestResult = { placements: [], unplacedItems: expandedItems.map((item) => unplacedItem(item)) };
  let bestScore = packingScore(bestResult, zones, options);

  for (const order of itemOrders(expandedItems)) {
    const result = packItems(order, zones, options);
    const score = packingScore(result, zones, options);
    if (comparePackingScores(score, bestScore) < 0) {
      bestResult = result;
      bestScore = score;
    }
  }

  return bestResult;
}

function itemsBySource(items) {
  return items.reduce((groups, item) => {
    if (!groups.has(item.sourceId)) groups.set(item.sourceId, []);
    groups.get(item.sourceId).push(item);
    return groups;
  }, new Map());
}

function placementRemovalOrder(a, b) {
  return (b.positionMm.z + b.orientationMm.height) - (a.positionMm.z + a.orientationMm.height)
    || b.positionMm.z - a.positionMm.z
    || b.positionMm.y - a.positionMm.y
    || b.positionMm.x - a.positionMm.x;
}

function normalizeResultToActualItems(result, actualItems) {
  const actualGroups = itemsBySource(actualItems);
  const keepBySource = new Map();

  for (const [sourceId, sourceItems] of actualGroups.entries()) {
    const sourcePlacements = result.placements
      .map((placement, index) => ({ ...placement, index }))
      .filter((placement) => placement.sourceId === sourceId);
    const removedIndexes = new Set([...sourcePlacements]
      .sort(placementRemovalOrder)
      .slice(sourceItems.length)
      .map((placement) => placement.index));
    keepBySource.set(sourceId, sourcePlacements.filter((placement) => !removedIndexes.has(placement.index)));
  }

  const assignedBySource = new Map([...actualGroups].map(([sourceId]) => [sourceId, 0]));
  const placements = result.placements.flatMap((placement, index) => {
    const sourcePlacements = keepBySource.get(placement.sourceId) ?? [];
    if (!sourcePlacements.some((candidate) => candidate.index === index)) return [];

    const sourceItems = actualGroups.get(placement.sourceId) ?? [];
    const assignmentIndex = assignedBySource.get(placement.sourceId) ?? 0;
    const actualItem = sourceItems[assignmentIndex];
    if (!actualItem) return [];
    assignedBySource.set(placement.sourceId, assignmentIndex + 1);

    return [{
      ...placement,
      itemId: actualItem.id,
      label: actualItem.label
    }];
  });

  const placedIds = new Set(placements.map((placement) => placement.itemId));
  return {
    placements,
    unplacedItems: actualItems.filter((item) => !placedIds.has(item.id)).map((item) => unplacedItem(item))
  };
}

function hasStablePlacementSupport(result, options = {}) {
  return result.placements.every((placement) => {
    const supportingPlacements = result.placements.filter((candidate) => candidate !== placement);
    return hasSufficientSupport(placement.positionMm, placement.orientationMm, supportingPlacements, options);
  });
}

// Repeated identical bags can expose better layer patterns when the bounded search sees one
// extra future item. Use temporary surplus copies as planning-only probes, then normalize
// the winning geometry back to the actual selected luggage count.
function planningSurplusItems(expandedItems, bestResult, options = {}) {
  const maxSurplusPerSource = options.maxPlanningSurplusPerSource ?? DEFAULT_MAX_PLANNING_SURPLUS_PER_SOURCE;
  if (maxSurplusPerSource <= 0) return [];

  const groups = itemsBySource(expandedItems);
  const unplacedSources = new Set(bestResult.unplacedItems.map((item) => item.sourceId));
  return [...groups.entries()].flatMap(([sourceId, sourceItems]) => {
    if (sourceItems.length < 2 || !unplacedSources.has(sourceId)) return [];
    const template = sourceItems[0];
    return Array.from({ length: maxSurplusPerSource }, (_, index) => ({
      ...cloneItem(template),
      id: `${sourceId}#planning-surplus-${index + 1}`,
      label: `${template.label} planning surplus ${index + 1}`
    }));
  });
}

function improvePackingWithPlanningSurplus(bestResult, expandedItems, zones, options = {}) {
  if (bestResult.unplacedItems.length === 0) return bestResult;
  const surplusItems = planningSurplusItems(expandedItems, bestResult, options);
  if (surplusItems.length === 0) return bestResult;

  let improvedResult = bestResult;
  let improvedScore = packingScore(bestResult, zones, options);

  for (let surplusCount = 1; surplusCount <= surplusItems.length; surplusCount += 1) {
    const surplusResult = bestPackingForItems([...expandedItems, ...surplusItems.slice(0, surplusCount)], zones, options);
    const normalizedResult = normalizeResultToActualItems(surplusResult, expandedItems);
    if (!hasStablePlacementSupport(normalizedResult, options)) continue;
    const normalizedScore = packingScore(normalizedResult, zones, options);
    if (comparePackingScores(normalizedScore, improvedScore) < 0) {
      improvedResult = normalizedResult;
      improvedScore = normalizedScore;
    }
    if (improvedResult.unplacedItems.length === 0) break;
  }

  return improvedResult;
}

/**
 * Multi-pass 3D fit estimator. Each estimate rebuilds the full packing plan from the currently selected
 * luggage set, tries every valid axis rotation for each bag, and compares several deterministic item orderings so
 * adding or removing bags triggers a fresh full-set stacking plan instead of appending to the prior layout.
 *
 * @param {{ items: import('../domain/types.js').LuggageItem[] }} luggageSet
 * @param {import('../domain/types.js').VehicleConfig} vehicle
 * @param {string} seatConfigurationId
 * @param {{considerSeatBackEncroachment?: boolean, seatBackAngleDegrees?: number, defaultUsableFraction?: number, supportPolicy?: {mergeAdjacentCoplanarSpaces?: boolean, minimumSupportedFootprintRatio?: number}, maxPackingBranches?: number, maxPackingStates?: number, maxPlanningSurplusPerSource?: number}=} options
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

  const bestResult = improvePackingWithPlanningSurplus(
    bestPackingForItems(expandedItems, zones, options),
    expandedItems,
    zones,
    options
  );

  const totalItemVolume = bestResult.placements.reduce((sum, placement) => sum + placement.volumeLitres, 0);
  const totalUsableVolume = zones.reduce((sum, zone) => sum + usableZoneVolumeLitres(zone, options), 0);
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
