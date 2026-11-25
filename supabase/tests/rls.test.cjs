// Database tests: run the real migrations on a throwaway local Postgres, with a small stand-in for
// Supabase's auth and storage schemas (supabase_stub.sql), and check every permission rule in
// docs/coach-plan.md section 4 with real users.
//
//   npm run test:db
//
// Needs PostgreSQL 14+ installed (initdb, pg_ctl). Set PG_BIN to its bin folder if it isn't found.
// The tests skip, with a message, when Postgres isn't available.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');

const ROOT = path.resolve(__dirname, '..', '..');
const MIGRATIONS = path.join(ROOT, 'supabase', 'migrations');

function findPgBin() {
  const candidates = [];
  if (process.env.PG_BIN) candidates.push(process.env.PG_BIN);
  const cfg = spawnSync('pg_config', ['--bindir'], { encoding: 'utf8' });
  if (cfg.status === 0) candidates.push(cfg.stdout.trim());
  const base = '/usr/lib/postgresql';
  if (fs.existsSync(base)) {
    fs.readdirSync(base).sort((a, b) => Number(b) - Number(a)).forEach(v => candidates.push(path.join(base, v, 'bin')));
  }
  return candidates.find(dir => fs.existsSync(path.join(dir, 'initdb')) && fs.existsSync(path.join(dir, 'pg_ctl'))) || null;
}

const PG_BIN = findPgBin();
// CI sets REQUIRE_PG=1 so a missing Postgres fails the run instead of quietly skipping it.
if (!PG_BIN && process.env.REQUIRE_PG) throw new Error('PostgreSQL not found and REQUIRE_PG is set (set PG_BIN to its bin folder)');
const dbTest = PG_BIN ? test : test.skip;
if (!PG_BIN) console.log('# PostgreSQL not found: database tests skipped (set PG_BIN to run them)');

// initdb refuses to run as root, so when we are root the server runs as the postgres user.
const AS_ROOT = typeof process.getuid === 'function' && process.getuid() === 0;
function pgRun(cmd, args) {
  const exe = path.join(PG_BIN, cmd);
  const r = AS_ROOT
    ? spawnSync('runuser', ['-u', 'postgres', '--', exe, ...args], { encoding: 'utf8' })
    : spawnSync(exe, args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`${cmd} failed:\n${r.stdout}\n${r.stderr}`);
  return r.stdout;
}

let dir, data, db;
const port = 20000 + Math.floor(Math.random() * 20000);

before(async () => {
  if (!PG_BIN) return;
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gymlog-pg-'));
  data = path.join(dir, 'data');
  if (AS_ROOT) {
    const uid = Number(spawnSync('id', ['-u', 'postgres'], { encoding: 'utf8' }).stdout);
    const gid = Number(spawnSync('id', ['-g', 'postgres'], { encoding: 'utf8' }).stdout);
    fs.chownSync(dir, uid, gid);
  }
  pgRun('initdb', ['-D', data, '-U', 'postgres', '-A', 'trust', '-E', 'UTF8', '--no-sync']);
  pgRun('pg_ctl', ['-D', data, '-l', path.join(dir, 'server.log'), '-w', '-o',
    `-p ${port} -k ${dir} -c listen_addresses='' -c fsync=off`, 'start']);
  db = new Client({ host: dir, port, user: 'postgres', database: 'postgres' });
  await db.connect();
  await db.query(fs.readFileSync(path.join(__dirname, 'supabase_stub.sql'), 'utf8'));
  for (const f of fs.readdirSync(MIGRATIONS).filter(f => f.endsWith('.sql')).sort()) {
    await db.query(fs.readFileSync(path.join(MIGRATIONS, f), 'utf8'));
  }
});

after(async () => {
  if (!PG_BIN) return;
  if (db) await db.end().catch(() => {});
  try { pgRun('pg_ctl', ['-D', data, '-m', 'immediate', 'stop']); } catch (e) { /* already down */ }
  fs.rmSync(dir, { recursive: true, force: true });
});

// ---- helpers ----------------------------------------------------------------------------------

// Run one statement as a signed-in user (or 'anon'), in its own transaction, like a request to the API.
async function as(user, q, params) {
  await db.query('begin');
  try {
    if (user === 'anon') {
      await db.query('set local role anon');
    } else {
      await db.query('set local role authenticated');
      await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: user.id, role: 'authenticated' })]);
    }
    const r = await db.query(q, params);
    await db.query('commit');
    return r;
  } catch (e) {
    await db.query('rollback');
    throw e;
  }
}
const rows = async (user, q, params) => (await as(user, q, params)).rows;
const DENIED = /permission denied|row-level security|violates/;

// Sign up the way Supabase Auth does: the auth admin role inserts into auth.users.
async function signUp(email, meta = {}) {
  await db.query('begin');
  await db.query('set local role supabase_auth_admin');
  const r = await db.query('insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id', [email, meta]);
  await db.query('commit');
  return { id: r.rows[0].id, email };
}

// An upsert shaped like the one supabase-js sends (on conflict, every sent column takes the new value).
function upsertSql(table, row, conflict) {
  const cols = Object.keys(row);
  const sets = cols.filter(c => !conflict.includes(c)).map(c => `${c} = excluded.${c}`).join(', ');
  return {
    q: `insert into public.${table} (${cols.join(', ')}) values (${cols.map((_, i) => '$' + (i + 1)).join(', ')})
        on conflict (${conflict.join(', ')}) do update set ${sets} returning *`,
    params: cols.map(c => (row[c] !== null && typeof row[c] === 'object' && !(row[c] instanceof Date)) ? JSON.stringify(row[c]) : row[c])
  };
}
const upsert = (user, table, row, conflict = ['id']) => { const u = upsertSql(table, row, conflict); return as(user, u.q, u.params); };

const ago = mins => new Date(Date.now() - mins * 60000).toISOString();
const uuid = () => require('node:crypto').randomUUID();

let coach, coach2, alice, bob, code;

// ---- the tests, in order: each builds on the state the previous ones left --------------------

dbTest('migrations: every public table has row level security and anon has no table privileges', async () => {
  const t = await db.query(`select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
                            where n.nspname = 'public' and c.relkind = 'r' order by 1`);
  assert.ok(t.rows.length >= 12);
  assert.deepEqual(t.rows.filter(r => !r.relrowsecurity).map(r => r.relname), []);
  const open = await db.query(`select table_name from information_schema.role_table_grants
                               where grantee = 'anon' and table_schema = 'public'`);
  assert.deepEqual(open.rows, []);
});

dbTest('migrations: every security definer function pins its search_path', async () => {
  const f = await db.query(`select p.proname, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                            where n.nspname in ('public', 'private') and p.prosecdef`);
  assert.ok(f.rows.length >= 6);
  assert.deepEqual(f.rows.filter(r => !(r.proconfig || []).some(c => /^search_path=("")?$/.test(c))).map(r => r.proname), []);
});

