// Texture sable procédurale — plage spawn.
(function () {
  'use strict';

  let _tex = null;

  function _drawSandCanvas() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#d4bc94';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * 128;
      const y = Math.random() * 128;
      const g = 180 + Math.floor(Math.random() * 55);
      const a = 0.08 + Math.random() * 0.22;
      ctx.fillStyle = `rgba(${g},${g - 18},${g - 42},${a})`;
      ctx.fillRect(x, y, 1 + Math.random() * 2, 1);
    }
    for (let i = 0; i < 48; i++) {
      const x = Math.random() * 128;
      const y = Math.random() * 128;
      const r = 1 + Math.random() * 3;
      ctx.fillStyle = `rgba(120,100,70,${0.04 + Math.random() * 0.08})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    return c;
  }

  function getSandTexture() {
    if (_tex) return _tex;
    _tex = new THREE.CanvasTexture(_drawSandCanvas());
    _tex.wrapS = _tex.wrapT = THREE.RepeatWrapping;
    _tex.repeat.set(6, 6);
    _tex.magFilter = THREE.LinearFilter;
    _tex.minFilter = THREE.LinearMipmapLinearFilter;
    _tex.colorSpace = THREE.SRGBColorSpace;
    _tex.needsUpdate = true;
    return _tex;
  }

  function getSandMaterial(color) {
    return new THREE.MeshLambertMaterial({
      map: getSandTexture(),
      color: color || 0xffffff,
      flatShading: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -8,
    });
  }

  window.ZS = window.ZS || {};
  ZS.BeachTextures = { getSandTexture, getSandMaterial };
}());
