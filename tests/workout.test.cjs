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
  for (const script of w.document.querySelectorAll('script')) w.eval(script.textContent);
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
  a.click('Finish workout');
  assert.match(a.doc.getElementById('mbox').textContent, /1 of 20 sets/);
  assert.equal(a.state().sessions.length, 0);
  a.click('Keep training');
  assert.equal(a.doc.getElementById('modal').hidden, true);
  assert.equal(a.state().drafts.push['Bench press'][1].w, '70');
  a.click('Finish workout');
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
  a.click('↺ Fill Last');
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
  a.click('Finish workout');
  assert.equal(a.doc.activeElement.textContent, 'Keep training');
  a.doc.getElementById('modal').dispatchEvent(new a.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(a.doc.getElementById('modal').hidden, true);
  assert.equal(a.doc.activeElement.textContent, 'Finish workout');
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
  a.click('＋ Set Last KG');
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
