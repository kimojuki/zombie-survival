// Générateur d'icônes d'items : rend le modèle 3D réel de chaque objet
// (GLB ou procédural) hors-écran vers une image PNG, mise en cache.
// → les icônes d'inventaire ressemblent exactement à l'objet équipé.
(function () {
  'use strict';

  const SIZE = 128;
  const cache = {};     // type → dataURL
  const pending = {};   // type → Promise<dataURL>
  let renderer, scene, cam;

  function _ensure() {
    if (renderer) return;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(SIZE, SIZE);
    renderer.setClearColor(0x000000, 0);
    scene = new THREE.Scene();
    cam = new THREE.PerspectiveCamera(30, 1, 0.001, 100);
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const d1 = new THREE.DirectionalLight(0xffffff, 1.1); d1.position.set(2, 3, 4); scene.add(d1);
    const d2 = new THREE.DirectionalLight(0xffffff, 0.5); d2.position.set(-3, 1, -2); scene.add(d2);
  }

  function _renderToURL(obj) {
    _ensure();
    scene.add(obj);
    // Cadrage : englobe le modèle dans la vue (angle 3/4)
    const box = new THREE.Box3().setFromObject(obj);
    const sph = box.getBoundingSphere(new THREE.Sphere());
    const r = sph.radius || 0.3;
    const dist = (r / Math.sin((cam.fov * Math.PI / 180) / 2)) * 1.18;
    const dir = new THREE.Vector3(0.55, 0.45, 1).normalize();
    cam.position.copy(sph.center).add(dir.multiplyScalar(dist));
    cam.lookAt(sph.center);
    cam.near = Math.max(dist - r * 2, 0.001);
    cam.far = dist + r * 4;
    cam.updateProjectionMatrix();
    renderer.render(scene, cam);
    const url = renderer.domElement.toDataURL('image/png');
    scene.remove(obj);
    return url;
  }

  function get(type) {
    if (cache[type]) return Promise.resolve(cache[type]);
    if (pending[type]) return pending[type];
    if (!ZS.getItemModel || typeof THREE === 'undefined') return Promise.reject(new Error('indisponible'));
    pending[type] = ZS.getItemModel(type).then((obj) => {
      const url = _renderToURL(obj);
      cache[type] = url;
      delete pending[type];
      return url;
    }).catch((e) => { delete pending[type]; throw e; });
    return pending[type];
  }

  // Affiche l'icône image sur `el` (l'emoji reste en attendant le rendu).
  // `el` doit avoir une taille (largeur/hauteur). Ne touche pas aux enfants (compteur).
  function apply(el, type) {
    if (!el || !type) return;
    get(type).then((url) => {
      el.style.backgroundImage = 'url(' + url + ')';
      el.style.backgroundSize = 'contain';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundPosition = 'center';
      // efface l'emoji (nœuds texte) sans retirer les éléments enfants
      el.childNodes.forEach((n) => { if (n.nodeType === 3) n.textContent = ''; });
    }).catch(() => { /* on garde l'emoji */ });
  }

  window.ZS = window.ZS || {};
  ZS.Icons = { get, apply };
}());
