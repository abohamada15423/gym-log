// The coach dashboard (coach.html, js/coach.js) against a fake server in memory.
// What the server allows a coach to read and write is tested on the real database rules in supabase/tests/.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('coach.html', 'utf8');

const COACH = { id: 'c0000000-0000-4000-8000-000000000000', email: 'coach@example.com' };
const SARA = '51000000-0000-4000-8000-000000000001', OMAR = '52000000-0000-4000-8000-000000000002';
const MONA = '53000000-0000-4000-8000-000000000003', YOUSSEF = '54000000-0000-4000-8000-000000000004';
const plain = v => JSON.parse(JSON.stringify(v));
const day = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const ago = n => new Date(Date.now() - n * 864e5).toISOString();

function fixture() {
  const push = { 'Bench press': [[60, 8], [60, 8], [62.5, 6]], 'Overhead press': [[35, 8], [35, 8]] };
  const s = (client, n, day_id, day_name, program_id, sets, note) => ({ id: 'w' + client.slice(0, 2) + n + day_id, client_id: client, date: day(n), day_id, day_name, program_id, sets, notes: null, note: note || null });
  const f = (client, n, name, kcal, p) => ({ id: 'f' + client.slice(0, 2) + n + name, client_id: client, date: day(n), name, kcal, p, c: null, f: null });
  const b = (client, n, kg, extra) => Object.assign({ id: 'b' + client.slice(0, 2) + n, client_id: client, date: day(n), kg, waist: null, chest: null, arm: null, thigh: null, hips: null, fat: null, note: null }, extra);
  return {
    profiles: { [COACH.id]: { id: COACH.id, full_name: 'Karim Mostafa', role: 'coach' }, [SARA]: { id: SARA, full_name: 'Sara Ali' }, [OMAR]: { id: OMAR, full_name: 'Omar Khaled' }, [MONA]: { id: MONA, full_name: 'Mona Adel' }, [YOUSSEF]: { id: YOUSSEF, full_name: 'Youssef Nabil' } },
    links: [
      { client_id: SARA, status: 'active', started_at: ago(40) }, { client_id: OMAR, status: 'active', started_at: ago(30) },
      { client_id: MONA, status: 'active', started_at: ago(25) }, { client_id: YOUSSEF, status: 'paused', started_at: ago(60) }
    ],
    workout_sessions: [
      s(SARA, 1, 'push', 'Push', 'split4', push, 'Felt strong today'), s(SARA, 3, 'pull', 'Pull', 'split4', { 'Pull-ups': [[0, 8]] }),
      s(SARA, 5, 'legs', 'Legs', 'split4', { Squat: [[80, 6]] }), s(SARA, 9, 'upper', 'Upper', 'split4', push),
      s(OMAR, 8, 'fbA', 'Full Body A', 'fb3', { Squat: [[60, 8]] }), s(MONA, 2, 'push', 'Push', 'ppl3', push), s(MONA, 4, 'legs', 'Legs', 'ppl3', { Squat: [[40, 10]] }),
      s(YOUSSEF, 21, 'a', 'Workout A', 's5x5', { Squat: [[100, 5]] })
    ],
    food_logs: [].concat(
      [0, 1, 2, 3, 4, 5, 6, 7].map(n => f(SARA, n, 'Chicken and rice', 900, 85)), [0, 1, 2, 3, 4, 5, 6, 7].map(n => f(SARA, n, 'Whey shake', 130, 84)),
      [1, 2, 3, 4].map(n => f(OMAR, n, 'Koshary', 800, 54))
    ),
    body_checkins: [b(SARA, 33, 75.4, { waist: 82 }), b(SARA, 19, 74.1), b(SARA, 5, 72.9, { waist: 79.5 }), b(OMAR, 20, 68.4), b(MONA, 24, 63.6), b(MONA, 16, 63.4), b(MONA, 2, 64.5)],
    habit_days: [{ client_id: SARA, date: day(0), data: { creatine: true } }],
    client_settings: [{ client_id: SARA, key: 'goals', value: { kg: 70, protein: 170, kcal: 1900 } }, { client_id: MONA, key: 'goals', value: { kg: 60 } }],
    meal_plans: [{ id: 'plan-omar', coach_id: COACH.id, client_id: OMAR, name: 'Lean bulk', active: true, targets: { kcal: 2800, protein: 170 }, meals: [{ name: 'Breakfast', items: ['4 eggs', 'Oats'], kcal: 700, p: 45 }], modified_at: ago(3) }],
    programs: [],
    notes: {}, invites: [{ code: 'OLDCODE23456', expires_at: ago(-3), created_at: ago(4) }],
    comments: []
  };
}