dbTest('sign-up creates a client profile from the sign-up details', async () => {
  coach = await signUp('coach@example.com', { full_name: 'Coach Karim' });
  coach2 = await signUp('coach2@example.com');
  alice = await signUp('alice@example.com', { full_name: '  Alice  ', lang: 'ar' });
  bob = await signUp('bob@example.com', { lang: 'fr' });
  const p = await db.query('select id, role, full_name, lang from public.profiles order by full_name nulls last');
  assert.equal(p.rows.length, 4);
  const a = p.rows.find(r => r.id === alice.id);
  assert.deepEqual([a.role, a.full_name, a.lang], ['client', 'Alice', 'ar']);
  assert.equal(p.rows.find(r => r.id === bob.id).lang, 'en');  // unknown language falls back to English
  // coaches are made by hand in the SQL editor
  await db.query("update public.profiles set role = 'coach' where id = any($1)", [[coach.id, coach2.id]]);
});

dbTest('anonymous visitors can read nothing and call nothing', async () => {
  await assert.rejects(as('anon', 'select * from public.workout_sessions'), /permission denied/);
  await assert.rejects(as('anon', 'select * from public.profiles'), /permission denied/);
  await assert.rejects(as('anon', "select public.accept_invite('ABCDEFGHJKMN')"), /permission denied/);
  await assert.rejects(as('anon', 'select private.is_coach()'), /permission denied/);
  await assert.rejects(as('anon', 'select public.delete_my_account()'), /permission denied/);
});

dbTest('people edit their own name but never their role', async () => {
  await as(alice, "update public.profiles set full_name = 'Alice A.' where id = $1", [alice.id]);
  assert.equal((await db.query('select full_name from public.profiles where id = $1', [alice.id])).rows[0].full_name, 'Alice A.');
  await assert.rejects(as(alice, "update public.profiles set role = 'coach' where id = $1", [alice.id]), /permission denied/);
  // and nobody edits someone else's profile
  const r = await as(bob, "update public.profiles set full_name = 'hacked' where id = $1", [alice.id]);
  assert.equal(r.rowCount, 0);
});

dbTest('only coaches create invites; codes are 12 characters with no look-alikes', async () => {
  await assert.rejects(as(alice, 'select public.create_invite()'), /Only coaches/);
  code = (await rows(coach, 'select public.create_invite() as code'))[0].code;
  assert.match(code, /^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{12}$/);
  assert.equal((await rows(coach, 'select code from public.invites')).length, 1);
  assert.equal((await rows(alice, 'select code from public.invites')).length, 0);  // clients can't list codes
  await assert.rejects(as(coach, 'select public.create_invite(90)'), /1 to 30 days/);
  await assert.rejects(as(coach, "insert into public.invites (code, coach_id) values ('ABCDEFGHJKMN', $1)", [coach.id]), DENIED);
});

dbTest('an invite works once; a used, expired or made-up code gets one message', async () => {
  const joined = await rows(alice, 'select public.accept_invite($1) as coach', ['  ' + code.toLowerCase() + ' ']);
  assert.equal(joined[0].coach, coach.id);
  await assert.rejects(as(bob, 'select public.accept_invite($1)', [code]), /wrong or has expired/);
  await assert.rejects(as(bob, "select public.accept_invite('ZZZZZZZZZZZZ')"), /wrong or has expired/);
  const old = (await rows(coach, 'select public.create_invite() as code'))[0].code;
  await db.query("update public.invites set expires_at = now() - interval '1 minute' where code = $1", [old]);
  await assert.rejects(as(bob, 'select public.accept_invite($1)', [old]), /wrong or has expired/);
  const mine = (await rows(coach2, 'select public.create_invite() as code'))[0].code;
  await assert.rejects(as(coach, 'select public.accept_invite($1)', [mine]), /Coaches cannot join/);
  const link = await db.query('select status from public.coach_clients where coach_id = $1 and client_id = $2', [coach.id, alice.id]);
  assert.equal(link.rows[0].status, 'active');
});

dbTest('a client who has a coach cannot join a second one, and the code stays unused', async () => {
  const other = (await rows(coach2, 'select public.create_invite() as code'))[0].code;
  await assert.rejects(as(alice, 'select public.accept_invite($1)', [other]), /already have a coach/);
  const inv = await db.query('select used_by from public.invites where code = $1', [other]);
  assert.equal(inv.rows[0].used_by, null);
  // a made-up code gets the same answer, so a client with a coach can't use the reply to test guesses
  await assert.rejects(as(alice, "select public.accept_invite('ZZZZZZZZZZZZ')"), /already have a coach/);
});

dbTest('clients see only their own data; their coach reads it; nobody else does', async () => {
  const s = uuid();
  await upsert(alice, 'workout_sessions', { id: s, client_id: alice.id, date: '2026-11-20', sets: { 'Bench press': [[80, 6]] }, modified_at: ago(5) });
  assert.equal((await rows(alice, 'select id from public.workout_sessions')).length, 1);
  assert.equal((await rows(coach, 'select id from public.workout_sessions where client_id = $1', [alice.id])).length, 1);
  assert.equal((await rows(bob, 'select id from public.workout_sessions')).length, 0);
  assert.equal((await rows(coach2, 'select id from public.workout_sessions')).length, 0);
  // profiles: the coach sees Alice; Alice sees her coach; Bob sees only himself
  assert.deepEqual((await rows(coach, 'select id from public.profiles order by id')).map(r => r.id).sort(), [coach.id, alice.id].sort());
  assert.deepEqual((await rows(alice, 'select id from public.profiles')).map(r => r.id).sort(), [coach.id, alice.id].sort());
  assert.deepEqual((await rows(bob, 'select id from public.profiles')).map(r => r.id), [bob.id]);
  assert.deepEqual((await rows(coach2, 'select id from public.profiles')).map(r => r.id), [coach2.id]);
});

dbTest('nobody writes data for someone else, the coach included', async () => {
  await assert.rejects(upsert(bob, 'workout_sessions', { id: uuid(), client_id: alice.id, date: '2026-11-20', sets: {} }), DENIED);
  await assert.rejects(upsert(coach, 'food_logs', { id: uuid(), client_id: alice.id, date: '2026-11-20', name: 'Oats', kcal: 300 }), DENIED);
  const r = await as(coach, "update public.workout_sessions set note = 'changed by coach' where client_id = $1", [alice.id]);
  assert.equal(r.rowCount, 0);
  const notes = await db.query('select note from public.workout_sessions where client_id = $1', [alice.id]);
  assert.equal(notes.rows[0].note, null);
});

dbTest('deletes are soft: nobody can hard-delete a synced row', async () => {
  await assert.rejects(as(alice, 'delete from public.workout_sessions'), /permission denied/);
  await assert.rejects(as(alice, 'delete from public.food_logs'), /permission denied/);
});

