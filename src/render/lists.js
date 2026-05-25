import { dimensionsLabel, mixWithWhite } from './helpers.js';

export function createListsRenderer({ $, createEl, t, colorForSourceId, localizedPlacementLabel, localizedZoneLabel }) {
  return function renderLists(result) {
    const placedList = $('#placedList');
    if (result.placements.length) {
      placedList.replaceChildren(...result.placements.map((placement) => {
        const sourceId = placement.sourceId ?? placement.itemId.split('#')[0];
        const tint = colorForSourceId(sourceId);
        const li = createEl('li', { className: 'placed-item', attrs: { 'data-source-id': sourceId } });
        li.append(
          createEl('span', { className: 'item-status item-status--placed', text: '✓', attrs: { 'aria-hidden': 'true' } }),
          createEl('button', { className: 'placed-delete', text: '✕', attrs: { type: 'button', title: t('removeOne').replace('{item}', localizedPlacementLabel(placement)), 'aria-label': t('removeOne').replace('{item}', localizedPlacementLabel(placement)) } }),
          createEl('strong', { text: localizedPlacementLabel(placement) }),
          createEl('small', { text: `${localizedZoneLabel(placement.zoneLabel, placement.zoneId)} · ${dimensionsLabel(placement.orientationMm)}` })
        );
        li.style.setProperty('--bag-panel-bg', mixWithWhite(tint, 0.9));
        return li;
      }));
    } else {
      placedList.replaceChildren(createEl('li', { className: 'muted', text: t('nothingPlacedYet') }));
    }

    const unplacedList = $('#unplacedList');
    if (result.unplacedItems.length) {
      unplacedList.replaceChildren(...result.unplacedItems.map((item) => {
        const sourceId = item.sourceId ?? item.id?.split('#')[0] ?? item.id;
        const tint = colorForSourceId(sourceId);
        const li = createEl('li', { className: 'problem placed-item', attrs: { 'data-source-id': sourceId } });
        li.append(
          createEl('span', { className: 'item-status item-status--unplaced', text: '⊘', attrs: { 'aria-hidden': 'true' } }),
          createEl('button', { className: 'placed-delete', text: '✕', attrs: { type: 'button', title: t('removeOne').replace('{item}', localizedPlacementLabel(item)), 'aria-label': t('removeOne').replace('{item}', localizedPlacementLabel(item)) } }),
          createEl('strong', { text: localizedPlacementLabel(item) }),
          createEl('small', { text: `${dimensionsLabel(item.dimensionsMm)} · ${item.volumeLitres} L` })
        );
        li.style.setProperty('--bag-panel-bg', mixWithWhite(tint, 0.9));
        return li;
      }));
    } else {
      unplacedList.replaceChildren(createEl('li', { className: 'success', text: t('allPlaced') }));
    }
  };
}