function fakeApi(db, opts = {}) {
  const calls = [];
  const api = {
    calls,
    user: async () => opts.signedOut ? null : COACH,
    signIn: async (email, pw) => { calls.push(['signIn', email]); if (pw !== 'right-password') throw Object.assign(new Error('Invalid login credentials'), { code: 'invalid_credentials' }); opts.signedOut = false; return COACH; },
    signOut: async () => { calls.push(['signOut']); opts.signedOut = true; },
    profile: async id => db.profiles[id] || null,
    links: async () => db.links.filter(l => l.status !== 'archived').map(plain),
    profiles: async ids => ids.map(id => db.profiles[id]).filter(Boolean).map(plain),
    rows: async (table, ids, cols, from) => db[table].filter(r => ids.includes(r.client_id) && (!from || r.date >= from)).map(plain),
    plans: async ids => db.meal_plans.filter(r => ids.includes(r.client_id) && r.active !== false && !r.deleted_at).map(plain),
    programs: async ids => db.programs.filter(r => ids.includes(r.client_id) && r.active !== false && !r.deleted_at).map(plain),
    templates: async table => db[table].filter(r => r.coach_id === COACH.id && r.client_id == null && !r.deleted_at).map(plain),
    insertRow: async (table, row) => { const id = table + '-' + (db[table].length + 1); calls.push(['insert', table, row.client_id, row.name]); db[table].push(Object.assign({ id }, plain(row))); return id; },
    updateRow: async (table, id, fields) => { calls.push(['update', table, id, Object.keys(fields).sort().join(',')]); Object.assign(db[table].find(r => r.id === id), plain(fields)); },
    retire: async (table, me, clientId, keepId) => { calls.push(['retire', table, clientId, keepId]); db[table].forEach(r => { if (r.client_id === clientId && r.active && r.id !== keepId) r.active = false; }); },
    note: async (me, id) => db.notes[id] || '',
    saveNote: async (me, id, body) => { calls.push(['saveNote', id, body]); db.notes[id] = body; },
    setStatus: async (me, id, status) => { calls.push(['setStatus', id, status]); db.links.find(l => l.client_id === id).status = status; },
    invites: async () => db.invites.map(plain),
    createInvite: async days => { calls.push(['createInvite', days]); const code = 'NEWCODE23456'; db.invites.unshift({ code, expires_at: ago(-days), created_at: ago(0) }); return code; },
    withdrawInvite: async code => { calls.push(['withdraw', code]); db.invites = db.invites.filter(i => i.code !== code); },
    // comments, like public.comment_inbox() and mark_comments_read() in 0003_comments_push.sql
    inbox: async () => db.links.filter(l => l.status !== 'archived').map(l => {
      const live = db.comments.filter(c => c.client_id === l.client_id && !c.deleted_at).sort((a, b) => a.created_at < b.created_at ? -1 : 1), last = live[live.length - 1];
      return { client_id: l.client_id, unread: live.filter(c => c.author_id === l.client_id && !c.read_at).length, waiting: !!last && last.author_id === l.client_id, last_at: last ? last.created_at : null };
    }),
    comments: async id => db.comments.filter(c => c.client_id === id && !c.deleted_at).sort((a, b) => a.created_at < b.created_at ? -1 : 1).map(plain),
    addComment: async row => { calls.push(['addComment', row.client_id, row.target_type, row.target_ref, row.body]); db.comments.push(Object.assign({ created_at: new Date().toISOString(), read_at: null, deleted_at: null }, plain(row))); },
    removeComment: async id => { calls.push(['removeComment', id]); db.comments.find(c => c.id === id).deleted_at = new Date().toISOString(); },
    markRead: async (client, ids) => {
      calls.push(['markRead', client, plain(ids).sort()]);
      db.comments.forEach(c => { if (c.client_id === client && ids.includes(c.id) && c.author_id !== COACH.id && !c.read_at) c.read_at = new Date().toISOString(); });
    },
    savePush: async row => { calls.push(['savePush', row.user_id, row.endpoint, row.lang]); },
    dropPush: async (me, endpoint) => { calls.push(['dropPush', me, endpoint]); }
  };
  return api;
}