dbTest('the newest edit wins by when it was made, not when it reached the server', async () => {
  const id = uuid();
  await upsert(alice, 'food_logs', { id, client_id: alice.id, date: '2026-11-21', name: 'Rice', kcal: 400, modified_at: ago(30) });
  const first = (await db.query('select updated_at from public.food_logs where id = $1', [id])).rows[0].updated_at;
  // an edit made offline an hour ago arrives now: older than what the server has, so it loses
  const stale = await upsert(alice, 'food_logs', { id, client_id: alice.id, date: '2026-11-21', name: 'Rice (old edit)', kcal: 999, modified_at: ago(60) });
  assert.equal(stale.rowCount, 0);
  let row = (await db.query('select name, kcal, updated_at from public.food_logs where id = $1', [id])).rows[0];
  assert.deepEqual([row.name, Number(row.kcal)], ['Rice', 400]);
  assert.equal(row.updated_at.getTime(), first.getTime());  // nothing changed, so nothing for devices to pull
  // a newer edit wins
  await upsert(alice, 'food_logs', { id, client_id: alice.id, date: '2026-11-21', name: 'Rice, big plate', kcal: 550, modified_at: ago(10) });
  row = (await db.query('select name, updated_at from public.food_logs where id = $1', [id])).rows[0];
  assert.equal(row.name, 'Rice, big plate');
  assert.ok(row.updated_at > first);
});

dbTest('a phone clock running fast cannot win future conflicts, and devices cannot set the server time', async () => {
  const id = uuid();
  const future = new Date(Date.now() + 3 * 3600000).toISOString();
  await upsert(alice, 'food_logs', { id, client_id: alice.id, date: '2026-11-21', name: 'Eggs', kcal: 200, modified_at: future, updated_at: '2000-01-01T00:00:00Z' });
  const r = (await db.query('select modified_at, updated_at from public.food_logs where id = $1', [id])).rows[0];
  assert.ok(r.modified_at <= new Date(Date.now() + 1000), 'modified_at clamped to the server clock');
  assert.ok(r.updated_at > new Date('2020-01-01'), 'updated_at set by the server');
});

dbTest('sending the same edit twice changes nothing; an edit without a time still lands', async () => {
  const id = uuid(), t = ago(20);
  const row = { id, client_id: alice.id, date: '2026-11-21', name: 'Tuna', kcal: 150, modified_at: t };
  await upsert(alice, 'food_logs', row);
  const before = (await db.query('select updated_at from public.food_logs where id = $1', [id])).rows[0].updated_at;
  const again = await upsert(alice, 'food_logs', row);
  assert.equal(again.rowCount, 0);
  assert.equal((await db.query('select updated_at from public.food_logs where id = $1', [id])).rows[0].updated_at.getTime(), before.getTime());
  await as(alice, 'update public.food_logs set kcal = 160 where id = $1', [id]);  // no modified_at sent
  const after = (await db.query('select kcal, modified_at from public.food_logs where id = $1', [id])).rows[0];
  assert.equal(Number(after.kcal), 160);
  assert.ok(after.modified_at > new Date(t));
});

dbTest('habits are one row per day and settings one row per key, so two devices do not overwrite each other', async () => {
  await upsert(alice, 'habit_days', { client_id: alice.id, date: '2026-11-21', data: { water: 1 }, modified_at: ago(30) }, ['client_id', 'date']);
  await upsert(alice, 'habit_days', { client_id: alice.id, date: '2026-11-21', data: { water: 2, creatine: true }, modified_at: ago(5) }, ['client_id', 'date']);
  const h = await db.query('select data from public.habit_days where client_id = $1', [alice.id]);
  assert.deepEqual(h.rows.map(r => r.data), [{ water: 2, creatine: true }]);
  // phone edits goals, laptop edits My Foods at about the same time: both survive
  await upsert(alice, 'client_settings', { client_id: alice.id, key: 'goals', value: { kcal: 2400 }, modified_at: ago(3) }, ['client_id', 'key']);
  await upsert(alice, 'client_settings', { client_id: alice.id, key: 'my_foods', value: [{ name: 'Oats', kcal: 400, p: 20 }], modified_at: ago(4) }, ['client_id', 'key']);
  const s = await db.query('select key, value from public.client_settings where client_id = $1 order by key', [alice.id]);
  assert.deepEqual(s.rows.map(r => r.key), ['goals', 'my_foods']);
  assert.equal(s.rows[0].value.kcal, 2400);
  await assert.rejects(upsert(alice, 'client_settings', { client_id: alice.id, key: 'role', value: { role: 'coach' } }, ['client_id', 'key']), /check constraint/);
});

dbTest('coach programs and meal plans: the coach writes, only the assigned client reads', async () => {
  const p = uuid();
  await upsert(coach, 'programs', { id: p, coach_id: coach.id, client_id: alice.id, name: 'Alice: strength', days: [{ id: 'a', name: 'Day A', ex: [] }] });
  await upsert(coach, 'meal_plans', { id: uuid(), coach_id: coach.id, client_id: alice.id, name: 'Cut', targets: { kcal: 2200, protein: 170 } });
  await upsert(coach, 'programs', { id: uuid(), coach_id: coach.id, client_id: null, name: 'Template: PPL' });
  assert.deepEqual((await rows(alice, 'select name from public.programs')).map(r => r.name), ['Alice: strength']);
  assert.equal((await rows(alice, 'select targets from public.meal_plans'))[0].targets.protein, 170);
  assert.equal((await rows(bob, 'select id from public.programs')).length, 0);
  assert.equal((await rows(coach2, 'select id from public.programs')).length, 0);
  const edit = await as(alice, "update public.programs set name = 'mine now' where id = $1", [p]);
  assert.equal(edit.rowCount, 0);
  // a coach can't assign to someone who isn't their client, and a client can't pose as a coach
  await assert.rejects(upsert(coach, 'programs', { id: uuid(), coach_id: coach.id, client_id: bob.id, name: 'x' }), DENIED);
  await assert.rejects(upsert(bob, 'programs', { id: uuid(), coach_id: bob.id, client_id: null, name: 'x' }), DENIED);
  await assert.rejects(upsert(coach2, 'programs', { id: uuid(), coach_id: coach.id, client_id: alice.id, name: 'x' }), DENIED);
});

dbTest("the coach's private notes stay private", async () => {
  await upsert(coach, 'coach_notes', { coach_id: coach.id, client_id: alice.id, body: 'Knee pain on deep squats' }, ['coach_id', 'client_id']);
  assert.equal((await rows(coach, 'select body from public.coach_notes'))[0].body, 'Knee pain on deep squats');
  assert.equal((await rows(alice, 'select body from public.coach_notes')).length, 0);
  assert.equal((await rows(coach2, 'select body from public.coach_notes')).length, 0);
  await assert.rejects(upsert(coach2, 'coach_notes', { coach_id: coach2.id, client_id: alice.id, body: 'x' }, ['coach_id', 'client_id']), /row-level security|violates/);
  // and nothing private is in the link row the client can read (paid_until is hers to know, from phase 6)
  const cols = Object.keys((await rows(alice, 'select * from public.coach_clients'))[0]);
  assert.deepEqual(cols.sort(), ['client_id', 'coach_id', 'created_at', 'paid_until', 'started_at', 'status', 'updated_at']);
});

