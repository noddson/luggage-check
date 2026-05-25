export function createEventBindings({ document, window, elements, actions }) {
  function bindRemovalList(list) {
    list.addEventListener('click', (event) => {
      const deleteButton = event.target.closest('.placed-delete');
      if (!deleteButton) return;
      const sourceId = deleteButton.closest('.placed-item')?.dataset.sourceId;
      if (sourceId) actions.decrementItemQuantity(sourceId);
    });
  }

  function bindVisualizationInteractions() {
    elements.visualization.addEventListener('click', (event) => {
      const axisButton = event.target.closest('.orientation-axis-button');
      if (!axisButton) return;
      event.stopPropagation();
      actions.set3dOrientation(axisButton.dataset.axis);
    });

    elements.visualization.addEventListener('keydown', (event) => {
      const axisButton = event.target.closest('.orientation-axis-button');
      if (!axisButton || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      event.stopPropagation();
      actions.set3dOrientation(axisButton.dataset.axis);
    });

    elements.visualization.addEventListener('pointerdown', (event) => {
      const svg = event.target.closest('.zone-3d-svg');
      if (!svg || event.target.closest('.orientation-axis-control')) return;
      event.preventDefault();
      let previous = { x: event.clientX, y: event.clientY };
      svg.classList.add('is-dragging');

      const handleMove = (moveEvent) => {
        const dx = moveEvent.clientX - previous.x;
        const dy = moveEvent.clientY - previous.y;
        previous = { x: moveEvent.clientX, y: moveEvent.clientY };
        actions.rotate3d(dx, dy);
      };
      const endDrag = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', endDrag);
        window.removeEventListener('pointercancel', endDrag);
        elements.visualization.querySelectorAll('.zone-3d-svg').forEach((currentSvg) => currentSvg.classList.remove('is-dragging'));
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', endDrag, { once: true });
      window.addEventListener('pointercancel', endDrag, { once: true });
    });
  }

  return function bindEvents() {
    elements.vehicleSelect.addEventListener('change', () => actions.setVehicle(elements.vehicleSelect.value));
    elements.configurationSelect.addEventListener('change', () => actions.setConfiguration(elements.configurationSelect.value));
    elements.seatBackAngleInput.addEventListener('input', () => actions.setSeatBackAngle(elements.seatBackAngleInput.value));

    const updateBuffer = () => actions.setBuffer(elements.bufferInput.value);
    elements.bufferInput.addEventListener('input', updateBuffer);
    elements.bufferInput.addEventListener('change', updateBuffer);
    elements.bufferInput.addEventListener('blur', updateBuffer);

    elements.resetLuggageButton.addEventListener('click', actions.resetLuggageQuantities);
    document.querySelectorAll('.view-tab').forEach((button) => {
      button.addEventListener('click', () => actions.setView(button.dataset.view));
    });
    elements.luggageControls.addEventListener('input', (event) => {
      if (event.target.id.startsWith('custom-')) {
        actions.setCustomBagDimension(event.target.id.slice('custom-'.length), event.target.value);
        return;
      }
      if (event.target.id.startsWith('qty-')) actions.setItemQuantity();
    });
    bindRemovalList(elements.placedList);
    bindRemovalList(elements.unplacedList);
    elements.languageSelect.addEventListener('change', () => actions.setLanguage(elements.languageSelect.value));
    bindVisualizationInteractions();
  };
}
