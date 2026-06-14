// Helpers + export
function _ingHtml(rec) {
    return Object.entries(rec.ingredients).map(([id, need]) => {
      const have = ZS.Inventory.countItem(id);
      const lbl = ZS.ITEMS[id]?.label || id;
      const ok = have >= need;
      return `<span style="color:${ok ? '#88cc66' : '#cc6644'}">${lbl} ${have}/${need}</span>`;
    }).join(' · ');
  }

  window.ZS = window.ZS || {};
  ZS.Craft = { init, toggle, tick, getQueueLength: () => _queue.length, applyServerQueue, onServerComplete };