dbTest('comments: each person edits only their own; read receipts only through mark_comments_read', async () => {
  const mine = uuid(), theirs = uuid();
  await as(alice, "insert into public.comments (id, client_id, body) values ($1, $2, 'Felt strong today')", [mine, alice.id]);
  await as(coach, "insert into public.comments (id, client_id, target_type, body) values ($1, $2, 'session', 'Nice! Add 2.5 kg next week')", [theirs, alice.id]);
  assert.equal((await rows(coach, 'select id from public.comments')).length, 2);
  assert.equal((await rows(bob, 'select id from public.comments')).length, 0);
  // the coach can't rewrite or delete Alice's words
  assert.equal((await as(coach, "update public.comments set body = 'edited' where id = $1", [mine])).rowCount, 0);
  assert.equal((await as(coach, 'update public.comments set deleted_at = now() where id = $1', [mine])).rowCount, 0);
  assert.equal((await as(alice, "update public.comments set body = 'Felt very strong today' where id = $1", [mine])).rowCount, 1);
  // read receipts can't be faked
  await assert.rejects(as(alice, 'update public.comments set read_at = now() where id = $1', [theirs]), /permission denied/);
  await assert.rejects(as(alice, "insert into public.comments (client_id, body, read_at) values ($1, 'x', now())", [alice.id]), /permission denied/);
  await assert.rejects(as(bob, 'insert into public.comments (client_id, body) values ($1, $2)', [alice.id, 'spam']), DENIED);
  await assert.rejects(as(alice, "insert into public.comments (client_id, author_id, body) values ($1, $2, 'fake')", [alice.id, coach.id]), DENIED);
  // the coach reads the thread: only Alice's comment is marked; then Alice reads hers
  assert.equal((await rows(coach, 'select public.mark_comments_read($1) as n', [alice.id]))[0].n, 1);
  assert.equal((await rows(alice, 'select public.mark_comments_read($1) as n', [alice.id]))[0].n, 1);
  await assert.rejects(as(bob, 'select public.mark_comments_read($1)', [alice.id]), /Not allowed/);
  const read = await db.query('select id, read_at is not null as read from public.comments order by created_at');
  assert.deepEqual(read.rows.map(r => r.read), [true, true]);
});

dbTest('progress photos: your own folder only; your coach can view; other buckets never break the check', async () => {
  await as(alice, "insert into storage.objects (bucket_id, name) values ('progress', $1)", [`${alice.id}/2026-11-22-front.webp`]);
  await assert.rejects(as(alice, "insert into storage.objects (bucket_id, name) values ('progress', $1)", [`${bob.id}/x.webp`]), DENIED);
  await assert.rejects(as(alice, "insert into storage.objects (bucket_id, name) values ('progress', 'no-folder.webp')"), DENIED);
  // another bucket with a path that isn't a uuid must not make anyone's query fail
  await db.query("insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)");
  await db.query("insert into storage.objects (bucket_id, name) values ('avatars', 'public/logo.png')");
  assert.deepEqual((await rows(coach, 'select name from storage.objects')).map(r => r.name), [`${alice.id}/2026-11-22-front.webp`]);
  assert.equal((await rows(bob, 'select name from storage.objects')).length, 0);
  assert.equal((await rows(coach2, 'select name from storage.objects')).length, 0);
  assert.equal((await as(coach, 'delete from storage.objects')).rowCount, 0);  // the coach only looks
  const bucket = await db.query("select public from storage.buckets where id = 'progress'");
  assert.equal(bucket.rows[0].public, false);
});

dbTest('pausing keeps access; leaving ends it; only a new invite brings the coach back', async () => {
  await as(coach, "update public.coach_clients set status = 'paused' where client_id = $1", [alice.id]);
  assert.equal((await rows(coach, 'select id from public.workout_sessions')).length, 1);
  await as(coach, "update public.coach_clients set status = 'active' where client_id = $1", [alice.id]);
  // Alice can't change which coach she has, only leave
  await assert.rejects(as(alice, 'update public.coach_clients set coach_id = $1', [coach2.id]), /permission denied/);
  await assert.rejects(as(alice, "update public.coach_clients set status = 'paused'"), DENIED);
  assert.equal((await as(alice, "update public.coach_clients set status = 'archived'")).rowCount, 1);
  assert.equal((await rows(coach, 'select id from public.workout_sessions')).length, 0);
  assert.equal((await rows(coach, 'select id from storage.objects')).length, 0);
  assert.deepEqual((await rows(coach, 'select id from public.profiles')).map(r => r.id), [coach.id]);
  // neither side can quietly switch access back on: the archived link isn't updatable at all
  assert.equal((await as(coach, "update public.coach_clients set status = 'active' where client_id = $1", [alice.id])).rowCount, 0);
  assert.equal((await as(alice, "update public.coach_clients set status = 'active'")).rowCount, 0);
  assert.equal((await db.query('select status from public.coach_clients where client_id = $1', [alice.id])).rows[0].status, 'archived');
  // Alice joins coach2 now that she has left; later rejoins her first coach with a new code
  const c2 = (await rows(coach2, 'select public.create_invite() as code'))[0].code;
  await as(alice, 'select public.accept_invite($1)', [c2]);
  assert.equal((await rows(coach2, 'select id from public.workout_sessions')).length, 1);
  await as(alice, "update public.coach_clients set status = 'archived' where coach_id = $1", [coach2.id]);
  const back = (await rows(coach, 'select public.create_invite() as code'))[0].code;
  await as(alice, 'select public.accept_invite($1)', [back]);
  assert.equal((await rows(coach, 'select id from public.workout_sessions')).length, 1);
  assert.equal((await rows(coach2, 'select id from public.workout_sessions')).length, 0);
});

dbTest('deleting an account removes everything that belongs to it, and the code it used stays used', async () => {
  const carl = await signUp('carl@example.com');
  const carlsCode = (await rows(coach2, 'select public.create_invite() as code'))[0].code;
  await as(carl, 'select public.accept_invite($1)', [carlsCode]);
  await upsert(carl, 'workout_sessions', { id: uuid(), client_id: carl.id, date: '2026-11-22', sets: {} });
  await db.query('delete from auth.users where id = $1', [carl.id]);
  const left = await db.query('select count(*)::int as n from public.workout_sessions where client_id = $1', [carl.id]);
  assert.equal(left.rows[0].n, 0);
  assert.equal((await db.query('select count(*)::int as n from public.profiles where id = $1', [carl.id])).rows[0].n, 0);
  const dan = await signUp('dan@example.com');
  await assert.rejects(as(dan, 'select public.accept_invite($1)', [carlsCode]), /wrong or has expired/);
});

