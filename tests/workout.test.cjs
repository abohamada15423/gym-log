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
