'use strict';



const path = require('path');

const { pathToFileURL } = require('url');

const db = require('./db');



const REVIEWS_MODULE_URL = pathToFileURL(

  path.join(__dirname, '../../../packages/shared/src/prefab-catalog-reviews.mjs'),

).href;



/** @type {Record<string, import('../../../packages/shared/src/prefab-catalog-reviews.mjs').PrefabReviewEntry>|null} */

let cache = null;

/** @type {Promise<Record<string, object>>|null} */

let loadPromise = null;



async function _shared() {

  return import(REVIEWS_MODULE_URL);

}



async function _ensureLoaded() {

  if (cache) return cache;

  if (loadPromise) return loadPromise;

  loadPromise = (async () => {

    const { normalizePrefabReviews, PREFAB_CATALOG_REVIEWS_META_KEY } = await _shared();

    try {

      const raw = await db.getWorldMeta(PREFAB_CATALOG_REVIEWS_META_KEY);

      cache = normalizePrefabReviews(raw ? JSON.parse(raw) : {});

    } catch {

      cache = {};

    }

    return cache;

  })();

  return loadPromise;

}



async function getPrefabCatalogReviews() {

  await _ensureLoaded();

  return { ...cache };

}



async function getPrefabCatalogReviewSnapshot() {

  const mod = await _shared();

  const reviews = await getPrefabCatalogReviews();

  return {

    reviews,

    reworkList: mod.listReworkPrefabs(reviews),

    reworkDetails: mod.buildReworkDetails(reviews),

    validatedList: mod.listValidatedPrefabs(reviews),

  };

}



/**

 * @param {string} prefabId

 * @param {'validated'|'rework'|null|undefined} status

 * @param {string} [username]

 * @param {string} [comment]

 */

async function setPrefabCatalogReview(prefabId, status, username, comment) {

  const mod = await _shared();

  await _ensureLoaded();

  try {

    cache = mod.setPrefabReview(cache, prefabId, status, {

      comment: status === 'rework' ? comment : undefined,

      by: username || undefined,

      updatedAt: new Date().toISOString(),

    });

  } catch (err) {

    const e = new Error(err.message || 'Revue invalide');

    e.code = 'REVIEW_INVALID';

    throw e;

  }

  await db.setWorldMeta(

    mod.PREFAB_CATALOG_REVIEWS_META_KEY,

    JSON.stringify(cache),

  );

  return {

    ok: true,

    prefabId: String(prefabId || '').trim(),

    status: mod.getPrefabReviewStatus(cache, prefabId),

    comment: mod.getPrefabReviewComment(cache, prefabId) || null,

    reviews: { ...cache },

    reworkList: mod.listReworkPrefabs(cache),

    reworkDetails: mod.buildReworkDetails(cache),

    validatedList: mod.listValidatedPrefabs(cache),

    by: username || null,

  };

}



module.exports = {

  getPrefabCatalogReviews,

  getPrefabCatalogReviewSnapshot,

  setPrefabCatalogReview,

};


