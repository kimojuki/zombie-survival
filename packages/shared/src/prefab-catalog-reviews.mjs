/** Revue qualité prefabs catalogue admin — statuts persistés côté serveur. */



export const PREFAB_REVIEW_STATUSES = Object.freeze(['validated', 'rework']);

export const PREFAB_CATALOG_REVIEWS_META_KEY = 'prefabCatalogReviews';

export const PREFAB_REWORK_COMMENT_MIN_LEN = 3;

export const PREFAB_REWORK_COMMENT_MAX_LEN = 500;



/**

 * @typedef {{ status: 'validated'|'rework', comment?: string, updatedAt?: string, by?: string }} PrefabReviewEntry

 */



/**

 * @param {unknown} val

 * @returns {PrefabReviewEntry|null}

 */

export function normalizeReviewEntry(val) {

  if (typeof val === 'string' && PREFAB_REVIEW_STATUSES.includes(val)) {

    return { status: val };

  }

  if (!val || typeof val !== 'object' || Array.isArray(val)) return null;

  const status = val.status;

  if (!PREFAB_REVIEW_STATUSES.includes(status)) return null;

  /** @type {PrefabReviewEntry} */

  const out = { status };

  if (typeof val.comment === 'string') {

    const c = val.comment.trim();

    if (c) out.comment = c.slice(0, PREFAB_REWORK_COMMENT_MAX_LEN);

  }

  if (typeof val.updatedAt === 'string' && val.updatedAt.trim()) {

    out.updatedAt = val.updatedAt.trim();

  }

  if (typeof val.by === 'string' && val.by.trim()) {

    out.by = val.by.trim();

  }

  return out;

}



/**

 * @param {unknown} raw

 * @returns {Record<string, PrefabReviewEntry>}

 */

export function normalizePrefabReviews(raw) {

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  /** @type {Record<string, PrefabReviewEntry>} */

  const out = {};

  for (const [id, val] of Object.entries(raw)) {

    const key = String(id || '').trim();

    if (!key) continue;

    const entry = normalizeReviewEntry(val);

    if (entry) out[key] = entry;

  }

  return out;

}



/**

 * @param {Record<string, PrefabReviewEntry|string>|null|undefined} reviews

 * @param {string} status

 * @returns {string[]}

 */

export function listPrefabsByReviewStatus(reviews, status) {

  return Object.entries(reviews || {})

    .filter(([, val]) => normalizeReviewEntry(val)?.status === status)

    .map(([id]) => id)

    .sort();

}



/**

 * @param {Record<string, PrefabReviewEntry|string>|null|undefined} reviews

 * @returns {string[]}

 */

export function listReworkPrefabs(reviews) {

  return listPrefabsByReviewStatus(reviews, 'rework');

}



/**

 * @param {Record<string, PrefabReviewEntry|string>|null|undefined} reviews

 * @returns {string[]}

 */

export function listValidatedPrefabs(reviews) {

  return listPrefabsByReviewStatus(reviews, 'validated');

}



/**

 * @param {Record<string, PrefabReviewEntry|string>|null|undefined} reviews

 * @returns {Record<string, { comment: string, updatedAt?: string, by?: string }>}

 */

export function buildReworkDetails(reviews) {

  /** @type {Record<string, { comment: string, updatedAt?: string, by?: string }>} */

  const out = {};

  for (const id of listReworkPrefabs(reviews)) {

    const entry = normalizeReviewEntry(reviews?.[id]);

    if (!entry) continue;

    out[id] = {

      comment: entry.comment || '',

      ...(entry.updatedAt ? { updatedAt: entry.updatedAt } : {}),

      ...(entry.by ? { by: entry.by } : {}),

    };

  }

  return out;

}



/**

 * @param {string} comment

 * @returns {string|null} message d'erreur ou null si OK

 */

export function validateReworkComment(comment) {

  const c = String(comment || '').trim();

  if (!c) return 'Un commentaire est requis pour marquer un prefab à refaire.';

  if (c.length < PREFAB_REWORK_COMMENT_MIN_LEN) {

    return `Le commentaire doit contenir au moins ${PREFAB_REWORK_COMMENT_MIN_LEN} caractères.`;

  }

  if (c.length > PREFAB_REWORK_COMMENT_MAX_LEN) {

    return `Le commentaire ne peut pas dépasser ${PREFAB_REWORK_COMMENT_MAX_LEN} caractères.`;

  }

  return null;

}



/**

 * @param {Record<string, PrefabReviewEntry|string>|null|undefined} reviews

 * @param {string} prefabId

 * @param {'validated'|'rework'|null|undefined} status

 * @param {{ comment?: string, by?: string, updatedAt?: string }} [opts]

 * @returns {Record<string, PrefabReviewEntry>}

 */

export function setPrefabReview(reviews, prefabId, status, opts = {}) {

  const next = normalizePrefabReviews(reviews);

  const id = String(prefabId || '').trim();

  if (!id) return next;

  if (!status || !PREFAB_REVIEW_STATUSES.includes(status)) {

    delete next[id];

    return next;

  }

  if (status === 'rework') {

    const err = validateReworkComment(opts.comment);

    if (err) throw new Error(err);

    next[id] = {

      status: 'rework',

      comment: String(opts.comment).trim().slice(0, PREFAB_REWORK_COMMENT_MAX_LEN),

      updatedAt: opts.updatedAt || new Date().toISOString(),

      ...(opts.by ? { by: opts.by } : {}),

    };

    return next;

  }

  next[id] = {

    status: 'validated',

    updatedAt: opts.updatedAt || new Date().toISOString(),

    ...(opts.by ? { by: opts.by } : {}),

  };

  return next;

}



/**

 * @param {Record<string, PrefabReviewEntry|string>|null|undefined} reviews

 * @param {string} prefabId

 * @returns {'validated'|'rework'|null}

 */

export function getPrefabReviewStatus(reviews, prefabId) {

  const id = String(prefabId || '').trim();

  if (!id) return null;

  return normalizeReviewEntry(reviews?.[id])?.status ?? null;

}



/**

 * @param {Record<string, PrefabReviewEntry|string>|null|undefined} reviews

 * @param {string} prefabId

 * @returns {string}

 */

export function getPrefabReviewComment(reviews, prefabId) {

  const id = String(prefabId || '').trim();

  if (!id) return '';

  return normalizeReviewEntry(reviews?.[id])?.comment || '';

}