dbTest('people delete their own account and everything in it, and only their own', async () => {
  const erin = await signUp('erin@example.com', { full_name: 'Erin' });
  const erinsCode = (await rows(coach2, 'select public.create_invite() as code'))[0].code;
  await as(erin, 'select public.accept_invite($1)', [erinsCode]);
  await upsert(erin, 'workout_sessions', { id: uuid(), client_id: erin.id, date: '2026-11-24', sets: { Squat: [[60, 5]] } });
  await upsert(erin, 'food_logs', { id: uuid(), client_id: erin.id, date: '2026-11-24', name: 'Eggs', kcal: 215, p: 18 });
  await upsert(erin, 'client_settings', { client_id: erin.id, key: 'goals', value: { kg: 70 } }, ['client_id', 'key']);
  const count = async q => (await db.query(q, [erin.id])).rows[0].n;
  const others = (await db.query('select count(*)::int as n from auth.users where id <> $1', [erin.id])).rows[0].n;

  await as(erin, 'select public.delete_my_account()');
  assert.equal(await count('select count(*)::int as n from auth.users where id = $1'), 0);
  assert.equal(await count('select count(*)::int as n from public.profiles where id = $1'), 0);
  assert.equal(await count('select count(*)::int as n from public.workout_sessions where client_id = $1'), 0);
  assert.equal(await count('select count(*)::int as n from public.food_logs where client_id = $1'), 0);
  assert.equal(await count('select count(*)::int as n from public.client_settings where client_id = $1'), 0);
  assert.equal(await count('select count(*)::int as n from public.coach_clients where client_id = $1'), 0);
  assert.equal((await db.query('select count(*)::int as n from auth.users where id <> $1', [erin.id])).rows[0].n, others, 'nobody else');
  assert.ok((await db.query('select used_at from public.invites where code = $1', [erinsCode])).rows[0].used_at, 'the code stays used');
  // a request with no user in it is refused outright
  await assert.rejects(as({ id: '' }, 'select public.delete_my_account()'), /Sign in first/);
  // a session left over from the deleted account finds nothing to delete
  await as(erin, 'select public.delete_my_account()');
  assert.equal((await db.query('select count(*)::int as n from auth.users')).rows[0].n, others);
});

// ---- phase 4: comments and notifications (0003_comments_push.sql) ----------------------------

// A browser's subscription, shaped like the real thing (65-byte key, 16-byte secret, base64url).
const sub = n => ({ endpoint: `https://fcm.googleapis.com/fcm/send/device-${n}-abcdefghij`, p256dh: 'B' + 'A'.repeat(86), auth: 'C'.repeat(22) });
const addSub = (user, s, lang = 'en') =>
  as(user, 'insert into public.push_subscriptions (endpoint, p256dh, auth, lang) values ($1, $2, $3, $4)', [s.endpoint, s.p256dh, s.auth, lang]);
// What the database asked pg_net to send (the stand-in records it), and a clean slate.
const sentJobs = async () => (await db.query('select body from net.calls order by id')).rows.flatMap(r => r.body.jobs);
const clearCalls = () => db.query('delete from net.calls');

dbTest('push subscriptions: your own only, real push services only, and one browser can hold two accounts', async () => {
  const s1 = sub(1);
  await addSub(alice, s1, 'ar');
  await addSub(coach, s1);  // the same browser, signed in on the coach page
  assert.deepEqual((await rows(alice, 'select user_id, lang from public.push_subscriptions')), [{ user_id: alice.id, lang: 'ar' }]);
  assert.equal((await rows(bob, 'select user_id from public.push_subscriptions')).length, 0);
  await assert.rejects(as(bob, 'insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ($1, $2, $3, $4)',
    [alice.id, sub(2).endpoint, s1.p256dh, s1.auth]), DENIED);
  // only the big push services, so the push function never posts anywhere else; keys must look like keys
  await assert.rejects(addSub(bob, { ...s1, endpoint: 'https://evil.example.com/fcm.googleapis.com/' }), /check constraint/);
  await assert.rejects(addSub(bob, { ...s1, endpoint: 'http://fcm.googleapis.com/fcm/send/x' }), /check constraint/);
  await assert.rejects(addSub(bob, { ...sub(3), p256dh: 'short' }), /check constraint/);
  // the same browser saving again updates its row (new keys, another language); nobody touches anyone else's
  await upsert(alice, 'push_subscriptions', { user_id: alice.id, endpoint: s1.endpoint, p256dh: s1.p256dh, auth: s1.auth, lang: 'ar' }, ['user_id', 'endpoint']);
  assert.equal((await db.query('select count(*)::int as n from public.push_subscriptions')).rows[0].n, 2);
  assert.equal((await as(bob, 'delete from public.push_subscriptions')).rowCount, 0);
  assert.equal((await as(bob, "update public.push_subscriptions set lang = 'en'")).rowCount, 0);
});

dbTest('push subscriptions: at most 20 browsers per account', async () => {
  for (let i = 0; i < 20; i++) await addSub(bob, sub('bob' + i));
  await assert.rejects(addSub(bob, sub('bob20')), /too many browsers/);
  // one of the twenty saving again still works
  await upsert(bob, 'push_subscriptions', { user_id: bob.id, endpoint: sub('bob3').endpoint, p256dh: sub(0).p256dh, auth: sub(0).auth, lang: 'ar' }, ['user_id', 'endpoint']);
  assert.equal((await as(bob, 'delete from public.push_subscriptions')).rowCount, 20);
});

dbTest("a new comment goes to the other side of the thread, in each browser's language", async () => {
  await clearCalls();
  // until the push function's address and secret are set, nothing is sent and comments work as before
  await as(alice, "insert into public.comments (client_id, body) values ($1, 'Is my squat depth OK?')", [alice.id]);
  assert.equal((await db.query('select count(*)::int as n from net.calls')).rows[0].n, 0);
  await db.query("insert into vault.secrets (name, secret) values ('push_url', 'https://example.supabase.co/functions/v1/push'), ('push_secret', 's3cret')");

  await as(alice, "insert into public.comments (client_id, target_type, target_ref, body) values ($1, 'food_day', '2026-11-24', 'Ate out tonight')", [alice.id]);
  const call = (await db.query('select url, headers from net.calls')).rows;
  assert.deepEqual(call.map(c => [c.url, c.headers['x-push-secret']]), [['https://example.supabase.co/functions/v1/push', 's3cret']]);
  let jobs = await sentJobs();
  // Alice's coach hears about it, not Alice; it opens her comments on the coach page
  assert.deepEqual(jobs.map(j => [j.user, j.lang, j.title, j.body, j.url, j.tag]),
    [[coach.id, 'en', 'Alice A.', 'Ate out tonight', `coach.html#client=${alice.id}&tab=comments`, `comments-${alice.id}`]]);
  assert.deepEqual([jobs[0].endpoint, jobs[0].p256dh, jobs[0].auth], [sub(1).endpoint, sub(1).p256dh, sub(1).auth]);

  // the coach answers: Alice's browser gets it in Arabic, and it opens her comments in the app
  await clearCalls();
  await as(coach, "insert into public.comments (client_id, body) values ($1, 'Fine, back on plan tomorrow')", [alice.id]);
  jobs = await sentJobs();
  assert.deepEqual(jobs.map(j => [j.user, j.lang, j.title, j.url]), [[alice.id, 'ar', 'الكابتن Coach Karim', './#comments']]);
  // no one to tell (Bob has no coach): no request at all
  await clearCalls();
  await as(bob, "insert into public.comments (client_id, body) values ($1, 'Note to self')", [bob.id]);
  assert.equal((await db.query('select count(*)::int as n from net.calls')).rows[0].n, 0);
});

