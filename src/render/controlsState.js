export function createControlsStateSync({
  state,
  $,
  customBagId,
  customBagMinDimensionsMm,
  customBagMaxDimensionsMm,
  hasValidCustomBagDimensions,
  maxQuantityForItem
}) {
  return function syncCustomBagControlState(result = null) {
    const customBag = state.luggageSet?.items?.find((item) => item.id === customBagId);
    const qtyInput = $(`#qty-${customBagId}`);
    if (!customBag || !qtyInput) return;
    const customBagInResult = Boolean(result) && (
      result.placements.some((placement) => (placement.sourceId ?? placement.itemId?.split('#')[0]) === customBagId)
      || result.unplacedItems.some((item) => (item.sourceId ?? item.id?.split('#')[0]) === customBagId)
    );
    const customBagLocked = customBagInResult || Number(qtyInput.value) > 0;
    ['height', 'width', 'length'].forEach((axis) => {
      const input = $(`#custom-${axis}`);
      if (!input) return;
      input.disabled = customBagLocked;
      const parsed = Number.parseInt(input.value, 10);
      const hasValue = Number.isFinite(parsed);
      const isOutOfBounds = !hasValue || parsed < customBagMinDimensionsMm[axis] || parsed > customBagMaxDimensionsMm[axis];
      input.classList.toggle('field-input--out-of-bounds', isOutOfBounds);
    });
    const hasValidDimensions = hasValidCustomBagDimensions(customBag.dimensionsMm);
    qtyInput.max = String(maxQuantityForItem(customBag));
    qtyInput.disabled = !hasValidDimensions;
    if (!hasValidDimensions) qtyInput.value = '0';
    if (Number(qtyInput.value) > maxQuantityForItem(customBag)) qtyInput.value = String(maxQuantityForItem(customBag));
  };
}
