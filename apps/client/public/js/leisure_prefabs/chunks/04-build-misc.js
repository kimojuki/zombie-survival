// Divers loisirs — extrait de leisure_prefabs.js (IIFE)
function _buildSolarShower(root) {
    const bag = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const tube = new THREE.MeshLambertMaterial({ color: 0x4868a8 });
    _add(root, new THREE.BoxGeometry(0.32, 0.52, 0.12), bag, 0, 1.12, 0);
    _add(root, new THREE.BoxGeometry(0.28, 0.08, 0.1), bag, 0, 1.4, 0);
    _add(root, new THREE.CylinderGeometry(0.018, 0.018, 1.02, 8), tube, 0, 0.55, 0);
    _add(root, new THREE.CylinderGeometry(0.04, 0.04, 0.08, 8), tube, 0, 0.04, 0);
    _add(root, new THREE.BoxGeometry(0.12, 0.04, 0.08), new THREE.MeshLambertMaterial({ color: 0x9a9890 }), 0.08, 0.08, 0);
  }

  function _buildBirdBath(root) {
    const bowl = new THREE.MeshLambertMaterial({ color: 0xd8d0c0 });
    const stem = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const water = new THREE.MeshLambertMaterial({ color: 0x88c8e8, transparent: true, opacity: 0.6 });
    _add(root, new THREE.CylinderGeometry(0.08, 0.1, 0.08, 10), stem, 0, 0.04, 0);
    _add(root, new THREE.CylinderGeometry(0.04, 0.045, 0.62, 8), stem, 0, 0.35, 0);
    _add(root, new THREE.CylinderGeometry(0.22, 0.18, 0.12, 12), bowl, 0, 0.72, 0);
    _add(root, new THREE.CylinderGeometry(0.16, 0.16, 0.02, 12), water, 0, 0.76, 0);
  }

  function _buildRedWagon(root) {
    const body = new THREE.MeshLambertMaterial({ color: 0xc84828 });
    const wheel = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const handle = new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    _add(root, new THREE.BoxGeometry(0.52, 0.18, 0.72), body, 0, 0.22, 0);
    for (const [x, z] of [[-0.22, 0.28], [0.22, 0.28], [-0.22, -0.28], [0.22, -0.28]]) {
      _add(root, new THREE.CylinderGeometry(0.08, 0.08, 0.04, 12), wheel, x, 0.08, z, Math.PI / 2, 0, 0);
    }
    _add(root, new THREE.CylinderGeometry(0.012, 0.012, 0.62, 6), handle, 0, 0.28, -0.52, -0.25, 0, 0);
    _add(root, new THREE.BoxGeometry(0.04, 0.04, 0.12), handle, 0, 0.12, -0.82);
  }
