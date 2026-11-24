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
    meal_plans: [{ client_id: OMAR, name: 'Lean bulk', targets: { kcal: 2800, protein: 170 }, modified_at: ago(3) }],
    programs: [],
    notes: {}, invites: [{ code: 'OLDCODE23456', expires_at: ago(-3), created_at: ago(4) }]
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
    plans: async ids => db.meal_plans.filter(r => ids.includes(r.client_id)).map(plain),
    programs: async ids => db.programs.filter(r => ids.includes(r.client_id)).map(plain),
    note: async (me, id) => db.notes[id] || '',
    saveNote: async (me, id, body) => { calls.push(['saveNote', id, body]); db.notes[id] = body; },
    setStatus: async (me, id, status) => { calls.push(['setStatus', id, status]); db.links.find(l => l.client_id === id).status = status; },
    invites: async () => db.invites.map(plain),
    createInvite: async days => { calls.push(['createInvite', days]); const code = 'NEWCODE23456'; db.invites.unshift({ code, expires_at: ago(-days), created_at: ago(0) }); return code; },
    withdrawInvite: async code => { calls.push(['withdraw', code]); db.invites = db.invites.filter(i => i.code !== code); }
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
  const p = page(t, fakeApi(fixture()), { lang: 'ar' });
  await p.settle();
  // names, emails, codes and the exercises and foods people typed stay as written
  const english = () => [...p.doc.querySelectorAll('#view *, #mbox *, .c-top *')].filter(n => !n.children.length && /[A-Za-z]{3}/.test(n.textContent)
    && !n.closest('[translate=no], svg, .c-exname, .c-sets small, .c-sets span')).map(n => n.textContent);
  assert.equal(p.doc.documentElement.dir, 'rtl');
  assert.deepEqual(english(), []);
  for (const tab of ['summary', 'workouts', 'meals', 'body', 'notes']) {
    await p.go('#client=' + SARA + '&tab=' + tab);
    assert.deepEqual(english().filter(x => !/^(Bench press|Overhead press|Pull-ups|Squat)$/.test(x)), [], tab);
  }
  await p.go('#');
  p.click('ادعُ متدربًا');
  await p.settle();
  assert.deepEqual(english(), []);
  p.doc.getElementById('c-lang').click();
  await p.settle();
  assert.equal(p.doc.documentElement.dir, 'ltr');
  assert.match(p.doc.querySelector('.c-h1').textContent, /Clients/);
});