function page(t, api, opts = {}) {
  const dom = new JSDOM(html, { url: 'https://example.com/gym-log/coach.html' + (opts.hash || ''), runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const w = dom.window;
  w.matchMedia = () => ({ matches: true });
  w.requestAnimationFrame = () => 1;
  w.scrollTo = () => {};
  w.confirm = () => true;
  if (opts.lang) w.localStorage.setItem('gymlog-coach', JSON.stringify({ lang: opts.lang }));
  if (opts.appData) w.localStorage.setItem('gymlog-v1', opts.appData);
  w.coachApi = api;
  for (const script of w.document.querySelectorAll('script')) {
    const src = script.getAttribute('src');
    if (src === 'js/vendor/supabase.js') continue;  // the fake server stands in for it
    w.eval(src ? fs.readFileSync(src, 'utf8') : script.textContent);
  }
  const doc = w.document;
  const settle = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise(r => w.setTimeout(r, 0)); };
  const go = async hash => { w.location.hash = hash; await settle(10); };
  const rows = () => [...doc.querySelectorAll('.c-group')].map(g => ({ title: g.querySelector('.c-h2').firstChild.textContent, rows: [...g.querySelectorAll('a.crow')].map(r => r.textContent) }));
  const click = text => { const b = [...doc.querySelectorAll('button, a')].find(x => x.textContent === text); assert.ok(b, 'Missing: ' + text); b.click(); };
  return { w, doc, settle, go, rows, click };
}

test('the roster sorts clients into needs you, on track and paused, with their week, protein and weight', async t => {
  const p = page(t, fakeApi(fixture()));
  await p.settle();
  const groups = p.rows();
  assert.deepEqual(groups.map(g => g.title), ['Needs you', 'On track', 'Paused']);
  assert.match(p.doc.querySelector('.c-lead').textContent, /2 clients need you today/);
  const [omar, mona] = groups[0].rows;
  assert.match(omar, /Omar Khaled.*Active yesterday.*0 of 3.*54 g.*of 170 g.*68\.4 kg.*No workout for 8 days.*Protein under 80% for 3 days.*No check-in for 20 days/);
  assert.match(mona, /Mona Adel.*2 of 3.*No meals logged.*64\.5 kg.*▲ 1\.1 kg in 2 weeks.*Weight moving away from the goal/);
  assert.match(groups[1].rows[0], /Sara Ali.*Active today.*3 of 4.*169 g.*of 170 g.*72\.9 kg.*▼ 1\.2 kg in 2 weeks.*On track/);
  assert.match(groups[2].rows[0], /Youssef Nabil.*Paused/);
  assert.doesNotMatch(groups[2].rows[0], /No workout/, 'paused clients get no flags');
  // the week as tally marks: one per planned workout, lime for each one done
  const sara = [...p.doc.querySelectorAll('a.crow')].find(r => /Sara/.test(r.textContent));
  assert.equal(sara.querySelectorAll('.wtally i').length, 4);
  assert.equal(sara.querySelectorAll('.wtally i.on').length, 3);
  assert.equal(p.doc.querySelectorAll('.c-colhead').length, 1, 'column headings once');
});

test('flags: their thresholds, and none for a client who has just joined', async t => {
  const p = page(t, fakeApi(fixture()));
  await p.settle();  // let the page finish loading before the window closes
  const sum = d => JSON.parse(JSON.stringify(p.w.clientSummary(Object.assign({ sessions: [], food: [], body: [], habits: [], goals: {} }, d), day(0))));
  const flags = d => sum(d).flags.map(f => f.k);
  const w = n => ({ date: day(n), program_id: 'split4' });
  assert.deepEqual(flags({ sessions: [w(4)], startedAt: ago(30), body: [{ date: day(1), kg: 80 }] }), [], '4 days without a workout is fine');
  assert.deepEqual(flags({ sessions: [w(5)], startedAt: ago(30), body: [{ date: day(1), kg: 80 }] }), ['workout']);
  assert.deepEqual(flags({ startedAt: ago(3) }), [], 'joined 3 days ago: nothing to flag yet');
  assert.deepEqual(flags({ startedAt: ago(15), sessions: [w(1)] }), ['checkin'], 'no check-in in the 15 days since joining');
  const meals = pct => [1, 2, 3].map(n => ({ date: day(n), p: 200 * pct }));
  assert.deepEqual(flags({ sessions: [w(1)], body: [{ date: day(1), kg: 80 }], food: meals(0.79), goals: { protein: 200 } }), ['protein']);
  assert.deepEqual(flags({ sessions: [w(1)], body: [{ date: day(1), kg: 80 }], food: meals(0.81), goals: { protein: 200 } }), []);
  assert.deepEqual(flags({ sessions: [w(1)], body: [{ date: day(1), kg: 80 }], food: meals(0.5) }), [], 'no target, no protein flag');
  assert.deepEqual(flags({ sessions: [w(1)], body: [{ date: day(1), kg: 80 }], food: meals(0.5), plan: { targets: { protein: 200 } } }), ['protein'], "the coach's meal plan sets the target");
  const kg = (a, b) => [{ date: day(16), kg: a }, { date: day(2), kg: b }];
  assert.deepEqual(flags({ sessions: [w(1)], body: kg(80, 81), goals: { kg: 75 } }), ['weight'], 'cutting but up 1 kg');
  assert.deepEqual(flags({ sessions: [w(1)], body: kg(80, 80.2), goals: { kg: 75 } }), [], 'under 0.3 kg is noise');
  assert.deepEqual(flags({ sessions: [w(1)], body: kg(80, 81), goals: { kg: 85 } }), [], 'gaining towards the goal');
  assert.deepEqual(flags({ sessions: [w(1)], body: kg(80, 81) }), [], 'no goal weight, nothing to judge');
  assert.equal(sum({ sessions: [w(1), w(3)], program: { days: [1, 2, 3, 4, 5] } }).planned, 5, "the coach's program sets the plan");
  assert.equal(sum({ sessions: [{ date: day(1), program_id: 'custom' }], custom: { days: [1, 2] } }).planned, 2);
  assert.equal(sum({ food: [{ date: day(0), p: 999 }, { date: day(1), p: 100 }, { date: day(2), p: 120 }] }).protein, 110, "today doesn't count until it's over");
});

test("a client's page shows their week, workouts, meals against targets and check-ins, and never writes to this device", async t => {
  const saved = JSON.stringify({ sessions: [{ id: 'mine', date: '2026-01-01', sets: {} }], body: [] });
  const p = page(t, fakeApi(fixture()), { appData: saved });
  await p.settle();
  await p.go('#client=' + SARA);
  const view = () => p.doc.getElementById('view').textContent;
  assert.match(view(), /Sara Ali/);
  assert.match(view(), /Client since/);
  assert.ok(p.doc.querySelector('.wk'), "the Progress tab's week card");
  assert.ok(p.doc.querySelector('.cal'), 'the calendar');
  assert.ok(p.doc.querySelector('.mcard'), 'the muscle map');
  assert.match(view(), /3 week streak|week streak/);
  p.doc.querySelector('.mnav').click();  // the calendar's month buttons redraw this page
  await p.settle();
  await p.go('#client=' + SARA + '&tab=workouts');
  assert.match(view(), /Bench press.*60 × 8, 60 × 8, 62\.5 × 6/);
  assert.match(view(), /Their note.*Felt strong today/);
  await p.go('#client=' + SARA + '&tab=meals');
  assert.match(view(), /Targets the client set/);
  assert.match(view(), /1,030 kcal.*of 1,900 kcal.*169 g protein.*of 170 g protein/);
  await p.go('#client=' + SARA + '&tab=body');
  assert.match(view(), /Weight.*72\.9 kg/);
  assert.match(view(), /Check-ins/);
  await p.go('#client=' + OMAR + '&tab=meals');
  assert.match(view(), /Targets from your meal plan/);
  assert.equal(p.w.localStorage.getItem('gymlog-v1'), saved, "this device's own log is untouched");
});

test('private notes save as you type, and only the coach sees them', async t => {
  const api = fakeApi(fixture());
  const p = page(t, api);
  await p.settle();
  await p.go('#client=' + SARA + '&tab=notes');
  const area = p.doc.querySelector('textarea.c-notes');
  area.value = 'Knee pain on squats, keep depth above parallel';
  area.dispatchEvent(new p.w.Event('input'));
  area.dispatchEvent(new p.w.Event('blur'));
  await p.settle();
  assert.deepEqual(api.calls.filter(c => c[0] === 'saveNote'), [['saveNote', SARA, 'Knee pain on squats, keep depth above parallel']]);
  assert.match(p.doc.getElementById('view').textContent, /Saved\. Only you see these notes/);
  await p.go('#client=' + SARA + '&tab=summary');
  await p.go('#client=' + SARA + '&tab=notes');
  assert.equal(p.doc.querySelector('textarea.c-notes').value, 'Knee pain on squats, keep depth above parallel');
});

test('pause, resume and remove a client', async t => {
  const api = fakeApi(fixture());
  const p = page(t, api);
  await p.settle();
  await p.go('#client=' + SARA);
  p.click('Pause');
  await p.settle(12);
  assert.deepEqual(api.calls.at(-1), ['setStatus', SARA, 'paused']);
  assert.match(p.doc.querySelector('.c-h1').textContent, /Paused/);
  p.click('Resume');
  await p.settle(12);
  assert.deepEqual(api.calls.at(-1), ['setStatus', SARA, 'active']);
  p.click('Remove client');
  await p.settle(12);
  assert.deepEqual(api.calls.at(-1), ['setStatus', SARA, 'archived']);
  assert.ok(p.doc.querySelector('.c-roster'), 'back to the roster');
  assert.doesNotMatch(p.doc.getElementById('view').textContent, /Sara Ali/);
});

test('invites: make a code, get the link, see open codes and withdraw one', async t => {
  const api = fakeApi(fixture());
  const p = page(t, api);
  await p.settle();
  p.click('Invite a client');
  await p.settle();
  assert.match(p.doc.getElementById('mbox').textContent, /OLDC ODE2 3456.*Expires in 3 days/);
  p.click('Make an invite code');
  await p.settle();
  assert.deepEqual(api.calls.at(-1), ['createInvite', 7]);
  assert.equal(p.doc.querySelector('.inv-code').textContent, 'NEWC ODE2 3456');
  assert.equal(p.doc.querySelector('.inv-link').textContent, 'https://example.com/gym-log/?invite=NEWCODE23456');
  await p.settle();
  p.click('Withdraw');
  await p.settle(10);
  assert.deepEqual(api.calls.at(-1), ['withdraw', 'OLDCODE23456']);
  assert.doesNotMatch(p.doc.getElementById('mbox').textContent, /OLDC/);
});

test('signing in, and an account that is not a coach is told so', async t => {
  const db = fixture(), api = fakeApi(db, { signedOut: true });
  const p = page(t, api);
  await p.settle();
  assert.match(p.doc.getElementById('view').textContent, /Coach sign-in/);
  p.doc.querySelector('input[type=email]').value = COACH.email;
  p.doc.querySelector('input[type=password]').value = 'wrong';
  p.doc.querySelector('form').dispatchEvent(new p.w.Event('submit'));
  await p.settle();
  assert.equal(p.doc.querySelector('.form-err').textContent, 'Wrong email or password');
  p.doc.querySelector('input[type=password]').value = 'right-password';
  p.doc.querySelector('form').dispatchEvent(new p.w.Event('submit'));
  await p.settle(12);
  assert.ok(p.doc.querySelector('.c-roster'));
  p.doc.getElementById('c-out').click();
  await p.settle();
  assert.match(p.doc.getElementById('view').textContent, /Coach sign-in/);

  db.profiles[COACH.id].role = 'client';
  const q = page(t, fakeApi(db));
  await q.settle();
  assert.match(q.doc.getElementById('view').textContent, /This page is for coaches/);
});

test('the dashboard is fully in Arabic when chosen', async t => {
  const p = page(t, fakeApi(withComments(fixture())), { lang: 'ar' });
  await p.settle();
  // names, emails, codes and the exercises and foods people typed stay as written
  // text still in English: Latin words and no Arabic at all (a translated line may carry a name)
  const english = () => [...p.doc.querySelectorAll('#view *, #mbox *, .c-top *')].filter(n => !n.children.length && /[A-Za-z]{3}/.test(n.textContent) && !/[\u0600-\u06FF]/.test(n.textContent)
    && !n.closest('[translate=no], svg, .c-exname, .c-sets small, .c-sets span')).map(n => n.textContent);
  assert.equal(p.doc.documentElement.dir, 'rtl');
  assert.deepEqual(english(), []);
  for (const tab of ['summary', 'comments', 'workouts', 'meals', 'body', 'program', 'mealplan', 'notes']) {
    await p.go('#client=' + SARA + '&tab=' + tab);
    assert.deepEqual(english().filter(x => !/^(Bench press|Overhead press|Pull-ups|Squat)$/.test(x)), [], tab);
  }
  // the editors and the templates page
  const opts = () => [...p.doc.querySelectorAll('.c-start option, .c-start optgroup')].map(o => o.label || o.textContent).filter(t => /^(A blank|Built-in|Your templates|The app's|What they follow)/.test(t));
  await p.go('#client=' + SARA + '&tab=program');
  assert.deepEqual(opts(), [], 'start menu');
  p.doc.querySelector('.c-start button').click(); await p.settle();
  assert.deepEqual(english(), [], 'program editor');
  await p.go('#client=' + SARA + '&tab=mealplan');
  p.doc.querySelector('.c-start select').value = 'example';
  p.doc.querySelector('.c-start button').click(); await p.settle();
  assert.deepEqual(english().filter(x => !/^(Breakfast|Lunch|Dinner)$/.test(x)), [], 'meal plan editor');
  await p.go('#templates');
  assert.deepEqual(english(), [], 'templates');
  await p.go('#');
  p.click('ادعُ متدربًا');
  await p.settle();
  assert.deepEqual(english(), []);
  p.doc.getElementById('c-lang').click();
  await p.settle();
  assert.equal(p.doc.documentElement.dir, 'ltr');
  assert.match(p.doc.querySelector('.c-h1').textContent, /Clients/);
});

test('the coach writes a program from a built-in one, edits a day in the app\'s own editor, and sends it', async t => {
  const db = fixture(), api = fakeApi(db);
  const p = page(t, api);
  await p.settle();
  await p.go('#client=' + SARA + '&tab=program');
  const view = () => p.doc.getElementById('view').textContent;
  assert.match(view(), /No program from you yet\. They follow My Split: Push \/ Pull \/ Legs \/ Upper in the app\./);
  const sel = p.doc.querySelector('.c-start select');
  sel.value = 'p:ul4';
  p.click('Write the program');
  await p.settle();
  const name = p.doc.querySelector('.c-editor input');
  assert.equal(name.value, 'Upper / Lower');
  name.value = 'Upper / Lower for Sara'; name.dispatchEvent(new p.w.Event('input'));
  assert.equal(p.doc.querySelectorAll('.c-editday').length, 4);
  p.doc.querySelector('.c-editday button').click();  // Edit day: the app's day editor opens
  await p.settle();
  assert.match(p.doc.getElementById('mbox').textContent, /Edit Day/);
  const sets = p.doc.querySelector('#mbox .eedit input');
  sets.value = '5'; sets.dispatchEvent(new p.w.Event('input'));
  p.click('Done');
  await p.settle();
  assert.equal(p.doc.getElementById('modal').hidden, true);
  assert.equal(p.w.state.sessions.length, 4, "the client's own log is back on screen");
  p.click('Send to Sara Ali');
  await p.settle(14);
  assert.deepEqual(api.calls.filter(c => c[0] === 'insert' || c[0] === 'retire'), [['insert', 'programs', SARA, 'Upper / Lower for Sara'], ['retire', 'programs', SARA, 'programs-1']]);
  const sent = db.programs[0];
  assert.equal(sent.active, true);
  assert.equal(sent.days.length, 4);
  assert.equal(sent.days[0].ex[0][1], 5, 'the change from the day editor was sent');
  assert.match(view(), /Upper \/ Lower for Sara.*Sent/);
  assert.match(view(), /Edit program.*Stop this program/);
  assert.equal(p.w.localStorage.getItem('gymlog-v1'), null, 'nothing written to the device');
});

test('editing the current program updates it in place; it can be stopped, and saved as a template to reuse', async t => {
  const db = fixture(), api = fakeApi(db);
  db.programs.push({ id: 'prog-sara', coach_id: COACH.id, client_id: SARA, name: 'Cut phase', active: true, modified_at: ago(2), days: [{ id: 'a', name: 'Heavy', ex: [['Squat', 5, '5', 'Quads · Glutes', 150]] }] });
  const p = page(t, api);
  await p.settle();
  await p.go('#client=' + SARA + '&tab=program');
  assert.match(p.doc.getElementById('view').textContent, /Cut phase.*Heavy.*Squat.*5 × 5/);
  p.click('Edit program');
  await p.settle();
  const name = p.doc.querySelector('.c-editor input');
  name.value = 'Cut phase, week 2'; name.dispatchEvent(new p.w.Event('input'));
  p.click('Save as template');
  await p.settle(10);
  assert.deepEqual(api.calls.at(-1), ['insert', 'programs', null, 'Cut phase, week 2']);
  p.click('Send to Sara Ali');
  await p.settle(14);
  assert.ok(api.calls.some(c => c[0] === 'update' && c[1] === 'programs' && c[2] === 'prog-sara'), 'updated in place');
  assert.ok(!api.calls.some(c => c[0] === 'insert' && c[2] === SARA), 'no second program for her');
  assert.equal(db.programs.find(r => r.id === 'prog-sara').name, 'Cut phase, week 2');
  // the template is offered on any client's page
  await p.go('#client=' + MONA + '&tab=program');
  const opts = [...p.doc.querySelectorAll('.c-start optgroup')].map(g => g.label + ': ' + [...g.querySelectorAll('option')].map(o => o.textContent).join(', '));
  assert.ok(opts.includes('Your templates: Cut phase, week 2'), JSON.stringify(opts));
  await p.go('#client=' + SARA + '&tab=program');
  p.click('Stop this program');
  await p.settle(14);
  assert.equal(db.programs.find(r => r.id === 'prog-sara').active, false);
  assert.match(p.doc.getElementById('view').textContent, /No program from you yet/);
});

test('a meal plan: targets and meals, checked before it is sent', async t => {
  const db = fixture(), api = fakeApi(db);
  const p = page(t, api);
  await p.settle();
  await p.go('#client=' + OMAR + '&tab=mealplan');
  const view = () => p.doc.getElementById('view').textContent;
  assert.match(view(), /Lean bulk.*2,800 kcal.*170 g protein.*Breakfast.*700 kcal, 45 g protein.*4 eggs.*Oats/);
  const sel = p.doc.querySelector('.c-start select');
  sel.value = 'example';
  p.click('Write the meal plan');
  await p.settle();
  const inputs = () => [...p.doc.querySelectorAll('.c-editor input')];
  assert.equal(p.doc.querySelectorAll('.c-meal').length, 3, "the app's three example meals");
  const set = (el, v) => { el.value = v; el.dispatchEvent(new p.w.Event('input')); };
  set(inputs()[0], 'Cut for Omar');
  set(inputs()[1], '500');  // calories a day: too low
  p.click('Send to Omar Khaled');
  await p.settle(8);
  assert.equal(p.doc.getElementById('toast').textContent, 'Calories a day must be 800–8000 kcal');
  assert.ok(!api.calls.some(c => c[0] === 'insert'), 'nothing sent');
  set(inputs()[1], '2300'); set(inputs()[2], '180');
  p.click('Send to Omar Khaled');
  await p.settle(14);
  const sent = db.meal_plans.find(r => r.name === 'Cut for Omar');
  assert.deepEqual(plain(sent.targets), { kcal: 2300, protein: 180 });
  assert.equal(sent.meals.length, 3);
  assert.equal(sent.meals[0].name, 'Breakfast');
  assert.ok(sent.meals[0].items.length > 1);
  assert.equal(db.meal_plans.find(r => r.id === 'plan-omar').active, false, 'the old plan is switched off');
  assert.match(view(), /Cut for Omar.*2,300 kcal.*180 g protein/);
});

test('templates: write one, edit it, delete it', async t => {
  const db = fixture(), api = fakeApi(db);
  const p = page(t, api);
  await p.settle();
  assert.equal(p.doc.getElementById('c-nav').hidden, false);
  await p.go('#templates');
  const view = () => p.doc.getElementById('view').textContent;
  assert.match(view(), /No program templates yet.*No meal plan templates yet/);
  const sel = p.doc.querySelector('.c-start select');
  sel.value = 'p:fb3';
  p.doc.querySelectorAll('.c-start button')[0].click();
  await p.settle();
  p.click('Save template');
  await p.settle(12);
  assert.deepEqual(api.calls.at(-1), ['insert', 'programs', null, 'Full Body']);
  assert.match(view(), /Programs1.*Full Body.*3 days/);
  p.click('Delete');
  await p.settle(12);
  assert.ok(db.programs[0].deleted_at, 'soft-deleted, like everything else');
  assert.match(view(), /No program templates yet/);
});

// ---- phase 4: comments ------------------------------------------------------------------------
// Sara's thread: the coach wrote first, then two of hers are waiting.
function withComments(db) {
  const at = n => new Date(Date.now() - n * 60000).toISOString();
  const sess = db.workout_sessions.find(w => w.client_id === SARA && w.day_id === 'push');
  db.comments = [
    { id: 'cm-1', client_id: SARA, author_id: COACH.id, target_type: 'general', target_ref: null, body: 'Welcome! Log everything, I check daily.', created_at: at(300), read_at: at(200), deleted_at: null },
    { id: 'cm-2', client_id: SARA, author_id: SARA, target_type: 'session', target_ref: sess.id, body: 'Was 62.5 too heavy?', created_at: at(60), read_at: null, deleted_at: null },
    { id: 'cm-3', client_id: SARA, author_id: SARA, target_type: 'general', target_ref: null, body: 'Also, can I swap rice for potatoes?', created_at: at(30), read_at: null, deleted_at: null }
  ];
  return db;
}
const submit = (p, form, text) => { form.querySelector('textarea').value = text; form.dispatchEvent(new p.w.Event('submit', { cancelable: true })); };

test('comments: the roster shows new ones and who waits for a reply; the thread marks them read; answering clears it', async t => {
  const db = withComments(fixture()), api = fakeApi(db), p = page(t, api);
  await p.settle();
  const groups = p.rows();
  const sara = groups[0].rows.find(r => /Sara Ali/.test(r));
  assert.match(sara, /Sara Ali.*2 new comments.*Waiting for your reply/, 'Sara moves to Needs you: ' + JSON.stringify(groups.map(g => g.title)));
  assert.match(p.doc.querySelector('.c-lead').textContent, /3 clients need you today/);

  await p.go('#client=' + SARA + '&tab=summary');
  const tab = p.doc.querySelector('.c-tabs a[href$="tab=comments"]');
  assert.equal(tab.querySelector('.c-tabn').textContent, '2');
  await p.go('#client=' + SARA + '&tab=comments');
  const thread = p.doc.querySelector('.cm-thread');
  assert.match(thread.textContent, /You.*Welcome!.*Sara Ali.*Push · .*Was 62\.5 too heavy\?.*Sara Ali.*swap rice/);
  assert.deepEqual(api.calls.filter(c => c[0] === 'markRead'), [['markRead', SARA, ['cm-2', 'cm-3']]]);
  assert.equal(p.doc.querySelector('.c-tabs a[href$="tab=comments"] .c-tabn').textContent, '', 'the count is gone');

  // answer the workout question: it stays about that workout
  [...thread.querySelectorAll('.cm.theirs')].find(n => /too heavy/.test(n.textContent)).querySelector('button').click();
  assert.match(thread.querySelector('.cm-to').textContent, /About Push/);
  submit(p, thread.querySelector('form'), 'No, keep it and add a rep.');
  await p.settle();
  const sess = db.workout_sessions.find(w => w.client_id === SARA && w.day_id === 'push');
  assert.deepEqual(api.calls.filter(c => c[0] === 'addComment'), [['addComment', SARA, 'session', sess.id, 'No, keep it and add a rep.']]);
  assert.match(p.doc.querySelector('.cm-thread').textContent, /No, keep it and add a rep\./);
  await p.go('#');
  assert.doesNotMatch(p.rows().map(g => g.rows.join(' ')).join(' '), /Waiting for your reply|new comment/);
});

test('comments on a workout, a day of meals and a check-in, from the client page', async t => {
  const db = fixture(), api = fakeApi(db), p = page(t, api);
  await p.settle();
  await p.go('#client=' + SARA + '&tab=workouts');
  const firstEntry = p.doc.querySelector('.c-entry');
  firstEntry.querySelector('.cm-open').click();
  submit(p, firstEntry.querySelector('.cm-compose'), 'Strong week.');
  await p.settle();
  await p.go('#client=' + SARA + '&tab=meals');
  const dayBox = p.doc.querySelector('details.c-day');
  dayBox.open = true;
  dayBox.querySelector('.cm-open').click();
  submit(p, dayBox.querySelector('.cm-compose'), 'More protein at lunch.');
  await p.settle();
  await p.go('#client=' + SARA + '&tab=body');
  const check = p.doc.querySelectorAll('.c-log')[0].querySelector('.c-entry');
  check.querySelector('.cm-open').click();
  submit(p, check.querySelector('.cm-compose'), 'Waist down, great.');
  await p.settle();
  const added = api.calls.filter(c => c[0] === 'addComment').map(c => [c[2], c[4]]);
  assert.deepEqual(added, [['session', 'Strong week.'], ['food_day', 'More protein at lunch.'], ['checkin', 'Waist down, great.']]);
  const refs = api.calls.filter(c => c[0] === 'addComment').map(c => c[3]);
  assert.equal(refs[0], db.workout_sessions.filter(w => w.client_id === SARA).sort((a, b) => a.date < b.date ? 1 : -1)[0].id, 'the newest workout');
  assert.match(refs[1], /^\d{4}-\d\d-\d\d$/, 'a day of meals is its date');
  assert.equal(refs[2], db.body_checkins.filter(b => b.client_id === SARA).sort((a, b) => a.date < b.date ? 1 : -1)[0].id, 'the newest check-in');
  // and the day of meals now says it has a comment
  await p.go('#client=' + SARA + '&tab=meals');
  assert.match(p.doc.querySelector('details.c-day summary').textContent, /1 comment/);
});

test('notifications in this browser: one button that saves and forgets the subscription', async t => {
  const api = fakeApi(fixture()), p = page(t, api);
  let sub = null;
  p.w.Notification = { permission: 'default', requestPermission: async () => { p.w.Notification.permission = 'granted'; return 'granted'; } };
  p.w.PushManager = function () { };
  const reg = { pushManager: { getSubscription: async () => sub, subscribe: async () => (sub = { endpoint: 'https://web.push.apple.com/coach-1', options: {}, toJSON: () => ({ endpoint: 'https://web.push.apple.com/coach-1', keys: { p256dh: 'B' + 'A'.repeat(86), auth: 'C'.repeat(22) } }) }) } };
  Object.defineProperty(p.w.navigator, 'serviceWorker', { configurable: true, value: { register: async () => reg, ready: Promise.resolve(reg), getRegistration: async () => reg, addEventListener: () => {} } });
  await p.settle();
  p.w.render();
  const bell = p.doc.getElementById('c-bell');
  assert.equal(bell.hidden, false);
  assert.equal(bell.getAttribute('aria-pressed'), 'false');
  bell.click(); await p.settle();
  assert.deepEqual(api.calls.filter(c => c[0] === 'savePush'), [['savePush', COACH.id, 'https://web.push.apple.com/coach-1', 'en']]);
  assert.equal(bell.getAttribute('aria-pressed'), 'true');
  bell.click(); await p.settle();
  assert.deepEqual(api.calls.filter(c => c[0] === 'dropPush'), [['dropPush', COACH.id, 'https://web.push.apple.com/coach-1']]);
  assert.equal(bell.getAttribute('aria-pressed'), 'false');
});
