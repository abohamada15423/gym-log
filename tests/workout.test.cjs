const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('index.html', 'utf8');

function app(t, saved) {
  const dom = new JSDOM(html, { url: 'https://example.com/gym-log/', runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const w = dom.window;
  w.matchMedia = () => ({ matches: true });
  w.requestAnimationFrame = () => 1;
  w.cancelAnimationFrame = () => {};
  w.scrollTo = () => {};
  w.HTMLCanvasElement.prototype.getContext = () => ({});
  if (saved) w.localStorage.setItem('gymlog-v1', JSON.stringify(saved));
  // Run the page's scripts in order, reading external ones from disk like the browser would.
  for (const script of w.document.querySelectorAll('script')) {
    const src = script.getAttribute('src');
    w.eval(src ? fs.readFileSync(src, 'utf8') : script.textContent);
  }
  const doc = w.document;
  const click = text => {
    const button = [...doc.querySelectorAll('button')].find(b => b.textContent === text);
    assert.ok(button, `Missing button: ${text}`);
    button.click();
  };
  const input = (el, value) => { el.value = value; el.dispatchEvent(new w.Event('input')); };
  return { w, doc, click, input, state: () => JSON.parse(w.localStorage.getItem('gymlog-v1')) };
}

test('date survives completing and undoing sets, and reloading the app', t => {
  const a = app(t);
  const date = a.doc.querySelector('input[type=date]');
  date.value = '2026-10-20';
  date.dispatchEvent(new a.w.Event('change'));
  const row = a.doc.querySelector('.set');
  a.input(row.querySelectorAll('input')[0], '60');
  a.input(row.querySelectorAll('input')[1], '6');
  row.querySelector('.chk').click();
  assert.equal(a.doc.querySelector('input[type=date]').value, '2026-10-20');
  assert.equal(a.doc.querySelector('.chk').getAttribute('aria-pressed'), 'true');
  a.doc.querySelector('.chk').click();
  assert.equal(a.doc.querySelector('input[type=date]').value, '2026-10-20');
  assert.equal(a.doc.querySelector('.chk').getAttribute('aria-pressed'), 'false');
  const reloaded = app(t, a.state());
  assert.equal(reloaded.doc.querySelector('input[type=date]').value, '2026-10-20');
});

test('finish reviews checked sets only; cancel keeps draft; save clears draft and timer', t => {
  const a = app(t);
  const date = a.doc.querySelector('input[type=date]');
  date.value = '2026-10-20';
  date.dispatchEvent(new a.w.Event('change'));
  assert.equal(a.doc.querySelector('.session-dock .btn').disabled, true);
  const rows = a.doc.querySelectorAll('.set');
  a.input(rows[0].querySelectorAll('input')[0], '60');
  a.input(rows[0].querySelectorAll('input')[1], '6');
  a.input(rows[1].querySelectorAll('input')[0], '70');
  a.input(rows[1].querySelectorAll('input')[1], '5');
  rows[0].querySelector('.chk').click();
  a.click('Finish');
  assert.match(a.doc.getElementById('mbox').textContent, /1 of 20 sets/);
  assert.equal(a.state().sessions.length, 0);
  a.click('Keep training');
  assert.equal(a.doc.getElementById('modal').hidden, true);
  assert.equal(a.state().drafts.push['Bench press'][1].w, '70');
  a.click('Finish');
  a.click('Save workout');
  assert.deepEqual(a.state().sessions[0].sets, { 'Bench press': [[60, 6]] });
  assert.equal(a.state().sessions[0].date, '2026-10-20');
  assert.equal(a.state().drafts.push, undefined);
  assert.equal(a.doc.getElementById('rest').hidden, true);
});

test('invalid values cannot complete a set; zero weight is valid for bodyweight sets', t => {
  const a = app(t);
  for (const [weight, reps] of [['-1', '6'], ['60', '0'], ['60', '2.5']]) {
    const row = a.doc.querySelector('.set');
    a.input(row.querySelectorAll('input')[0], weight);
    a.input(row.querySelectorAll('input')[1], reps);
    row.querySelector('.chk').click();
    assert.equal(a.doc.querySelector('.chk').getAttribute('aria-pressed'), 'false');
  }
  const row = a.doc.querySelector('.set');
  a.input(row.querySelectorAll('input')[0], '0');
  a.input(row.querySelectorAll('input')[1], '10');
  row.querySelector('.chk').click();
  assert.equal(a.doc.querySelector('.chk').getAttribute('aria-pressed'), 'true');
});

test('fill last preserves completed work and fills remaining sets', t => {
  const a = app(t, { sessions: [], baselines: { 'Bench press': [50, 8] } });
  const row = a.doc.querySelector('.set');
  a.input(row.querySelectorAll('input')[0], '65');
  a.input(row.querySelectorAll('input')[1], '6');
  row.querySelector('.chk').click();
  a.click('↺ Fill last');
  const sets = a.state().drafts.push['Bench press'];
  assert.equal(sets[0].w, '65');
  assert.equal(sets[1].w, '50');
});

test('workout summary supports keyboard cancellation and returns focus', t => {
  const a = app(t);
  const row = a.doc.querySelector('.set');
  a.input(row.querySelectorAll('input')[0], '60');
  a.input(row.querySelectorAll('input')[1], '6');
  row.querySelector('.chk').click();
  assert.equal(a.doc.activeElement.getAttribute('aria-pressed'), 'true');
  a.click('Finish');
  assert.equal(a.doc.activeElement.textContent, 'Keep training');
  a.doc.getElementById('modal').dispatchEvent(new a.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(a.doc.getElementById('modal').hidden, true);
  assert.equal(a.doc.activeElement.textContent, 'Finish');
  assert.equal(a.state().sessions.length, 0);
});

test('exercise cards can be expanded and the continue action opens the next exercise', t => {
  const a = app(t);
  const cards = a.doc.querySelectorAll('.ex');
  assert.equal(cards[0].querySelector('.exercise-toggle').getAttribute('aria-expanded'), 'true');
  assert.equal(cards[1].querySelector('.exercise-body').hidden, true);
  cards[1].querySelector('.exercise-toggle').click();
  assert.equal(a.doc.querySelectorAll('.ex')[1].querySelector('.exercise-body').hidden, false);
  assert.equal(a.doc.querySelectorAll('.ex')[0].querySelector('.exercise-body').hidden, true);
  a.w.HTMLElement.prototype.scrollIntoView = () => {};
  a.doc.querySelector('.continue-btn').click();
  assert.equal(a.doc.querySelectorAll('.ex')[0].querySelector('.exercise-body').hidden, false);
});

test('tapping an exercise name opens its form dialog, and the baseline dialog closes with ✕', t => {
  const a = app(t);
  a.doc.querySelector('.ex-name').click();
  assert.equal(a.doc.getElementById('modal').hidden, false);
  assert.match(a.doc.querySelector('#mbox .mtitle').textContent, /Bench press/);
  a.click('Close');
  a.click('＋ Set last weight');
  assert.equal(a.doc.getElementById('modal').hidden, false);
  a.click('✕');
  assert.equal(a.doc.getElementById('modal').hidden, true);
});

test('removing a workout can be undone and keeps its place', t => {
  const sessions = [
    { id: 'a', day: 'push', date: '2026-10-01', sets: { 'Bench press': [[60, 6]] } },
    { id: 'b', day: 'pull', date: '2026-10-02', sets: { 'Barbell row': [[50, 8]] } },
    { id: 'c', day: 'legs', date: '2026-10-03', sets: { Squat: [[80, 5]] } }
  ];
  const a = app(t, { sessions });
  const removeB = [...a.doc.querySelectorAll('.item')].find(i => i.textContent.includes('2026-10-02')).querySelector('button');
  removeB.click();
  assert.deepEqual(a.state().sessions.map(s => s.id), ['a', 'c']);
  a.click('Undo');
  assert.deepEqual(a.state().sessions.map(s => s.id), ['a', 'b', 'c']);
});

test('importing a backup asks first, then restores and normalises it', async t => {
  const a = app(t, { sessions: [{ id: 'x', day: 'push', date: '2026-10-01', sets: {} }] });
  a.doc.getElementById('t-plan').click();
  const fileIn = a.doc.querySelector('input[type=file]');
  const backup = { sessions: [{ id: 'y', day: 'pull', date: '2026-10-05', sets: {} }, { id: 'z', day: 'legs', date: '2026-10-06', sets: {} }], drafts: null };
  const pick = async answer => {
    let asked = '';
    a.w.confirm = msg => { asked = msg; return answer; };
    Object.defineProperty(fileIn, 'files', { configurable: true, value: [new a.w.File([JSON.stringify(backup)], 'b.json')] });
    fileIn.dispatchEvent(new a.w.Event('change'));
    await new Promise(r => setTimeout(r, 50));
    return asked;
  };
  assert.match(await pick(false), /2 workouts/);
  assert.deepEqual(a.state().sessions.map(s => s.id), ['x']);
  await pick(true);
  assert.deepEqual(a.state().sessions.map(s => s.id), ['y', 'z']);
  assert.deepEqual(a.state().drafts, {});
});

test('goals are editable on the Plan tab and drive the Meals and Body tabs', t => {
  const a = app(t);
  a.doc.getElementById('t-plan').click();
  const field = label => a.doc.querySelector(`input[aria-label^="${label}"]`);
  const set = (label, v) => { const i = field(label); i.value = v; i.dispatchEvent(new a.w.Event('change')); };
  set('Daily protein', '9999');
  assert.equal(field('Daily protein').value, '180');
  set('Daily protein', '150');
  set('Goal weight', '95');
  assert.deepEqual(a.state().goals, { protein: 150, kg: 95 });
  a.doc.getElementById('t-meals').click();
  assert.match(a.doc.querySelector('.rings').textContent, /150 left of 150/);
  a.doc.getElementById('t-body').click();
  assert.match(a.doc.body.textContent, /4\.4 to gain/);
});

test('body tab charts weight against the goal; exercise dialog charts best estimated 1RM', t => {
  const a = app(t, {
    sessions: [
      { id: '1', day: 'old', date: '2026-10-01', sets: { 'Bench press': [[60, 6], [60, 5]] } },
      { id: '2', day: 'old', date: '2026-10-08', sets: { 'Bench press': [[62.5, 6]] } },
      { id: '3', day: 'old', date: '2026-10-15', sets: { 'Bench press': [[65, 6]] } }
    ],
    body: [{ date: '2026-10-01', kg: 90 }, { date: '2026-10-15', kg: 88.5 }, { date: 'bad', kg: 70 }]
  });
  a.doc.querySelector('.ex-name').click();
  const box = a.doc.getElementById('mbox');
  assert.equal(box.querySelectorAll('svg.chart circle').length, 3);
  assert.match(box.querySelector('.chart-head').textContent, /78 kg.*\+6 kg overall/);
  a.click('Close');
  a.doc.getElementById('t-body').click();
  const chart = a.doc.querySelector('svg.chart');
  assert.match(chart.getAttribute('aria-label'), /goal 81 kg/);
  assert.equal(chart.querySelectorAll('circle').length, 2);
  assert.ok(chart.querySelector('.c-goal'));
});

test('suggests +2.5 kg after hitting top reps on every set, otherwise holds the weight', t => {
  const four = (w, r) => [[w, r], [w, r], [w, r], [w, r]];
  const up = app(t, { sessions: [{ id: '1', day: 'old', date: '2026-10-01', sets: { 'Bench press': four(60, 6) } }] });
  const card = up.doc.querySelector('.ex');
  assert.match(card.querySelector('.suggest').textContent, /Next: 62\.5 kg × 6/);
  up.click('Use 62.5 kg');
  const sets = up.state().drafts.push['Bench press'];
  assert.deepEqual(sets.map(s => s.w), ['62.5', '62.5', '62.5', '62.5']);

  const hold = app(t, { sessions: [{ id: '1', day: 'old', date: '2026-10-01', sets: { 'Bench press': [[60, 6], [60, 6], [60, 5], [60, 4]] } }] });
  assert.match(hold.doc.querySelector('.suggest').textContent, /Stay at 60 kg/);
  assert.equal([...hold.doc.querySelectorAll('.suggest button')].length, 0);
});

test('workout history lists every session newest first with its sets', t => {
  const sessions = [];
  for (let i = 1; i <= 8; i++) sessions.push({ id: 's' + i, day: 'old', dayName: 'Day ' + i, date: `2026-10-${String(i).padStart(2, '0')}`, sets: { Squat: [[80 + i, 5]] } });
  const a = app(t, { sessions });
  assert.equal(a.doc.querySelectorAll('.item.tap').length, 6);
  a.click('View all 8 workouts');
  const items = a.doc.querySelectorAll('#mbox details.hist');
  assert.equal(items.length, 8);
  assert.match(items[0].textContent, /Day 8.*88×5/);
  a.click('Close');
  [...a.doc.querySelectorAll('.item.tap')].find(i => i.textContent.includes('2026-10-05')).click();
  const open = a.doc.querySelector('#mbox details.hist[open]');
  assert.match(open.textContent, /Day 5/);
  a.click('Remove workout');
  assert.equal(a.state().sessions.length, 7);
  a.click('Undo');
  assert.equal(a.state().sessions.length, 8);
});

test('custom food with macros works out calories, totals carbs and fat, and can be saved to My Foods', t => {
  const a = app(t);
  a.doc.getElementById('t-meals').click();
  const field = label => [...a.doc.querySelectorAll('label')].find(l => l.textContent.startsWith(label)).querySelector('input');
  field('Food').value = 'Oats bowl';
  field('Protein').value = '20';
  field('Carbs').value = '60';
  field('Fat').value = '10';
  a.doc.querySelector('.check input').checked = true;
  a.click('Add food');
  const food = a.state().food[0];
  assert.equal(food.kcal, 4 * 20 + 4 * 60 + 9 * 10);
  assert.deepEqual([food.c, food.f], [60, 10]);
  assert.match(a.doc.querySelector('.macros').textContent, /Carbs 60 g.*Fat 10 g/);
  a.click('+ Oats bowl (20g P)');
  assert.equal(a.state().food.length, 2);
  a.doc.querySelector('[aria-label="Delete Oats bowl from My Foods"]').click();
  assert.equal(a.state().myFoods.length, 0);
  a.click('Undo');
  assert.equal(a.state().myFoods.length, 1);
});

test('backup reminder appears once there are workouts to lose and goes away after a backup or snooze', t => {
  const sessions = [1, 2, 3].map(i => ({ id: 's' + i, day: 'old', date: '2026-10-0' + i, sets: {} }));
  const a = app(t, { sessions });
  a.w.URL.createObjectURL = () => 'blob:x';
  a.w.URL.revokeObjectURL = () => {};
  a.w.HTMLAnchorElement.prototype.click = () => {};
  assert.ok(a.doc.querySelector('.backup-nag'));
  a.click('Back up now');
  assert.equal(a.doc.querySelector('.backup-nag'), null);
  assert.equal(a.state().backupCount, 3);

  const old = app(t, { sessions: sessions.concat({ id: 's4', day: 'old', date: '2026-10-04', sets: {} }), lastBackup: '2020-01-01', backupCount: 3 });
  assert.match(old.doc.querySelector('.backup-nag').textContent, /last backup was \d+ days ago/);
  old.click('Remind me later');
  assert.equal(old.doc.querySelector('.backup-nag'), null);

  const fresh = app(t, { sessions: sessions.slice(0, 2) });
  assert.equal(fresh.doc.querySelector('.backup-nag'), null);
});

test('sets can be added or removed for today only, and notes are saved with the workout', t => {
  const a = app(t);
  const card = () => a.doc.querySelector('.ex');
  assert.equal(card().querySelectorAll('.set').length, 4);
  a.click('＋ Add set');
  assert.equal(card().querySelectorAll('.set').length, 5);
  assert.match(a.doc.querySelector('.hero-line').textContent, /set 1 of 5/);
  const rows = card().querySelectorAll('.set');
  a.input(rows[4].querySelectorAll('input')[0], '60');
  a.input(rows[4].querySelectorAll('input')[1], '5');
  rows[4].querySelector('.chk').click();
  a.click('− Remove set');
  assert.match(a.doc.getElementById('toast').textContent, /Undo the last set/);
  const note = card().querySelector('.ex-note textarea');
  note.value = 'Narrow grip'; note.dispatchEvent(new a.w.Event('input'));
  a.click('Finish');
  const sn = a.doc.querySelector('#mbox .sess-note');
  sn.value = 'Slept badly'; sn.dispatchEvent(new a.w.Event('input'));
  a.click('Save workout');
  const s = a.state().sessions[0];
  assert.deepEqual(s.sets['Bench press'], [[60, 5]]);
  assert.equal(s.notes['Bench press'], 'Narrow grip');
  assert.equal(s.note, 'Slept badly');
  assert.deepEqual(a.state().setAdj, {});
  a.doc.querySelector('button.day').click();
  assert.equal(a.doc.querySelector('.ex').querySelectorAll('.set').length, 4);
  assert.match(a.doc.querySelector('.last-note').textContent, /Narrow grip/);
});

test('warm-up ramps toward the working weight with plates for barbell lifts', t => {
  const a = app(t, { sessions: [{ id: '1', day: 'old', date: '2026-10-01', sets: { 'Bench press': [[100, 6], [100, 6], [100, 5], [100, 5]] } }] });
  a.click('🔥 Warm-up');
  const rows = [...a.doc.querySelectorAll('#mbox .warm-row')].map(r => r.textContent);
  assert.match(rows[0], /20 kg × 10.*Empty bar/);
  assert.match(rows.at(-1), /100 kg · working sets/);
  const weights = [...a.doc.querySelectorAll('#mbox .warm-row b')].map(b => parseFloat(b.textContent));
  assert.deepEqual(weights, [...weights].sort((x, y) => x - y));
  assert.ok(rows.some(r => /45 kg × 5.*10 \+ 2\.5 a side/.test(r)));
  assert.equal(rows.length, 5);
  const w = a.doc.querySelector('#mbox input');
  w.value = '30'; w.dispatchEvent(new a.w.Event('input'));
  assert.ok(a.doc.querySelectorAll('#mbox .warm-row').length <= 3);
});

test('body tab shows the week against last week, a training calendar with streak, and personal records', t => {
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  // Saturday-start weeks: train in this week, last week and the week before
  const thisSat = (() => { const d = new Date(); d.setDate(d.getDate() - (d.getDay() + 1) % 7); return d; })();
  const sat = k => { const d = new Date(thisSat); d.setDate(d.getDate() - 7 * k); return ymd(d); };
  const sessions = [
    { id: '1', day: 'old', date: sat(2), sets: { Squat: [[100, 5]] } },
    { id: '2', day: 'old', date: sat(1), sets: { Squat: [[105, 5]], 'Pull-ups': [[0, 10]] } },
    { id: '3', day: 'old', date: sat(0), sets: { Squat: [[105, 6], [100, 5]], 'Pull-ups': [[0, 12]] } }
  ];
  const b = app(t, { sessions });
  b.doc.getElementById('t-body').click();
  const wk = b.doc.querySelector('.wk').textContent;
  assert.match(wk, /Sets3▲ 1/);
  assert.match(b.doc.querySelector('.streak').textContent, /🔥 3week streak/);
  assert.ok(b.doc.querySelector('.cal .c.today'));
  const prs = [...b.doc.querySelectorAll('.pr-row')].map(r => r.textContent);
  assert.ok(prs.some(r => /Squat.*105 kg × 6/.test(r)));
  assert.ok(prs.some(r => /Pull-ups.*12 reps/.test(r)));
  b.doc.querySelector('[aria-label="Previous month"]').click();
  assert.equal(b.doc.querySelector('[aria-label="Next month"]').disabled, false);
});

test('habits keep old data, can be added and removed on the Plan tab, and count toward their goal', t => {
  const td = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  const a = app(t, { sessions: [], habits: { [td]: { creatine: true, water: 1.5 } } });
  const pills = () => [...a.doc.querySelectorAll('.qbar .hpill')].map(p => p.textContent);
  assert.match(pills()[0], /Creatine 5g.*Done today/);
  assert.match(pills()[1], /Water: 1\.5 \/ 3\.5L/);
  a.doc.querySelector('[aria-label^="Subtract 0.5 from Water"]').click();
  assert.equal(a.state().habits[td].water, 1);
  a.doc.getElementById('t-plan').click();
  const lbl = text => [...a.doc.querySelectorAll('label')].find(l => l.textContent.startsWith(text));
  lbl('New habit').querySelector('input').value = 'Sleep';
  const type = lbl('Type').querySelector('select');
  type.value = 'count'; type.dispatchEvent(new a.w.Event('change'));
  lbl('Daily goal').querySelector('input').value = '8';
  lbl('Unit').querySelector('input').value = 'h';
  a.click('Add habit');
  assert.deepEqual(a.state().habitList.map(h => h.name), ['Creatine 5g', 'Water', 'Sleep']);
  const removeCreatine = [...a.doc.querySelectorAll('.hed')].find(r => r.textContent.includes('Creatine')).querySelector('button');
  removeCreatine.click();
  assert.deepEqual(a.state().habitList.map(h => h.name), ['Water', 'Sleep']);
  a.doc.getElementById('t-train').click();
  for (let i = 0; i < 8; i++) a.doc.querySelector('[aria-label^="Sleep:"]').click();
  assert.match(a.doc.querySelector('[aria-label^="Sleep:"]').textContent, /8 \/ 8h.*✅/);
});

test('check-ins take extra measurements and each one gets its own trend chart', t => {
  const a = app(t, { sessions: [], body: [{ date: '2026-10-01', kg: 90, arm: 38 }] });
  a.doc.getElementById('t-body').click();
  const lbl = text => [...a.doc.querySelectorAll('label')].find(l => l.textContent.startsWith(text)).querySelector('input');
  lbl('Date').value = '2026-10-15';
  lbl('Weight').value = '89';
  lbl('Arms').value = '38.5';
  lbl('Body fat').value = '22';
  a.click('Save check-in');
  assert.deepEqual(a.state().body.at(-1), { date: '2026-10-15', note: '', kg: 89, waist: null, chest: null, arm: 38.5, thigh: null, hips: null, fat: 22 });
  const chips = [...a.doc.querySelectorAll('.mchips button')].map(b => b.textContent);
  assert.deepEqual(chips, ['Weight', 'Arms', 'Body fat']);
  a.click('Arms');
  assert.match(a.doc.querySelector('.mchips').parentElement.querySelector('.chart-head').textContent, /Arms.*38\.5 cm.*\+0\.5 cm/);
  assert.match(a.doc.querySelector('svg.chart').getAttribute('aria-label'), /^Arms from 38 cm/);
  a.click('Body fat');
  assert.match(a.doc.body.textContent, /Log at least two body fat entries/);
  lbl('Body fat').value = '90';
  a.click('Save check-in');
  assert.match(a.doc.getElementById('toast').textContent, /body fat/);
});

test('Arabic switches the page to right-to-left and translates it, and English restores it', async t => {
  const tick = () => new Promise(r => setTimeout(r, 0));
  const a = app(t, { sessions: [{ id: '1', day: 'old', date: '2026-10-01', sets: { 'Bench press': [[80, 6], [80, 6], [80, 6], [80, 6]] } }] });
  a.doc.getElementById('t-plan').click();
  a.click('العربية');
  await tick();
  assert.equal(a.doc.documentElement.getAttribute('dir'), 'rtl');
  assert.equal(a.state().lang, 'ar');
  assert.equal(a.doc.getElementById('t-train').textContent.trim(), 'التمرين');
  assert.ok(a.doc.body.textContent.includes('أهدافك'));
  assert.ok([...a.doc.querySelectorAll('.lang-switch button')].some(b => b.textContent === 'English'));
  a.doc.getElementById('t-train').click();
  await tick();
  const card = a.doc.querySelector('.ex');
  assert.match(card.querySelector('.ex-count').getAttribute('aria-label'), /المجموعات المكتملة: 0 من 4/);
  assert.match(card.querySelector('.suggest').textContent, /التالي: 82\.5 كجم × 6/);
  assert.equal(card.querySelector('.ex-name').textContent, 'Bench press');
  assert.match(card.querySelector('.chk').getAttribute('aria-label'), /^إكمال Bench press، المجموعة 1$/);
  a.click('＋ إضافة مجموعة');
  await tick();
  assert.match(a.doc.getElementById('toast').textContent, /Bench press: 5 مجموعات اليوم/);
  // reload keeps Arabic
  const again = app(t, a.state());
  await tick();
  assert.equal(again.doc.documentElement.getAttribute('lang'), 'ar');
  assert.equal(again.doc.querySelector('.session-dock .btn').textContent, 'إنهاء');
  // back to English without reloading
  a.doc.getElementById('t-plan').click();
  a.click('English');
  await tick();
  assert.equal(a.doc.documentElement.getAttribute('dir'), 'ltr');
  assert.equal(a.doc.getElementById('t-train').textContent.trim(), 'Train');
  assert.ok(a.doc.body.textContent.includes('Your goals'));
});

test('focus mode walks through sets one at a time, rests between them, and shares the draft', t => {
  const four = (w, r) => [[w, r], [w, r], [w, r], [w, r]];
  const a = app(t, { sessions: [{ id: '1', day: 'old', date: '2026-10-01', sets: { 'Bench press': four(80, 5) } }] });
  const f = () => a.doc.getElementById('focus');
  a.click('◎ Focus');
  assert.equal(f().hidden, false);
  assert.ok(a.doc.body.classList.contains('focusing'));
  assert.equal(f().querySelector('.f-title').textContent, 'Bench press');
  assert.match(f().querySelector('.f-sub').textContent, /Set 1 of 4/);
  const [w, r] = f().querySelectorAll('.f-stepper input');
  assert.equal(w.value, '80');            // last time's weight is shown...
  assert.equal((a.state().drafts || {}).push, undefined); // ...but not written until you act
  f().querySelector('[aria-label="More weight"]').click();
  assert.equal(f().querySelector('.f-stepper input').value, '82.5');
  a.click('Done ✓');
  let d = a.state().drafts.push['Bench press'];
  assert.deepEqual([d[0].w, d[0].r, d[0].done], ['82.5', '5', true]);
  assert.ok(f().querySelector('.f-rest'));
  assert.match(f().querySelector('.f-next').textContent, /Up next.*Bench press.*Set 2 of 4/);
  a.click('Skip rest');
  assert.match(f().querySelector('.f-sub').textContent, /Set 2 of 4/);
  a.click('‹ Previous set');
  a.click('Undo this set');
  assert.equal(a.state().drafts.push['Bench press'][0].done, false);
  a.doc.dispatchEvent(new a.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(f().hidden, true);
  assert.ok(!a.doc.body.classList.contains('focusing'));
  assert.equal(a.doc.querySelector('.set input').value, '82.5');
});

test('focus mode ends on a summary that hands over to Finish workout', t => {
  const a = app(t, { sessions: [] });
  const d = a.w.eval('DAYS[0]');
  d.ex = [d.ex[0]]; d.ex[0][1] = 1; // a one-set day
  a.w.eval('render()');
  a.click('◎ Focus');
  const f = a.doc.getElementById('focus');
  const [w, r] = f.querySelectorAll('.f-stepper input');
  w.value = '60'; w.dispatchEvent(new a.w.Event('input'));
  r.value = '8'; r.dispatchEvent(new a.w.Event('input'));
  a.click('Done ✓');
  assert.match(f.textContent, /All sets done.*1 sets · 480 kg volume/);
  f.querySelector('.f-main').click(); // the dock's button sits hidden behind the overlay
  assert.equal(f.hidden, true);
  assert.equal(a.doc.getElementById('modal').hidden, false);
  assert.match(a.doc.getElementById('mbox').textContent, /WORKOUT SUMMARY/);
});