dbTest('read receipts for chosen comments, and the coach inbox: unread, and waiting for a reply', async () => {
  let inbox = await rows(coach, 'select client_id, unread, waiting from public.comment_inbox()');
  assert.deepEqual(inbox, [{ client_id: alice.id, unread: 2, waiting: false }]);
  const q = uuid();
  await as(alice, "insert into public.comments (id, client_id, target_type, target_ref, body) values ($1, $2, 'session', $3, 'Too heavy?')", [q, alice.id, uuid()]);
  inbox = await rows(coach, 'select unread, waiting from public.comment_inbox()');
  assert.deepEqual(inbox, [{ unread: 3, waiting: true }]);
  // the coach opens that one workout: only its comment is marked read
  assert.equal((await rows(coach, 'select public.mark_comments_read($1, $2) as n', [alice.id, [q]]))[0].n, 1);
  assert.equal((await rows(coach, 'select unread from public.comment_inbox()'))[0].unread, 2);
  // Alice can't mark her own words as read by the coach, and a client's inbox is empty
  assert.equal((await rows(alice, 'select public.mark_comments_read($1, $2) as n', [alice.id, [q]]))[0].n, 0);
  assert.equal((await rows(alice, 'select * from public.comment_inbox()')).length, 0);
  // a deleted comment doesn't count: the coach's reply is the last word again
  await as(alice, 'update public.comments set deleted_at = now() where id = $1', [q]);
  assert.deepEqual(await rows(coach, 'select unread, waiting from public.comment_inbox()'), [{ unread: 2, waiting: false }]);
  await assert.rejects(as('anon', 'select * from public.comment_inbox()'), /permission denied/);
});

dbTest('a program or meal plan from the coach is announced once, and only when it changed', async () => {
  await clearCalls();
  const p = uuid(), day = { id: 'a', name: 'Day A', ex: [] };
  await upsert(coach, 'programs', { id: p, coach_id: coach.id, client_id: alice.id, name: 'Strength 2', days: [day], modified_at: ago(10) });
  let jobs = await sentJobs();
  assert.deepEqual(jobs.map(j => [j.user, j.title, j.body, j.url]), [[alice.id, 'برنامج جديد من الكابتن', 'Strength 2', './']]);
  // sent again with nothing new: nothing to say. A real change: "updated"
  await clearCalls();
  await upsert(coach, 'programs', { id: p, coach_id: coach.id, client_id: alice.id, name: 'Strength 2', days: [day], modified_at: ago(9) });
  assert.equal((await sentJobs()).length, 0);
  await upsert(coach, 'programs', { id: p, coach_id: coach.id, client_id: alice.id, name: 'Strength 2', days: [{ ...day, ex: [['Squat', 3, '5', 'Quads', 180]] }], modified_at: ago(8) });
  assert.deepEqual((await sentJobs()).map(j => j.title), ['الكابتن حدّث برنامجك']);
  // retiring it, or writing a template, tells nobody
  await clearCalls();
  await as(coach, 'update public.programs set active = false, modified_at = now() where id = $1', [p]);
  await upsert(coach, 'programs', { id: uuid(), coach_id: coach.id, client_id: null, name: 'Template: 5x5', days: [day] });
  assert.equal((await sentJobs()).length, 0);
  // meal plans the same way; they open the Meals tab
  await upsert(coach, 'meal_plans', { id: uuid(), coach_id: coach.id, client_id: alice.id, name: 'Lean bulk', targets: { kcal: 2800, protein: 170 } });
  assert.deepEqual((await sentJobs()).map(j => [j.title, j.body, j.url]), [['نظام أكل جديد من الكابتن', 'Lean bulk', './#meals']]);
});

dbTest('training-day reminders: on the chosen days and time, once a day, never after a workout', async () => {
  await clearCalls();
  const setting = value => upsert(alice, 'client_settings', { client_id: alice.id, key: 'reminder', value, modified_at: new Date().toISOString() }, ['client_id', 'key']);
  const run = async t => (await db.query('select private.send_reminders($1) as n', [t])).rows[0].n;
  // Tuesdays and Thursdays at 18:30 in Cairo (UTC+2 in November). 24 Nov 2026 is a Tuesday.
  await setting({ on: true, days: [2, 4], time: '18:30', tz: 'Africa/Cairo', next: 'Push' });
  assert.equal(await run('2026-11-24T18:15:00+02:00'), 0, 'not yet');
  assert.equal(await run('2026-11-24T18:40:00+02:00'), 1, 'its time');
  assert.deepEqual((await sentJobs()).map(j => [j.user, j.title, j.body, j.url, j.tag]),
    [[alice.id, 'النهارده يوم تمرين', 'عليك النهارده: Push. دوس عشان تبدأ.', './', 'reminder']]);
  assert.equal(await run('2026-11-24T18:55:00+02:00'), 0, 'once a day');
  assert.equal(await run('2026-11-25T18:40:00+02:00'), 0, 'Wednesday is not a chosen day');
  assert.equal(await run('2026-12-01T20:45:00+02:00'), 0, 'more than two hours late');
  // Thursday, but she already trained today
  await upsert(alice, 'workout_sessions', { id: uuid(), client_id: alice.id, date: '2026-11-26', sets: {} });
  assert.equal(await run('2026-11-26T18:45:00+02:00'), 0, 'trained already');
  // a time zone the database doesn't know is skipped without breaking anyone else's; switched off is off
  await setting({ on: true, days: [0, 1, 2, 3, 4, 5, 6], time: '18:30', tz: 'Mars/Olympus' });
  assert.equal(await run('2026-12-03T18:45:00+02:00'), 0);
  await setting({ on: false, days: [0, 1, 2, 3, 4, 5, 6], time: '18:30', tz: 'Africa/Cairo' });
  assert.equal(await run('2026-12-03T18:45:00+02:00'), 0);
  // no "next" day known: a general line
  await setting({ on: true, days: [4], time: '18:30', tz: 'Africa/Cairo' });
  await clearCalls();
  assert.equal(await run('2026-12-03T18:45:00+02:00'), 1);
  assert.deepEqual((await sentJobs()).map(j => j.body), ['تمرينك مستنيك. دوس عشان تبدأ.']);
});

