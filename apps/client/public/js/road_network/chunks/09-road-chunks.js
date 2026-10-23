// Chunks spatial 64 m — parent routes pour ChunkStreamer (L3b)
/** @type {THREE.Group|null} */
let _roadRoot = null;
/** @type {Map<string, { group: THREE.Group, cx: number, cz: number, key: string }>} */
const _roadChunks = new Map();

function _roadChunkSize() {
  return ZS.Engine?.CHUNK_SIZE ?? ZS.Engine?.ChunkStreamer?.CHUNK_SIZE ?? 64;
}

function _roadChunkKey(x, z) {
  const cs = _roadChunkSize();
  return `${Math.floor(x / cs)},${Math.floor(z / cs)}`;
}

function _centroidXZ(pos) {
  if (!pos?.length) return { x: 0, z: 0 };
  let sx = 0;
  let sz = 0;
  let n = 0;
  for (let i = 0; i + 2 < pos.length; i += 3) {
    sx += pos[i];
    sz += pos[i + 2];
    n++;
  }
  return n ? { x: sx / n, z: sz / n } : { x: 0, z: 0 };
}

function _centroidFromBuffer(posAttr) {
  if (!posAttr?.count) return { x: 0, z: 0 };
  let sx = 0;
  let sz = 0;
  for (let i = 0; i < posAttr.count; i++) {
    sx += posAttr.getX(i);
    sz += posAttr.getZ(i);
  }
  return { x: sx / posAttr.count, z: sz / posAttr.count };
}

function _ensureRoadRoot(scene) {
  if (_roadRoot && _roadRoot.parent === scene) return _roadRoot;
  if (_roadRoot?.parent) _roadRoot.parent.remove(_roadRoot);
  _roadRoot = new THREE.Group();
  _roadRoot.name = 'roadNetworkChunks';
  scene.add(_roadRoot);
  return _roadRoot;
}

function _roadChunkParent(scene, x, z) {
  _ensureRoadRoot(scene);
  const cs = _roadChunkSize();
  const key = _roadChunkKey(x, z);
  let entry = _roadChunks.get(key);
  if (!entry) {
    const ix = Math.floor(x / cs);
    const iz = Math.floor(z / cs);
    const cx = ix * cs + cs * 0.5;
    const cz = iz * cs + cs * 0.5;
    const g = new THREE.Group();
    g.name = `roadChunk:${key}`;
    g.userData.roadChunkKey = key;
    _roadRoot.add(g);
    entry = { group: g, cx, cz, key };
    _roadChunks.set(key, entry);
  }
  return entry.group;
}

function _addRoadMeshToScene(scene, mesh, cx, cz) {
  if (!mesh) return;
  if (!Number.isFinite(cx) || !Number.isFinite(cz)) {
    const pos = mesh.geometry?.attributes?.position;
    if (pos) {
      const c = _centroidFromBuffer(pos);
      cx = c.x;
      cz = c.z;
    } else {
      cx = 0;
      cz = 0;
    }
  }
  _roadChunkParent(scene, cx, cz).add(mesh);
  _trackMesh(mesh);
}

function _resetRoadChunkState() {
  _roadChunks.clear();
  if (_roadRoot?.parent) _roadRoot.parent.remove(_roadRoot);
  _roadRoot = null;
  ZS.Engine?.ChunkStreamer?.resetLayer?.('roads');
}

function _unloadRoadChunkEntry(entry) {
  const g = entry?.group ?? entry?.handle;
  if (!g) return;
  const toDispose = [];
  g.traverse((o) => {
    if (o.isMesh) toDispose.push(o);
  });
  for (const mesh of toDispose) {
    const idx = _meshes.indexOf(mesh);
    if (idx >= 0) _meshes.splice(idx, 1);
    mesh.parent?.remove(mesh);
    mesh.geometry?.dispose?.();
    if (mesh.material) {
      if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose?.());
      else mesh.material.dispose?.();
    }
  }
  g.parent?.remove(g);
}

function _registerRoadChunksWithStreamer() {
  const streamer = ZS.Engine?.ChunkStreamer;
  if (!streamer || !_roadChunks.size) return;
  const cs = _roadChunkSize();
  streamer.ensureLayer('roads', {
    chunkSize: cs,
    maxLoaded: 160,
    unloadBeyondFar: false,
    onUnload: _unloadRoadChunkEntry,
  });
  for (const [key, entry] of _roadChunks) {
    streamer.registerChunk('roads', key, {
      group: entry.group,
      cx: entry.cx,
      cz: entry.cz,
    });
  }
  ZS.LoadLog?.mark?.('road-chunks-registered', {
    chunks: _roadChunks.size,
    chunkSize: cs,
  });
}

function _beginRoadChunkBuild(scene) {
  _resetRoadChunkState();
  if (scene) _ensureRoadRoot(scene);
}
