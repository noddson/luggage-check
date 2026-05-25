export function createMetricsHeaderRenderer({ $, createEl, t, localizeEntity }) {
  function metricCard(label, value, detail = '', className = '') {
    const card = createEl('article', { className: ['metric', className].filter(Boolean).join(' ') });
    card.append(createEl('span', { text: label }), createEl('strong', { text: value }));
    if (detail) card.append(createEl('small', { text: detail }));
    return card;
  }

  function renderMetricsHeader(vehicle, config, result) {
    const percent = Math.round(result.fitScore * 100);
    const volumePercent = Math.round((result.usedVolumeLitres / Math.max(1, result.usableVolumeLitres)) * 100);
    const fitResultLabel = t('placedCount').replace('{placed}', String(result.placements.length)).replace('{unplaced}', String(result.unplacedItems.length));
    const fitResultDetail = t('volumeUsedPercent').replace('{percent}', String(volumePercent));

    $('#resultTitle').textContent = `${vehicle.make} ${vehicle.model} · ${localizeEntity(config, 'label')}`;
    $('#fitBadge').className = `fit-badge ${result.fits ? 'fit-badge--ok' : 'fit-badge--bad'}`;
    $('#fitBadge').textContent = result.fits ? t('bagsFit') : t('bagsUnplaced');
    $('#metrics').replaceChildren(...[
      metricCard(t('fitScore'), `${percent}%`, t('placedSummary').replace('{placed}', String(result.placements.length)).replace('{total}', String(result.placements.length + result.unplacedItems.length))),
      metricCard(t('usableVolume'), `${result.usableVolumeLitres} L`, t('usedVolume').replace('{used}', String(result.usedVolumeLitres))),
      metricCard(t('fitResult'), fitResultLabel, fitResultDetail, 'metric--fit-result')
    ]);
  }

  function renderMetricsLoadError(errorMessage) {
    $('#metrics').replaceChildren(metricCard(t('fitResult'), t('loadErrorTitle'), errorMessage, 'metric--fit-result'));
  }

  return {
    renderMetricsHeader,
    renderMetricsLoadError
  };
}