dbTest('the notification helpers are for the database alone, and reminders run every 15 minutes', async () => {
  await assert.rejects(as(alice, 'select private.send_reminders()'), /permission denied/);
  await assert.rejects(as(alice, "select private.push('[]'::jsonb)"), /permission denied/);
  await assert.rejects(as(alice, 'select private.comment_jobs($1)', [uuid()]), /permission denied/);
  await assert.rejects(as(alice, 'select * from private.reminders_sent'), /permission denied/);
  await assert.rejects(as('anon', 'select * from public.push_subscriptions'), /permission denied/);
  // the push function's role may find and forget subscriptions, and nothing more
  const sr = await db.query(`select has_table_privilege('service_role', 'public.push_subscriptions', 'select') as s,
    has_table_privilege('service_role', 'public.push_subscriptions', 'delete') as d,
    has_table_privilege('service_role', 'public.push_subscriptions', 'insert') as i`);
  assert.deepEqual(sr.rows[0], { s: true, d: true, i: false });
  const job = await db.query("select schedule, command from cron.job where jobname = 'gymlog-reminders'");
  assert.deepEqual(job.rows, [{ schedule: '*/15 * * * *', command: 'select private.send_reminders()' }]);
  // deleting an account takes its subscriptions with it, and only its own
  await addSub(coach2, sub(1));
  const subsOf = async id => (await db.query('select count(*)::int as n from public.push_subscriptions where user_id = $1', [id])).rows[0].n;
  assert.deepEqual([await subsOf(coach2.id), await subsOf(coach.id)], [1, 1]);
  await db.query('delete from auth.users where id = $1', [coach2.id]);
  assert.deepEqual([await subsOf(coach2.id), await subsOf(coach.id)], [0, 1]);
});

// ---- phase 5: progress photos (0004_progress_photos.sql) -------------------------------------

dbTest('a check-in holds up to three photos, named the way the app names them', async () => {
  const id = uuid(), name = ext => `2026-11-24-${uuid()}.${ext}`;
  const front = name('webp'), side = name('jpg');
  await upsert(alice, 'body_checkins', { id, client_id: alice.id, date: '2026-11-24', kg: 72.9, photos: { front, side } });
  assert.deepEqual((await rows(coach, 'select photos from public.body_checkins where id = $1', [id]))[0].photos, { front, side });
  // anything else is refused: another pose, a path out of the folder, someone else's folder, another type, not a name
  for (const bad of [{ top: front }, { front: '../' + front }, { front: `${bob.id}/${front}` }, { front: front.replace('.webp', '.png') }, { front: 7 }, ['x']]) {
    await assert.rejects(upsert(alice, 'body_checkins', { id: uuid(), client_id: alice.id, date: '2026-11-24', photos: bad }), /body_checkins_photos/, JSON.stringify(bad));
  }
  // a check-in without photos, as before; and the old single-photo column is gone
  await upsert(alice, 'body_checkins', { id: uuid(), client_id: alice.id, date: '2026-11-24', kg: 73 });
  const cols = await db.query("select column_name from information_schema.columns where table_schema = 'public' and table_name = 'body_checkins' and column_name like 'photo%'");
  assert.deepEqual(cols.rows.map(r => r.column_name), ['photos']);
});

dbTest('the progress bucket takes small photos only, and stays private', async () => {
  const b = (await db.query("select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'progress'")).rows[0];
  assert.deepEqual([b.public, Number(b.file_size_limit), b.allowed_mime_types], [false, 2097152, ['image/webp', 'image/jpeg']]);
  // the photo check is for the table's own use; visitors can't reach it
  await assert.rejects(as('anon', 'select private.valid_photos(null)'), /permission denied/);
});

// ---- phase 6: subscriptions (0005_subscriptions.sql) ------------------------------------------
const cairoToday = async () => (await db.query("select (now() at time zone 'Africa/Cairo')::date::text as d")).rows[0].d;
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const paidUntil = async () => (await db.query('select paid_until::text as p from public.coach_clients where coach_id = $1 and client_id = $2', [coach.id, alice.id])).rows[0].p;
const setPaid = d => db.query('update public.coach_clients set paid_until = $1 where coach_id = $2 and client_id = $3', [d, coach.id, alice.id]);

dbTest('payments: only the coach records them, each one runs on from the last paid day, and both of them see them', async () => {
  const today = await cairoToday();
  assert.equal(await paidUntil(), null, 'not tracked until the first payment');
  const first = (await rows(coach, "select public.record_payment($1, 1500, 30, 'instapay', ' November ')::text as d", [alice.id]))[0].d;
  assert.equal(first, addDays(today, 29));
  const second = (await rows(coach, "select public.record_payment($1, 4000, 90, 'vodafone_cash')::text as d", [alice.id]))[0].d;
  assert.equal(second, addDays(today, 119), 'the next one starts the day after the last paid day');
  assert.equal(await paidUntil(), second);
  const seen = await rows(alice, 'select amount::text, method, days, note from public.payments order by ends_on');
  assert.deepEqual(seen, [{ amount: '1500.00', method: 'instapay', days: 30, note: 'November' }, { amount: '4000.00', method: 'vodafone_cash', days: 90, note: null }]);
  assert.equal((await rows(bob, 'select id from public.payments')).length, 0, 'nobody else sees them');
  // only through the function, only the coach, and only sensible payments
  await assert.rejects(as(alice, "select public.record_payment($1, 0, 30, 'cash')", [alice.id]), /Only their coach/);
  await assert.rejects(as(bob, "select public.record_payment($1, 100, 30, 'cash')", [alice.id]), /Only their coach/);
  await assert.rejects(as(coach, "select public.record_payment($1, 100, 0, 'cash')", [alice.id]), /1 to 366 days/);
  await assert.rejects(as(coach, "select public.record_payment($1, -5, 30, 'cash')", [alice.id]), /Check the amount/);
  await assert.rejects(as(coach, "select public.record_payment($1, 100, 30, 'paypal')", [alice.id]), /Choose how they paid/);
  await assert.rejects(as(coach, "insert into public.payments (coach_id, client_id, amount, method, days, starts_on, ends_on) values ($1, $2, 1, 'cash', 1, now(), now())", [coach.id, alice.id]), /permission denied/);
  await assert.rejects(as(coach, "update public.coach_clients set paid_until = '2099-01-01' where client_id = $1", [alice.id]), /permission denied/);
  await assert.rejects(as('anon', "select public.record_payment($1, 1, 1, 'cash')", [alice.id]), /permission denied/);
});

