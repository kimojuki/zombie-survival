// Catalogue + register
const TREE_PREFABS = {
    tree_oak: { build: buildOak, label: 'Chêne / feuillu' },
    tree_pine: { build: buildPine, label: 'Pin' },
    tree_birch: { build: buildBirch, label: 'Bouleau' },
    tree_dead: { build: buildDead, label: 'Arbre mort' },
    tree_palm: { build: buildPalm, label: 'Palmier' },
  };

  function listTreePrefabIds() {
    return Object.keys(TREE_PREFABS);
  }

  function registerTreePrefabs() {
    if (!ZS.registerDecorPrefab) return;
    for (const [id, def] of Object.entries(TREE_PREFABS)) {
      ZS.registerDecorPrefab(id, def);
    }
  }

  registerTreePrefabs();

  window.ZS = window.ZS || {};
  ZS.TreePrefabs = {
    listTreePrefabIds, TREE_PREFABS,
    buildOak, buildPine, buildBirch, buildDead, buildPalm, buildSimple,
    tickTreeLighting,
  };
  ZS.tickTreeLighting = tickTreeLighting;
