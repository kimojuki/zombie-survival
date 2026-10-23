import Database from 'better-sqlite3';
const db = new Database('database/local-dev.sqlite', { readonly: true });
const r = db.prepare("SELECT payload FROM world_decor WHERE id = 'seed_s01:cabin01:shack'").get();
console.log(JSON.parse(r.payload));
db.close();