dbTest('taking back a payment: only the latest, and the subscription ends where the one before it ended', async () => {
  const pays = await rows(coach, 'select id, ends_on::text as e from public.payments where client_id = $1 and deleted_at is null order by ends_on', [alice.id]);
  await assert.rejects(as(coach, 'select public.withdraw_payment($1)', [pays[0].id]), /Only the latest/);
  await assert.rejects(as(alice, 'select public.withdraw_payment($1)', [pays[1].id]), /No such payment/);
  assert.equal((await rows(coach, 'select public.withdraw_payment($1)::text as d', [pays[1].id]))[0].d, pays[0].e);
  assert.equal(await paidUntil(), pays[0].e);
  assert.equal((await rows(alice, 'select id from public.payments where deleted_at is null')).length, 1);
});

dbTest('after the last paid day the coach sees only what came before it and can send nothing; a payment brings it all back', async () => {
  const today = await cairoToday(), last = addDays(today, -10);
  await setPaid(last);
  const old = uuid(), fresh = uuid();
  await upsert(alice, 'workout_sessions', { id: old, client_id: alice.id, date: addDays(today, -12), sets: {} });
  await upsert(alice, 'workout_sessions', { id: fresh, client_id: alice.id, date: addDays(today, -2), sets: {} });
  await upsert(alice, 'food_logs', { id: uuid(), client_id: alice.id, date: addDays(today, -1), name: 'Rice', kcal: 300 });
  await upsert(alice, 'body_checkins', { id: uuid(), client_id: alice.id, date: addDays(today, -1), kg: 71 });
  await upsert(alice, 'habit_days', { client_id: alice.id, date: addDays(today, -1), data: { water: 3 } }, ['client_id', 'date']);
  const coachSees = async table => (await rows(coach, `select count(*)::int as n from public.${table} where client_id = $1 and date > $2`, [alice.id, last]))[0].n;
  const ids = (await rows(coach, 'select id from public.workout_sessions where client_id = $1', [alice.id])).map(r => r.id);
  assert.ok(ids.includes(old) && !ids.includes(fresh), 'the workout from before, not the one after');
  for (const t of ['food_logs', 'body_checkins', 'habit_days']) assert.equal(await coachSees(t), 0, t);
  assert.ok((await rows(alice, 'select id from public.workout_sessions')).some(r => r.id === fresh), 'the client sees all of hers');
  // her new comment waits for the next payment, and doesn't wake the coach
  await clearCalls();
  await as(alice, "insert into public.comments (client_id, body) values ($1, 'Are you there?')", [alice.id]);
  assert.equal((await rows(coach, "select id from public.comments where body = 'Are you there?'")).length, 0);
  assert.equal((await sentJobs()).filter(j => j.user === coach.id).length, 0);
  // photos by their day, like the log
  await as(alice, "insert into storage.objects (bucket_id, name) values ('progress', $1), ('progress', $2)", [`${alice.id}/${addDays(today, -11)}-a.webp`, `${alice.id}/${addDays(today, -1)}-b.webp`]);
  const files = (await rows(coach, "select name from storage.objects where name like $1", [alice.id + '/%'])).map(r => r.name);
  assert.ok(files.includes(`${alice.id}/${addDays(today, -11)}-a.webp`) && !files.includes(`${alice.id}/${addDays(today, -1)}-b.webp`));
  // nothing new from the coach
  await assert.rejects(upsert(coach, 'programs', { id: uuid(), coach_id: coach.id, client_id: alice.id, name: 'Late', days: [] }), DENIED);
  await assert.rejects(upsert(coach, 'meal_plans', { id: uuid(), coach_id: coach.id, client_id: alice.id, name: 'Late', targets: {} }), DENIED);
  await assert.rejects(as(coach, "insert into public.comments (client_id, body) values ($1, 'Hello?')", [alice.id]), DENIED);
  // still theirs: who she is, her goals, the coach's own notes and templates
  assert.equal((await rows(coach, 'select id from public.profiles where id = $1', [alice.id])).length, 1);
  assert.ok((await rows(coach, 'select key from public.client_settings where client_id = $1', [alice.id])).length > 0);
  await upsert(coach, 'programs', { id: uuid(), coach_id: coach.id, client_id: null, name: 'Template while waiting', days: [] });
  // a payment: from today (the days in between aren't charged), and the coach sees what she logged meanwhile
  assert.equal((await rows(coach, "select public.record_payment($1, 1500, 30, 'cash')::text as d", [alice.id]))[0].d, addDays(today, 29));
  assert.ok((await rows(coach, 'select id from public.workout_sessions where client_id = $1', [alice.id])).some(r => r.id === fresh));
  assert.equal((await rows(coach, "select id from public.comments where body = 'Are you there?'")).length, 1);
  await upsert(coach, 'programs', { id: uuid(), coach_id: coach.id, client_id: alice.id, name: 'Back on track', days: [] });
});

dbTest('renewal reminders: three days before and the day after, once each, to the client and the coach', async () => {
  const today = await cairoToday(), run = async () => (await db.query('select private.send_renewals() as n')).rows[0].n;
  await setPaid(addDays(today, 3));
  await clearCalls();
  assert.equal(await run(), 1);
  let jobs = await sentJobs();
  assert.deepEqual(jobs.map(j => [j.user, j.lang, j.title, j.url]).sort(), [
    [alice.id, 'ar', 'اشتراكك مع الكابتن بيخلص بعد ٣ أيام', './'],
    [coach.id, 'en', 'Alice A.', `coach.html#client=${alice.id}&tab=payments`]
  ].sort());
  assert.equal(jobs.find(j => j.user === coach.id).body, 'Subscription ends in 3 days');
  assert.equal(await run(), 0, 'once');
  await setPaid(addDays(today, -1));
  await clearCalls();
  assert.equal(await run(), 1);
  jobs = await sentJobs();
  assert.deepEqual(jobs.map(j => j.title).sort(), ['Alice A.', 'اشتراكك مع الكابتن خلص'].sort());
  // a paused client isn't reminded; a subscription ending another day isn't either
  await setPaid(addDays(today, 3));
  await db.query("update public.coach_clients set status = 'paused' where client_id = $1", [alice.id]);
  await db.query('delete from private.renewals_sent');
  assert.equal(await run(), 0);
  await db.query("update public.coach_clients set status = 'active' where client_id = $1", [alice.id]);
  await setPaid(addDays(today, 10));
  assert.equal(await run(), 0);
  assert.deepEqual((await db.query("select schedule, command from cron.job where jobname = 'gymlog-renewals'")).rows, [{ schedule: '7 7 * * *', command: 'select private.send_renewals()' }]);
  await assert.rejects(as(alice, 'select private.send_renewals()'), /permission denied/);
});

dbTest('coming back through a new invite starts afresh: an old subscription does not carry over', async () => {
  await setPaid('2020-01-31');
  await as(alice, "update public.coach_clients set status = 'archived'");
  const again = (await rows(coach, 'select public.create_invite() as code'))[0].code;
  await as(alice, 'select public.accept_invite($1)', [again]);
  assert.equal(await paidUntil(), null);
  assert.ok((await rows(coach, 'select id from public.workout_sessions where client_id = $1', [alice.id])).length > 0, 'the coach sees her log again');
});
