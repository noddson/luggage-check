export function createVisualizationRenderer({
  state,
  visualization,
  setSanitizedMarkup,
  renderZoneSvg,
  renderZone3dSvg,
  bind3dRotation
}) {
  return function renderVisualization(vehicle, config, result) {
    const zones = config.cargoZoneIds.map((id) => vehicle.cargoZones.find((zone) => zone.id === id)).filter(Boolean);
    setSanitizedMarkup(visualization, zones.map((zone, index) => {
      const placements = result.placements.filter((placement) => placement.zoneId === zone.id);
      return state.activeView === '3d' ? renderZone3dSvg(zone, placements) : renderZoneSvg(zone, placements, index);
    }).join(''));
    bind3dRotation();
  };
}
