const MM3_PER_LITRE = 1_000_000;

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
  }))).sort((a, b) => volumeLitres(b.dimensionsMm) - volumeLitres(a.dimensionsMm));
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

function canFitInZone(item, zone) {
  if (!zone.dimensionsMm) return { fits: false };
  const candidates = item.rotationAllowed === false ? [item.dimensionsMm] : permutations(item.dimensionsMm);
  const orientation = candidates.find((candidate) =>
    candidate.length <= zone.dimensionsMm.length
    && candidate.width <= zone.dimensionsMm.width
    && candidate.height <= zone.dimensionsMm.height
    && itemFitsOpening(item, candidate, zone)
  );
  return { fits: Boolean(orientation), orientation };
}

/**
 * First-pass greedy estimator. It models each cargo zone as a single usable cuboid, which is intentionally
 * conservative via zone.usableFraction. Future versions can replace this with voxel or exact bin packing.
 *
 * @param {{ items: import('../domain/types.js').LuggageItem[] }} luggageSet
 * @param {import('../domain/types.js').VehicleConfig} vehicle
 * @param {string} seatConfigurationId
 */
export function estimateFit(luggageSet, vehicle, seatConfigurationId = 'seats_up') {
  const seatConfiguration = vehicle.seatConfigurations.find((candidate) => candidate.id === seatConfigurationId);
  if (!seatConfiguration) throw new Error(`Unknown seat configuration: ${seatConfigurationId}`);

  const zones = seatConfiguration.cargoZoneIds.map((id) => vehicle.cargoZones.find((zone) => zone.id === id)).filter(Boolean);
  const remainingByZone = new Map(zones.map((zone) => [zone.id, zone.volumeLitres * (zone.usableFraction ?? 0.75)]));
  const placements = [];
  const unplacedItems = [];
  const warnings = zones.flatMap((zone) => zone.confidence === 'low' ? [`${vehicle.id}/${zone.id}: cargo dimensions are estimated; result is a planning approximation.`] : []);

  for (const item of expandItems(luggageSet.items)) {
    const itemVolume = volumeLitres(item.dimensionsMm);
    let placed = false;
    for (const zone of zones) {
      const fit = canFitInZone(item, zone);
      const remaining = remainingByZone.get(zone.id) ?? 0;
      if (fit.fits && itemVolume <= remaining) {
        remainingByZone.set(zone.id, remaining - itemVolume);
        placements.push({ itemId: item.id, label: item.label, zoneId: zone.id, orientationMm: fit.orientation, volumeLitres: Number(itemVolume.toFixed(1)) });
        placed = true;
        break;
      }
    }
    if (!placed) unplacedItems.push({ itemId: item.id, label: item.label, dimensionsMm: item.dimensionsMm, volumeLitres: Number(itemVolume.toFixed(1)) });
  }

  const totalItemVolume = placements.reduce((sum, placement) => sum + placement.volumeLitres, 0);
  const totalUsableVolume = [...remainingByZone.entries()].reduce((sum, [zoneId, remaining]) => {
    const zone = zones.find((candidate) => candidate.id === zoneId);
    return sum + (zone.volumeLitres * (zone.usableFraction ?? 0.75));
  }, 0);
  const fitScore = placements.length / Math.max(1, placements.length + unplacedItems.length);

  return {
    vehicleId: vehicle.id,
    seatConfigurationId,
    fits: unplacedItems.length === 0,
    fitScore: Number(fitScore.toFixed(2)),
    usedVolumeLitres: Number(totalItemVolume.toFixed(1)),
    usableVolumeLitres: Number(totalUsableVolume.toFixed(1)),
    placements,
    unplacedItems,
    warnings
  };
}
