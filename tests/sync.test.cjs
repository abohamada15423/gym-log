// Accounts and sync (js/sync.js, js/account.js) against a fake server in memory.
// The fake follows the same rules as private.sync_row() in supabase/migrations/0001_coach_core.sql:
// the newest modified_at wins, a clock ahead of the server is clamped, identical re-sends change nothing,
// and updated_at is the server's own clock. The real database rules are tested in supabase/tests/.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('index.html', 'utf8');

const ME = { id: '11111111-1111-4111-8111-111111111111', email: 'client@example.com' };
const COACH = '22222222-2222-4222-8222-222222222222';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const iso = ms => new Date(ms).toISOString();
const plain = v => JSON.parse(JSON.stringify(v));  // values made inside jsdom come from another realm
const stable = v => v === null || typeof v !== 'object' ? JSON.stringify(v ?? null)
  : Array.isArray(v) ? '[' + v.map(stable).join(',') + ']'
  : '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';

function fakeServer() {
  let clock = Date.now();
  const names = ['workout_sessions', 'food_logs', 'body_checkins', 'habit_days', 'client_settings', 'programs', 'meal_plans', 'comments'];
  const tables = Object.fromEntries(names.map(n => [n, new Map()]));
  const pk = (t, r) => t === 'habit_days' ? r.client_id + '|' + r.date : t === 'client_settings' ? r.client_id + '|' + r.key : r.id;
  const s = {
    tables, offline: false, session: ME, profiles: new Map([[ME.id, { id: ME.id, full_name: 'Sara Ali', role: 'client' }]]),
    links: [], refuse: () => false, requests: 0, pushes: new Map(),
    // the coach writes in the thread (on the coach page)
    coachSays(body, type = 'general', ref = null, id = require('node:crypto').randomUUID()) {
      const now = s.now();
      tables.comments.set(id, { id, client_id: ME.id, author_id: COACH, target_type: type, target_ref: ref, body, read_at: null, deleted_at: null, created_at: now, updated_at: now });
      return id;
    },
    now() { clock = Math.max(clock + 3, Date.now()); return iso(clock); },
    rows(t) { return [...tables[t].values()]; },
    // a write, with the trigger's rules
    write(t, row) {
      const now = s.now(), key = pk(t, row), old = tables[t].get(key);
      const m = row.modified_at && Date.parse(row.modified_at) <= Date.parse(now) ? row.modified_at : now;
      if (!old) { tables[t].set(key, { deleted_at: null, ...row, modified_at: m, created_at: now, updated_at: now }); return; }
      const next = { ...old, ...row, modified_at: m, created_at: old.created_at, updated_at: old.updated_at };
      if (Date.parse(m) < Date.parse(old.modified_at)) return;
      if (stable(next) === stable(old)) return;
      if (Date.parse(m) === Date.parse(old.modified_at)) next.modified_at = now;
      next.updated_at = now;
      tables[t].set(key, next);
    }
  };
  const down = () => ({ data: null, error: { message: 'TypeError: Failed to fetch', code: '' }, status: 0 });
  const json = v => JSON.parse(JSON.stringify(v));
  s.api = {
    user: async () => { if (s.offline) { const e = new Error('offline'); e.net = true; throw e; } return s.session; },
    upsert: async (t, rows) => {
      s.requests++;
      if (s.offline) return down();
      // like Postgres, one bad row fails the whole statement
      if (rows.some(r => s.refuse(t, r))) return { data: null, error: { code: '23514', message: 'new row violates check constraint' }, status: 400 };
      rows.forEach(r => s.write(t, json(r)));
      return { data: null, error: null, status: 201 };
    },
    softDelete: async (t, match, m) => {
      s.requests++;
      if (s.offline) return down();
      s.rows(t).filter(r => Object.keys(match).every(k => r[k] === match[k])).forEach(r => s.write(t, { ...r, deleted_at: m, modified_at: m }));
      return { data: null, error: null, status: 204 };
    },
    pull: async (t, uid, since, from, n, order) => {
      if (s.offline) return down();
      const rows = s.rows(t).filter(r => r.client_id === uid && (!since || Date.parse(r.updated_at) > Date.parse(since)))
        .sort((a, b) => Date.parse(a.updated_at) - Date.parse(b.updated_at) || String(a[order]).localeCompare(String(b[order])));
      return { data: json(rows.slice(from, from + n)), error: null, status: 200 };
    },
    profile: async id => s.offline ? down() : { data: s.profiles.get(id) || null, error: null, status: 200 },
    coachLink: async uid => s.offline ? down() : { data: s.links.filter(l => l.client_id === uid && l.status !== 'archived'), error: null, status: 200 },
    leaveCoach: async (uid, coach) => { s.links.forEach(l => { if (l.client_id === uid && l.coach_id === coach) l.status = 'archived'; }); return { error: null, status: 204 }; },
    rpc: async (name, args) => {
      if (name === 'accept_invite') {
        if (args.p_code !== 'ABCDEFGHJKMN') return { data: null, error: { code: 'P0001', message: 'This code is wrong or has expired' }, status: 400 };
        s.links.push({ coach_id: COACH, client_id: s.session.id, status: 'active' });
        return { data: COACH, error: null, status: 200 };
      }
      if (name === 'delete_my_account') { names.forEach(n => s.rows(n).forEach(r => { if (r.client_id === s.session.id) tables[n].delete(pk(n, r)); })); return { data: null, error: null, status: 204 }; }
      if (name === 'mark_comments_read') {
        if (s.offline) return down();
        s.requests++;
        s.rows('comments').forEach(r => { if (r.client_id === args.p_client && r.author_id !== s.session.id && !r.read_at && (!args.p_ids || args.p_ids.includes(r.id))) { const now = s.now(); tables.comments.set(r.id, { ...r, read_at: now, updated_at: now }); } });
        return { data: 1, error: null, status: 200 };
      }
      return { data: null, error: { code: 'PGRST202', message: 'no such function' }, status: 404 };
    },
    photos: async () => ({ data: [], error: null }),
    removePhotos: async () => ({ data: [], error: null }),
    addComment: async row => {
      s.requests++;
      if (s.offline) return down();
      if (tables.comments.has(row.id)) return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' }, status: 409 };
      const now = s.now();
      tables.comments.set(row.id, { ...json(row), read_at: null, deleted_at: null, created_at: now, updated_at: now });
      return { data: null, error: null, status: 201 };
    },
    removeComment: async id => {
      s.requests++;
      if (s.offline) return down();
      const r = tables.comments.get(id);
      if (r) { const now = s.now(); tables.comments.set(id, { ...r, deleted_at: now, updated_at: now }); }
      return { data: null, error: null, status: 204 };
    },
    savePush: async row => { if (s.offline) return down(); s.pushes.set(row.user_id + '|' + row.endpoint, json(row)); return { data: null, error: null, status: 201 }; },
    dropPush: async (uid, endpoint) => { if (s.offline) return down(); s.pushes.delete(uid + '|' + endpoint); return { data: null, error: null, status: 204 }; }
  };
  return s;
}

