export function projectZone(zone, view, t) {
  const dimensions = zone.dimensionsMm;
  if (view === 'side') return { width: dimensions.length, height: dimensions.height, xLabel: t('length'), yLabel: t('height') };
  if (view === 'front') return { width: dimensions.width, height: dimensions.height, xLabel: t('width'), yLabel: t('height') };
  return { width: dimensions.length, height: dimensions.width, xLabel: t('length'), yLabel: t('width') };
}
