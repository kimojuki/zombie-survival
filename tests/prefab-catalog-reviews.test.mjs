import test from 'node:test';

import assert from 'node:assert/strict';

import {

  buildReworkDetails,

  getPrefabReviewComment,

  getPrefabReviewStatus,

  listReworkPrefabs,

  listValidatedPrefabs,

  normalizePrefabReviews,

  setPrefabReview,

  validateReworkComment,

} from '../packages/shared/src/prefab-catalog-reviews.mjs';



test('normalizePrefabReviews — ignore invalid entries + legacy strings', () => {

  assert.deepEqual(normalizePrefabReviews(null), {});

  assert.deepEqual(normalizePrefabReviews({

    a: 'rework',

    b: 'nope',

    c: { status: 'validated' },

    d: { status: 'rework', comment: '  trop plat  ' },

    '': 'rework',

  }), {

    a: { status: 'rework' },

    c: { status: 'validated' },

    d: { status: 'rework', comment: 'trop plat' },

  });

});



test('validateReworkComment', () => {

  assert.equal(validateReworkComment(''), 'Un commentaire est requis pour marquer un prefab à refaire.');

  assert.equal(validateReworkComment('ab'), 'Le commentaire doit contenir au moins 3 caractères.');

  assert.equal(validateReworkComment('abc'), null);

});



test('setPrefabReview — rework exige un commentaire', () => {

  assert.throws(

    () => setPrefabReview({}, 'spawn_prop_sofa', 'rework'),

    /commentaire est requis/,

  );

  const r = setPrefabReview({}, 'spawn_prop_sofa', 'rework', { comment: 'proportions incorrectes' });

  assert.equal(getPrefabReviewStatus(r, 'spawn_prop_sofa'), 'rework');

  assert.equal(getPrefabReviewComment(r, 'spawn_prop_sofa'), 'proportions incorrectes');

});



test('setPrefabReview — set, switch and clear', () => {

  let r = setPrefabReview({}, 'spawn_prop_sofa', 'rework', { comment: 'moche' });

  assert.equal(getPrefabReviewStatus(r, 'spawn_prop_sofa'), 'rework');

  r = setPrefabReview(r, 'spawn_prop_sofa', 'validated');

  assert.equal(getPrefabReviewStatus(r, 'spawn_prop_sofa'), 'validated');

  assert.equal(getPrefabReviewComment(r, 'spawn_prop_sofa'), '');

  r = setPrefabReview(r, 'spawn_prop_sofa', null);

  assert.equal(getPrefabReviewStatus(r, 'spawn_prop_sofa'), null);

});



test('listReworkPrefabs / buildReworkDetails', () => {

  const r = normalizePrefabReviews({

    a: { status: 'rework', comment: 'trop petit' },

    b: 'validated',

    c: { status: 'rework', comment: 'textures' },

  });

  assert.deepEqual(listReworkPrefabs(r), ['a', 'c']);

  assert.deepEqual(listValidatedPrefabs(r), ['b']);

  assert.deepEqual(buildReworkDetails(r), {

    a: { comment: 'trop petit' },

    c: { comment: 'textures' },

  });

});