function app(t, server, opts = {}) {
  const dom = new JSDOM(html, { url: 'https://example.com/gym-log/' + (opts.query || ''), runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const w = dom.window;
  w.matchMedia = () => ({ matches: true });
  w.requestAnimationFrame = () => 1;
  w.cancelAnimationFrame = () => {};
  w.scrollTo = () => {};
  w.HTMLCanvasElement.prototype.getContext = () => ({});
  w.confirm = () => true;
  if (opts.saved) w.localStorage.setItem('gymlog-v1', JSON.stringify(opts.saved));
  if (opts.sync) w.localStorage.setItem('gymlog-sync-v1', JSON.stringify(opts.sync));
  for (const script of w.document.querySelectorAll('script')) {
    const src = script.getAttribute('src');
    w.eval(src ? fs.readFileSync(src, 'utf8') : script.textContent);
    // swap the network for the fake server before anything starts
    if (src === 'js/sync.js') { w.syncApi = server.api; w.sbReady = () => Promise.resolve({ auth: { signOut: async () => ({ error: null }) } }); }
  }
  const doc = w.document;
  const tick = () => new Promise(r => w.setTimeout(r, 0));
  const settle = async () => {
    for (let i = 0; i < 50; i++) {
      await tick();
      if (w.syncRt.busy) { await w.syncRt.busy; continue; }
      await tick();
      if (!w.syncRt.busy) return;
    }
  };
  const button = text => [...doc.querySelectorAll('button')].find(b => b.textContent === text);
  const click = text => { const b = button(text); assert.ok(b, `Missing button: ${text}`); b.click(); };
  const signIn = async (user = ME) => { w.syncAuthEvent('SIGNED_IN', { user }); await settle(); };
  const local = () => JSON.parse(w.localStorage.getItem('gymlog-v1'));
  const meta = () => JSON.parse(w.localStorage.getItem('gymlog-sync-v1'));
  return { w, doc, tick, settle, click, button, signIn, local, meta, status: () => doc.getElementById('status').textContent };
}

const OLD_PHONE = {
  sessions: [
    { id: '1730000000000abcd', date: '2026-11-01', day: 'push', dayName: 'Push', prog: 'split4', sets: { 'Overhead press': [[40, 8]], 'Bench press': [[80, 6], [80, 6]] }, note: 'felt strong' },
    { id: '1730000000001efgh', date: '2026-11-03', day: 'pull', dayName: 'Pull', prog: 'split4', sets: { 'Pull-ups': [[0, 10]] } }
  ],
  food: [{ id: '1730000000002ijkl', date: '2026-11-03', name: 'Tuna Can (Drained)', kcal: 150, p: 32 }],
  body: [{ date: '2026-10-05', kg: 90.6, waist: null, fat: 25.2, note: 'InBody' }],
  habits: { '2026-11-03': { creatine: true, water: 2.5 } },
  goals: { kg: 84 }
};

test('signing in on a phone with data asks first; adding it uploads it all, old ids becoming stable uuids', async t => {
  const server = fakeServer(), a = app(t, server, { saved: OLD_PHONE });
  await a.signIn();
  assert.equal(a.doc.getElementById('modal').hidden, false);
  assert.match(a.doc.getElementById('mbox').textContent, /This phone already has:2 workouts1 food1 check-in1 day of habits/);
  assert.equal(server.rows('workout_sessions').length, 0, 'nothing leaves the phone before the answer');
  a.click('Add to my account');
  await a.settle();

  const s = server.rows('workout_sessions');
  assert.equal(s.length, 2);
  assert.ok(s.every(r => UUID.test(r.id) && r.client_id === ME.id && r.modified_at === '2000-01-01T00:00:00.000Z'));
  assert.equal(s.find(r => r.date === '2026-11-01').id, a.w.uuidFrom(ME.id + '|sessions|1730000000000abcd'));
  assert.deepEqual(s.find(r => r.date === '2026-11-01').sets, { 'Overhead press': [[40, 8]], 'Bench press': [[80, 6], [80, 6]] });
  assert.equal(s.find(r => r.date === '2026-11-01').note, 'felt strong');
  assert.equal(server.rows('food_logs')[0].name, 'Tuna Can (Drained)');
  assert.equal(server.rows('body_checkins')[0].kg, 90.6);
  assert.equal(server.rows('body_checkins')[0].note, 'InBody');
  assert.deepEqual(server.rows('habit_days')[0].data, { creatine: true, water: 2.5 });
  assert.deepEqual(server.rows('client_settings').map(r => [r.key, r.value]), [['goals', { kg: 84 }]]);
  // the phone keeps the same records under their new ids
  assert.deepEqual(a.local().sessions.map(x => x.id), s.map(r => r.id).sort((x, y) => s.find(r => r.id === x).date < s.find(r => r.id === y).date ? -1 : 1));
  assert.equal(Object.keys(a.meta().outbox).length, 0);
  assert.equal(a.status(), 'Saved online ✓');
  assert.equal(a.doc.getElementById('acct').textContent, 'SA');
});

test('the same old data on a second phone becomes the same rows, and never undoes a newer edit', async t => {
  const server = fakeServer();
  const a = app(t, server, { saved: OLD_PHONE });
  await a.signIn(); a.click('Add to my account'); await a.settle();
  // later, phone A changes a set: a real edit, newer than the old data
  const row = server.rows('workout_sessions').find(r => r.date === '2026-11-03');
  server.write('workout_sessions', { ...row, sets: { 'Pull-ups': [[0, 12]] }, modified_at: iso(Date.now() - 1000) });

  const b = app(t, server, { saved: OLD_PHONE });
  await b.signIn(); b.click('Add to my account'); await b.settle();
  assert.equal(server.rows('workout_sessions').length, 2, 'no copies');
  assert.equal(server.rows('body_checkins').length, 1);
  assert.deepEqual(server.rows('workout_sessions').find(r => r.date === '2026-11-03').sets, { 'Pull-ups': [[0, 12]] });
  assert.deepEqual(b.local().sessions.find(x => x.date === '2026-11-03').sets, { 'Pull-ups': [[0, 12]] }, 'phone B takes the newer edit');
});

test('new, edited and removed records upload; offline changes wait and go up when the connection is back', async t => {
  const server = fakeServer(), a = app(t, server);
  await a.signIn();
  assert.equal(a.doc.getElementById('modal').hidden, true, 'an empty phone has nothing to ask about');
  a.doc.getElementById('t-meals').click();
  a.click('+ Tuna Can (Drained) (32g P)');
  assert.equal(a.status(), 'Saved on this phone ✓');
  await a.w.syncNow(); await a.settle();
  assert.equal(server.rows('food_logs').length, 1);
  assert.ok(UUID.test(server.rows('food_logs')[0].id));
  assert.equal(a.status(), 'Saved online ✓');

  server.offline = true;
  a.click('Remove');
  await a.w.syncNow(); await a.settle();
  assert.equal(a.status(), 'Offline · will upload later');
  assert.equal(Object.values(a.meta().outbox).filter(e => e.del).length, 1);
  assert.equal(server.rows('food_logs')[0].deleted_at, null);

  server.offline = false;
  a.w.dispatchEvent(new a.w.Event('online'));
  await a.settle();
  assert.ok(server.rows('food_logs')[0].deleted_at, 'soft-deleted, so other phones hear about it');
  assert.equal(Object.keys(a.meta().outbox).length, 0);
  assert.equal(a.status(), 'Saved online ✓');
});

test("other phones' changes arrive; on a conflict the newer edit wins, whichever side it is on", async t => {
  const server = fakeServer(), a = app(t, server);
  await a.signIn();
  const id = '33333333-3333-4333-8333-333333333333';
  server.write('workout_sessions', { id, client_id: ME.id, date: '2026-11-20', day_id: 'legs', day_name: 'Legs', program_id: 'split4', sets: { 'Leg press': [[100, 10]], Squat: [[100, 5]] }, notes: null, note: null, modified_at: iso(Date.now() - 60000) });
  await a.w.syncNow({ pull: true }); await a.settle();
  const got = a.local().sessions.find(s => s.id === id);
  assert.deepEqual(Object.keys(got.sets), ['Squat', 'Leg press'], "exercises come back in the day's order");
  assert.equal(got.dayName, 'Legs');

  // the phone edits offline; then another phone makes a newer edit: the newer one wins
  server.offline = true;
  a.w.state.sessions.find(s => s.id === id).note = 'from this phone';
  a.w.save(); await a.w.syncNow(); await a.settle();
  const key = 'workout_sessions:' + id;
  a.w.sync.outbox[key].m = iso(Date.now() - 30000);
  server.offline = false;
  server.write('workout_sessions', { ...server.rows('workout_sessions')[0], note: 'from the other phone', modified_at: iso(Date.now() - 10000) });
  await a.w.syncNow({ pull: true }); await a.settle();
  assert.equal(a.local().sessions.find(s => s.id === id).note, 'from the other phone');
  assert.equal(a.meta().outbox[key], undefined);

  // and the other way round: this phone's edit is the newer one, so it survives the pull and uploads
  server.write('workout_sessions', { ...server.rows('workout_sessions')[0], note: 'older edit', modified_at: iso(Date.now() - 5000) });
  a.w.state.sessions.find(s => s.id === id).note = 'newest, from this phone';
  a.w.save(); await a.w.syncNow({ pull: true }); await a.settle();
  assert.equal(a.local().sessions.find(s => s.id === id).note, 'newest, from this phone');
  assert.equal(server.rows('workout_sessions')[0].note, 'newest, from this phone');

  // a delete from another phone removes it here too
  server.write('workout_sessions', { ...server.rows('workout_sessions')[0], deleted_at: iso(Date.now()), modified_at: iso(Date.now()) });
  await a.w.syncNow({ pull: true }); await a.settle();
  assert.equal(a.local().sessions.find(s => s.id === id), undefined);
});

test('a row saved just behind the pull cursor still arrives (five-minute overlap)', async t => {
  const server = fakeServer(), a = app(t, server);
  await a.signIn();
  server.write('food_logs', { id: '44444444-4444-4444-8444-444444444444', client_id: ME.id, date: '2026-11-20', name: 'Rice', kcal: 200, p: 4, c: 44, f: null, modified_at: iso(Date.now() - 1000) });
  await a.w.syncNow({ pull: true }); await a.settle();
  const cursor = a.meta().cursor.food_logs;
  assert.ok(cursor);
  // a transaction that started earlier commits now, with an updated_at before the cursor
  server.tables.food_logs.set('late', { id: '55555555-5555-4555-8555-555555555555', client_id: ME.id, date: '2026-11-20', name: 'Late eggs', kcal: 215, p: 18, c: null, f: null, modified_at: iso(Date.now() - 1000), created_at: cursor, updated_at: iso(Date.parse(cursor) - 120000), deleted_at: null });
  await a.w.syncNow({ pull: true }); await a.settle();
  assert.deepEqual(a.local().food.map(f => f.name).sort(), ['Late eggs', 'Rice']);
  assert.equal(a.local().food.find(f => f.name === 'Rice').c, 44);
});

test('settings sync one by one and habits day by day, so two phones editing different things both keep theirs', async t => {
  const server = fakeServer(), a = app(t, server);
  await a.signIn();
  a.w.state.goals.protein = 170; a.w.save();
  server.write('client_settings', { client_id: ME.id, key: 'my_foods', value: [{ name: 'Oats', kcal: 300, p: 10 }], modified_at: iso(Date.now() - 1000) });
  await a.w.syncNow({ pull: true }); await a.settle();
  assert.deepEqual(a.local().myFoods, [{ name: 'Oats', kcal: 300, p: 10 }]);
  assert.deepEqual(server.rows('client_settings').find(r => r.key === 'goals').value, { protein: 170 });
  assert.equal(server.rows('client_settings').find(r => r.key === 'my_foods').value.length, 1, 'the goals upload did not touch My Foods');

  a.doc.getElementById('t-train').click();
  [...a.doc.querySelectorAll('.qbar button')][0].click();  // tick today's first habit
  await a.w.syncNow(); await a.settle();
  const day = server.rows('habit_days')[0];
  assert.equal(day.date, a.w.today());
  assert.equal(Object.values(day.data).filter(Boolean).length, 1);
});

test('a record the server refuses is set aside and does not hold up the others', async t => {
  const server = fakeServer(), a = app(t, server);
  await a.signIn();
  server.refuse = (t, r) => t === 'food_logs' && r.name === 'Broken';
  ['Eggs', 'Broken', 'Rice'].forEach(name => a.w.state.food.push({ id: a.w.rid(), date: '2026-11-20', name, kcal: 100, p: 5 }));
  a.w.save(); await a.w.syncNow(); await a.settle();
  assert.deepEqual(server.rows('food_logs').map(r => r.name).sort(), ['Eggs', 'Rice']);
  assert.equal(Object.keys(a.meta().rejected).length, 1);
  assert.equal(Object.keys(a.meta().outbox).length, 0);
  a.doc.getElementById('t-plan').click();
  assert.match(a.doc.getElementById('acct-card').textContent, /1 item couldn't upload/);
});

test('keeping the phone data on the phone uploads none of it, until asked later', async t => {
  const server = fakeServer(), a = app(t, server, { saved: OLD_PHONE });
  await a.signIn();
  a.click('Keep it on this phone only');
  await a.settle();
  assert.equal(server.rows('workout_sessions').length + server.rows('food_logs').length + server.rows('body_checkins').length, 0);
  a.w.state.sessions[0].note = 'edited, still only here'; a.w.save();
  await a.w.syncNow(); await a.settle();
  assert.equal(server.rows('workout_sessions').length, 0);
  a.doc.getElementById('acct').click();
  a.click("Add this phone's data to my account");
  await a.settle();
  assert.equal(server.rows('workout_sessions').length, 2);
  assert.equal(server.rows('workout_sessions').find(r => r.date === '2026-11-01').note, 'edited, still only here');
});

test("a coach's program and meal plan become the active program and the daily targets", async t => {
  const server = fakeServer(), a = app(t, server);
  await a.signIn();
  server.links.push({ coach_id: COACH, client_id: ME.id, status: 'active' });
  server.profiles.set(COACH, { id: COACH, full_name: 'Ahmed Hassan', role: 'coach' });
  server.write('programs', { id: '66666666-6666-4666-8666-666666666666', coach_id: COACH, client_id: ME.id, name: 'Cut phase', active: true, deleted_at: null, modified_at: iso(Date.now() - 1000),
    days: [{ id: 'a', name: 'Heavy day', ex: [['Squat', 5, '5'], ['Bench press'], ['Made-up move', 99, '', '', 1]] }, { name: 'Light day', ex: [['Plank', 3, '45s']] }, 'junk'] });
  server.write('meal_plans', { id: '77777777-7777-4777-8777-777777777777', coach_id: COACH, client_id: ME.id, name: 'Cut', active: true, deleted_at: null, modified_at: iso(Date.now() - 1000), targets: { kcal: 2100, protein: 190, carbs: 'lots' }, meals: [] });
  await a.w.syncNow({ pull: true }); await a.settle();

  assert.equal(a.local().programId, 'coach');
  assert.deepEqual(plain(a.w.DAYS.map(d => [d.id, d.name])), [['a', 'Heavy day'], ['d2', 'Light day']]);
  assert.deepEqual(plain(a.w.DAYS[0].ex[0]), ['Squat', 5, '5', 'Quads · Glutes', 150]);
  assert.deepEqual(plain(a.w.DAYS[0].ex[2]), ['Made-up move', 3, '10', '', 90], 'odd values fall back to safe ones');
  assert.equal(a.w.goals().kcal, 2100);
  assert.equal(a.w.goals().protein, 190);
  assert.equal(a.doc.getElementById('coach-name').textContent, 'Coach Ahmed Hassan');
  assert.equal(a.doc.getElementById('acct').textContent, 'AH');

  a.doc.getElementById('t-plan').click();
  const kcal = a.doc.querySelector('input[aria-label^="Daily calories"]');
  assert.equal(kcal.disabled, true);
  assert.match(kcal.parentElement.textContent, /Set by your coach/);
  assert.match(a.doc.querySelector('.prog.active').textContent, /Cut phase.*From Coach Ahmed Hassan/);

  // the coach switches the program off: back to a built-in one
  server.write('programs', { ...server.rows('programs')[0], active: false, modified_at: iso(Date.now()) });
  await a.w.syncNow({ pull: true }); await a.settle();
  assert.equal(a.local().programId, 'split4');
});

test('a backup opened on a signed-in phone is added to the account; nothing in it is deleted', async t => {
  const server = fakeServer(), a = app(t, server, { saved: OLD_PHONE });
  await a.signIn(); a.click('Add to my account'); await a.settle();
  const backup = { sessions: [{ ...OLD_PHONE.sessions[0], note: 'from the backup' }, { id: 'new1', date: '2026-11-10', day: 'legs', sets: { Squat: [[90, 5]] } }], body: [] };
  a.doc.getElementById('t-plan').click();
  const file = a.doc.querySelector('input[type=file]');
  Object.defineProperty(file, 'files', { value: [new a.w.File([JSON.stringify(backup)], 'b.json')] });
  file.dispatchEvent(new a.w.Event('change'));
  for (let i = 0; i < 20 && a.local().sessions.length < 3; i++) await a.tick();
  await a.w.syncNow(); await a.settle();
  const rows = server.rows('workout_sessions');
  assert.equal(rows.length, 3);
  assert.ok(rows.every(r => !r.deleted_at), 'what the backup lacks is not deleted');
  assert.equal(rows.find(r => r.date === '2026-11-01').note, 'from the backup');
  assert.equal(server.rows('body_checkins')[0].deleted_at, null);
});

test('joining a coach with a code, from the account sheet or an invite link', async t => {
  const server = fakeServer(), a = app(t, server, { query: '?invite=abcd-efgh-jkmn' });
  assert.equal(a.w.location.search, '', 'the code is taken out of the address');
  assert.match(a.doc.getElementById('mbox').textContent, /Your coach invited you/);
  server.profiles.set(COACH, { id: COACH, full_name: 'Ahmed Hassan', role: 'coach' });
  await a.signIn();
  const code = a.doc.querySelector('#mbox input.code-in');
  assert.equal(code.value, 'ABCDEFGHJKMN');
  code.value = 'WRONGCODE234';
  a.click('Join');
  await a.settle();
  assert.equal(a.doc.querySelector('#mbox .form-err').textContent, 'This code is wrong or has expired');
  code.value = 'ABCDEFGHJKMN';
  a.click('Join');
  await a.settle();
  assert.equal(a.w.sync.coach.name, 'Ahmed Hassan');
  assert.equal(a.w.sync.invite, null);
  assert.equal(a.doc.getElementById('coach-name').textContent, 'Coach Ahmed Hassan');
});

test('signing out can clear the phone without deleting anything on the server; deleting the account removes it', async t => {
  const server = fakeServer(), a = app(t, server, { saved: OLD_PHONE });
  await a.signIn(); a.click('Add to my account'); await a.settle();
  a.doc.getElementById('acct').click();
  a.click('Sign out');
  assert.equal(a.doc.querySelector('#mbox input[type=checkbox]').checked, true, 'nothing waiting to upload: clearing is the default');
  a.click('Sign out');
  await a.settle();
  assert.equal(a.local().sessions.length, 0);
  assert.equal(a.meta().uid, null);
  assert.equal(server.rows('workout_sessions').length, 2);
  assert.equal(a.doc.getElementById('acct').getAttribute('aria-label'), 'Sign in');

  const b = app(t, server);
  await b.signIn();
  assert.equal(b.local().sessions.length, 2, 'signing back in brings it all back');
  b.doc.getElementById('acct').click();
  b.click('Delete account');
  assert.equal(b.button('Delete my account').disabled, true);
  b.doc.querySelector('#mbox input[type=checkbox]').click();
  b.click('Delete my account');
  await b.settle();
  assert.equal(server.rows('workout_sessions').length, 0);
  assert.equal(b.local().sessions.length, 0);
  assert.equal(b.meta().uid, null);
});

test('the account screens are translated to Arabic', async t => {
  const server = fakeServer(), a = app(t, server, { saved: { sessions: [], lang: 'ar' } });
  // text that is not translated on purpose: names, emails, the example address
  const english = () => [...a.doc.querySelectorAll('#mbox *')].filter(e => e.children.length === 0 && /[A-Za-z]{3}/.test(e.textContent) && !e.closest('[translate=no]')).map(e => e.textContent);
  a.doc.getElementById('acct').click(); await a.tick();
  assert.deepEqual(english(), []);
  a.click('إنشاء حساب'); await a.tick();
  assert.deepEqual(english(), []);
  a.doc.getElementById('t-plan').click(); await a.tick();
  assert.doesNotMatch(a.doc.getElementById('acct-card').textContent, /[A-Za-z]{3}/);
  await a.signIn();
  a.doc.getElementById('acct').click(); await a.tick();
  assert.deepEqual(english(), []);
  assert.doesNotMatch(a.status(), /[A-Za-z]{3}/);
  for (const view of ['upload', 'signout', 'del', 'join', 'checkmail', 'forgot', 'resetsent', 'newpass']) {
    a.w.openAccount(view, { email: 'x@example.com', code: 'ABCDEFGHJKMN', counts: { sessions: 3, food: 1, body: 2, habits: 5, total: 11 } }); await a.tick();
    assert.deepEqual(english().filter(t => !/x@example\.com/.test(t)), [], view);
  }
});

test('a coach account gets a link to the coach dashboard instead of a join form', async t => {
  const server = fakeServer(), a = app(t, server);
  server.profiles.set(ME.id, { id: ME.id, full_name: 'Karim Mostafa', role: 'coach' });
  await a.signIn();
  a.doc.getElementById('acct').click();
  const link = [...a.doc.querySelectorAll('#mbox a')].find(x => x.textContent === 'Open the coach dashboard');
  assert.ok(link);
  assert.equal(link.getAttribute('href'), 'coach.html');
  assert.equal(a.doc.querySelector('#mbox input.code-in'), null);
});

test("the coach's program shows on the Train tab and their meals on Meals; changes are announced", async t => {
  const server = fakeServer(), a = app(t, server, { saved: { sessions: [], custom: { name: 'My Program', days: [{ id: 'm1', tag: 'Day 1', name: 'Mine', ex: [['Squat', 3, '5', 'Quads · Glutes', 150]] }] }, programId: 'custom' } });
  await a.signIn();
  server.links.push({ coach_id: COACH, client_id: ME.id, status: 'active' });
  server.profiles.set(COACH, { id: COACH, full_name: 'Ahmed Hassan', role: 'coach' });
  const prog = { id: '88888888-8888-4888-8888-888888888888', coach_id: COACH, client_id: ME.id, name: 'Strength block', active: true, deleted_at: null, modified_at: iso(Date.now() - 2000),
    days: [{ id: 'a', name: 'Heavy legs', ex: [['Squat', 5, '5']] }] };
  server.write('programs', prog);
  server.write('meal_plans', { id: '99999999-9999-4999-8999-999999999999', coach_id: COACH, client_id: ME.id, name: 'Cut', active: true, deleted_at: null, modified_at: iso(Date.now() - 2000),
    targets: { kcal: 2100, protein: 180 }, meals: [{ name: 'Breakfast', items: ['4 eggs', 'Oats'], kcal: 600, p: 40 }] });
  await a.w.syncNow({ pull: true }); await a.settle();
  assert.match(a.doc.getElementById('toast').textContent, /New program from your coach: Strength block · New meal plan from your coach: Cut/);
  a.doc.getElementById('t-train').click();
  assert.match(a.doc.querySelector('.coach-prog').textContent, /Program from Coach Ahmed Hassan.*Strength block/);
  a.doc.getElementById('t-meals').click();
  const meals = a.doc.querySelector('.coach-meals');
  assert.match(meals.textContent, /Cut.*Breakfast.*600 kcal.*4 eggs.*Oats/);
  assert.ok(!a.button('+ Breakfast (52g P)'), "the app's own meal presets make way");
  meals.querySelector('button').click();
  const logged = a.local().food.at(-1);
  assert.deepEqual([logged.name, logged.kcal, logged.p], ['Breakfast', 600, 40]);
  assert.match(a.doc.querySelector('.rings').textContent, /of 2100.*of 180/);

  // in Arabic too
  a.w.state.lang = 'ar'; a.w.applyLang(); a.w.render(); await a.tick();
  assert.doesNotMatch(a.doc.querySelector('.coach-meals').textContent.replace(/Cut|Breakfast|4 eggs|Oats/g, ''), /[A-Za-z]{3}/);
  a.doc.getElementById('t-train').click(); await a.tick();
  assert.match(a.doc.querySelector('.coach-prog').textContent, /برنامج من الكابتن Ahmed Hassan/);
  a.w.state.lang = 'en'; a.w.applyLang(); a.w.render(); await a.tick();
  // the coach edits the same program: announced, and the days change
  server.write('programs', { ...server.rows('programs')[0], days: [{ id: 'a', name: 'Heavy legs', ex: [['Squat', 5, '3']] }], modified_at: iso(Date.now() - 1000) });
  await a.w.syncNow({ pull: true }); await a.settle();
  assert.equal(a.doc.getElementById('toast').textContent, 'Your coach updated your program');
  assert.equal(a.w.DAYS[0].ex[0][2], '3');
  // the coach stops it: back to the client's own program
  server.write('programs', { ...server.rows('programs')[0], active: false, modified_at: iso(Date.now()) });
  await a.w.syncNow({ pull: true }); await a.settle();
  assert.equal(a.local().programId, 'custom');
  assert.equal(a.w.DAYS[0].name, 'Mine');
});

test('the bundled Supabase library is the version package.json pins', () => {
  const pin = require('../package.json').devDependencies['@supabase/supabase-js'];
  const head = fs.readFileSync('js/vendor/supabase.js', 'utf8').slice(0, 200);
  assert.match(head, new RegExp('supabase-js ' + pin.replace(/\./g, '\\.') + ' '));
});

// ---- phase 4: comments with the coach, notifications and reminders ----------------------------
async function coached(t, saved) {
  const server = fakeServer(), a = app(t, server, { saved: saved || { sessions: [] } });
  server.links.push({ coach_id: COACH, client_id: ME.id, status: 'active' });
  server.profiles.set(COACH, { id: COACH, full_name: 'Ahmed Hassan', role: 'coach' });
  await a.signIn();
  // a phone with data asks first: add it to the account
  if (a.w.sync.ask) { a.w.closeModal(); a.w.syncAdopt(true); await a.settle(); }
  return { server, a };
}
const WORKOUT = { id: '77777777-7777-4777-8777-777777777777', date: '2026-11-23', day: 'push', dayName: 'Push', prog: 'split4', sets: { 'Bench press': [[60, 8]] } };

test("the coach's comments arrive with a dot and a message; reading them sends a receipt; a reply stays about the same workout", async t => {
  const { server, a } = await coached(t, { sessions: [WORKOUT] });
  const onWorkout = server.coachSays('Great bench. Add 2.5 kg next week.', 'session', WORKOUT.id);
  server.coachSays('How did the week go?');
  await a.w.syncNow({ pull: true }); await a.settle();
  const name = a.doc.getElementById('coach-name');
  assert.ok(name.classList.contains('unread'), 'a lime dot on the coach name');
  assert.equal(name.getAttribute('aria-label'), 'Comments · 2 new');
  assert.match(a.doc.getElementById('toast').textContent, /^2 new comments from your coach/);
  assert.ok(a.doc.querySelector('#toast .toast-act'), 'with a way to open them');

  name.click();
  const thread = a.doc.querySelector('#mbox .cm-thread');
  assert.match(thread.textContent, /Coach Ahmed Hassan.*Push · Mon 23 Nov.*Great bench.*How did the week go\?/);
  await new Promise(r => a.w.setTimeout(r, 900)); await a.settle();
  assert.ok(server.rows('comments').every(c => c.read_at), 'the receipt reached the server');
  assert.ok(!name.classList.contains('unread'), 'and the dot is gone');

  [...thread.querySelectorAll('.cm.theirs')].find(n => /Great bench/.test(n.textContent)).querySelector('button').click();
  assert.match(thread.querySelector('.cm-to').textContent, /About Push · Mon 23 Nov/);
  thread.querySelector('textarea').value = 'Thanks, will do!';
  thread.querySelector('form').dispatchEvent(new a.w.Event('submit', { cancelable: true }));
  await a.settle();
  const mine = server.rows('comments').find(c => c.author_id === ME.id);
  assert.deepEqual([mine.body, mine.target_type, mine.target_ref], ['Thanks, will do!', 'session', WORKOUT.id]);
  assert.ok(thread.querySelector('.cm-to').hidden, 'the next comment is about nothing in particular again');
  assert.ok(onWorkout);
});

test('comments written offline wait and go up when the connection is back; you can delete your own', async t => {
  const { server, a } = await coached(t);
  server.offline = true;
  await a.w.syncSendComment('general', null, 'Written with no signal at the gym');
  await a.settle();
  assert.equal(server.rows('comments').length, 0);
  assert.equal(a.w.syncPending(), 1, 'it counts as waiting to upload');
  a.doc.getElementById('coach-name').click();
  assert.match(a.doc.querySelector('#mbox .cm-thread').textContent, /Sending…/);
  server.offline = false;
  a.w.dispatchEvent(new a.w.Event('online'));
  await a.settle();
  assert.deepEqual(server.rows('comments').map(c => c.body), ['Written with no signal at the gym']);
  assert.equal(a.w.syncPending(), 0);
  // a resend after a lost answer is not a second comment
  const id = server.rows('comments')[0].id;
  assert.equal((await server.api.addComment({ id, client_id: ME.id, author_id: ME.id, target_type: 'general', target_ref: null, body: 'x' })).error.code, '23505');
  await a.w.syncRemoveComment(id); await a.settle();
  assert.ok(server.rows('comments')[0].deleted_at, 'deleted for the coach too');
  assert.equal(a.w.syncCommentList().length, 0);
});

test('comments show where they belong: a workout in the history, a day of meals, a check-in', async t => {
  const checkin = { id: '66666666-6666-4666-8666-666666666666', date: '2026-11-22', kg: 72.9, waist: 79.5, note: '' };
  const { server, a } = await coached(t, { sessions: [WORKOUT], body: [checkin] });
  server.coachSays('Great bench.', 'session', WORKOUT.id);
  server.coachSays('Waist is going down, nice.', 'checkin', checkin.id);
  await a.w.syncNow({ pull: true }); await a.settle();
  a.w.closeModal();
  a.w.openHistoryModal(WORKOUT.id);
  const hist = a.doc.querySelector('#mbox details.hist');
  assert.match(hist.querySelector('summary').textContent, /1 comment/);
  assert.match(hist.querySelector('.cm-block').textContent, /Great bench\..*Reply/);
  a.w.closeModal();
  a.doc.getElementById('t-body').click();
  assert.match(a.doc.querySelector('.item-cm').textContent, /Waist is going down, nice\./);
  a.doc.getElementById('t-meals').click();
  const tail = a.doc.querySelector('.cm-tail');
  assert.equal(tail.querySelector('.cm-open').textContent, "Comment on this day's meals");
  tail.querySelector('.cm-open').click();
  tail.querySelector('textarea').value = 'Ate out tonight';
  tail.querySelector('form').dispatchEvent(new a.w.Event('submit', { cancelable: true }));
  await a.settle();
  const said = server.rows('comments').find(c => c.author_id === ME.id);
  assert.deepEqual([said.target_type, said.target_ref], ['food_day', a.w.foodDate]);
  // without a coach and without comments, none of this shows
  const b = app(t, fakeServer(), { saved: { sessions: [WORKOUT] } });
  await b.signIn();
  b.w.openHistoryModal(WORKOUT.id);
  assert.equal(b.doc.querySelector('#mbox .cm-block'), null);
  assert.equal(b.doc.getElementById('coach-name').hidden, true);
});

// A browser with notifications, enough for push.js: permission given, a service worker, a push subscription.
function fakeBrowserPush(w) {
  let sub = null;
  w.Notification = { permission: 'default', requestPermission: async () => { w.Notification.permission = 'granted'; return 'granted'; } };
  w.PushManager = function () { };
  const pushManager = {
    getSubscription: async () => sub,
    subscribe: async () => {
      const j = { endpoint: 'https://fcm.googleapis.com/fcm/send/phone-1', keys: { p256dh: 'B' + 'A'.repeat(86), auth: 'C'.repeat(22) } };
      sub = { endpoint: j.endpoint, options: {}, toJSON: () => j, unsubscribe: async () => { sub = null; return true; } };
      return sub;
    }
  };
  const reg = { pushManager };
  Object.defineProperty(w.navigator, 'serviceWorker', { configurable: true, value: { register: async () => reg, ready: Promise.resolve(reg), getRegistration: async () => reg, addEventListener: () => {} } });
}

test('notifications on this phone are saved for the account; reminders sync with the time zone and the next workout', async t => {
  const { server, a } = await coached(t, { sessions: [{ ...WORKOUT, date: '2026-11-20' }] });
  fakeBrowserPush(a.w);
  a.doc.getElementById('t-plan').click();
  const card = a.doc.querySelector('.notif-card');
  const pill = text => [...card.querySelectorAll('button')].find(b => b.textContent.startsWith(text));
  pill('Notifications on this phone').click();
  await a.settle();
  assert.deepEqual([...server.pushes.values()].map(r => [r.user_id, r.endpoint, r.lang]), [[ME.id, 'https://fcm.googleapis.com/fcm/send/phone-1', 'en']]);
  assert.equal(a.doc.getElementById('toast').textContent, 'Notifications on ✓');
  const card2 = a.doc.querySelector('.notif-card');
  [...card2.querySelectorAll('button')].find(b => b.textContent.startsWith('Remind me on training days')).click();
  const days = [...a.doc.querySelectorAll('.rem-days button')];
  assert.deepEqual(days.map(b => b.textContent), ['Sa', 'Su', 'Mo', 'Tu', 'We', 'Th', 'Fr']);
  assert.deepEqual(days.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.getAttribute('aria-label')), ['Friday'], 'first guess: the days they trained lately');
  days[2].click();  // and Monday
  const time = a.doc.querySelector('.rem-time input');
  time.value = '18:30'; time.dispatchEvent(new a.w.Event('change'));
  await new Promise(r => a.w.setTimeout(r, 1300)); await a.settle();
  const rem = server.rows('client_settings').find(r => r.key === 'reminder').value;
  assert.deepEqual([rem.on, rem.days, rem.time, rem.next], [true, [1, 5], '18:30', 'Pull']);
  assert.ok(rem.tz, 'with the phone time zone');
  // switching off this phone forgets its subscription on the server
  [...a.doc.querySelectorAll('.notif-card button')].find(b => b.textContent.startsWith('Notifications on this phone')).click();
  await a.settle();
  assert.equal(server.pushes.size, 0);
  // and signing out forgets it too
  a.doc.querySelector('.notif-card button').click(); await a.settle();
  assert.equal(server.pushes.size, 1);
  await a.w.syncSignOut(false); await a.settle();
  assert.equal(server.pushes.size, 0);
});

test('comments and notifications are in Arabic when the app is', async t => {
  const { server, a } = await coached(t, { sessions: [WORKOUT], lang: 'ar' });
  server.coachSays('Great bench.', 'session', WORKOUT.id);
  await a.w.syncNow({ pull: true }); await a.settle();
  assert.match(a.doc.getElementById('toast').textContent, /تعليق جديد من الكابتن/);
  a.doc.getElementById('coach-name').click(); await a.tick();
  const english = root => [...root.querySelectorAll('*')].filter(n => !n.children.length && /[A-Za-z]{2}/.test(n.textContent) && !/[؀-ۿ]/.test(n.textContent) && !n.closest('[translate=no]')).map(n => n.textContent);
  assert.deepEqual(english(a.doc.getElementById('mbox')), []);
  assert.equal(a.doc.querySelector('#mbox .cm-body').getAttribute('dir'), 'auto', 'what people wrote keeps its own direction');
  a.w.closeModal();
  fakeBrowserPush(a.w);
  a.doc.getElementById('t-plan').click(); await a.tick();
  assert.deepEqual(english(a.doc.querySelector('.notif-card')), []);
});
