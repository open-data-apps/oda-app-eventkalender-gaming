// Countdown „Active Quest“ und „Weekly Quests“ müssen sich widerspruchsfrei verhalten.
// updateKPIs liegt im app()-Closure; der Test führt die echte Funktion mit Stub-DOM,
// festem „jetzt“ (gemocktes Date) und vorgegebenem Terminbestand aus.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../app/app.js'), 'utf8');

const STUNDE = 3600000;
const START = Date.parse('2026-10-25T12:00:00Z');

function laufen(jetzt, events) {
  let kpiHtml = '';
  const ctx = vm.createContext({
    rootId: 'eventkalender-test', configdata: {}, allEvents: events,
    kpiContext: () => '', escapeHtml: (v) => String(v).replace(/</g, '&lt;'),
    document: { getElementById: () => ({ querySelector: () => ({ set innerHTML(v) { kpiHtml = v; } }) }) },
  });
  vm.runInContext(`class FakeDate extends Date {
    constructor(...a) { if (a.length) super(...a); else super(${jetzt}); }
    static now() { return ${jetzt}; }
  }
  Date = FakeDate;`, ctx);
  for (const name of ['parseEventDateTime', 'getEventStartInstant', 'getEventEndInstant', 'updateKPIs']) {
    const start = new RegExp('^([ \\t]*)function ' + name + '\\(', 'm').exec(source);
    const end = source.indexOf('\n' + start[1] + '}', start.index);
    vm.runInContext(source.slice(start.index, end + start[1].length + 2), ctx);
  }
  ctx.updateKPIs();
  return {
    countdown: /kpi-next[\s\S]*?kpi-sub">([^<]*)</.exec(kpiHtml)[1],
    woche: Number(/kpi-woche[\s\S]*?kpi-value"[^>]*>(\d+)</.exec(kpiHtml)[1]),
  };
}
const quest = { titel: 'Retro Roundup', datum_start: '2026-10-25T12:00:00Z', zeitzone: 'Europe/Berlin', status: '' };

test('M10 7 d 3 h vor Start: Countdown „8 days“, Weekly 0', () => {
  const r = laufen(START - (7 * 24 + 3) * STUNDE, [quest]);
  assert.equal(r.countdown, 'Starting in 8 days');
  assert.equal(r.woche, 0);
});
test('M10 6 d 23 h vor Start: Countdown „7 days“, Weekly 1', () => {
  const r = laufen(START - (6 * 24 + 23) * STUNDE, [quest]);
  assert.equal(r.countdown, 'Starting in 7 days');
  assert.equal(r.woche, 1);
});
test('M10 abgesagter Termin zählt nicht in Weekly', () => {
  const r = laufen(START - 2 * 24 * STUNDE, [{ ...quest, status: 'abgesagt' }]);
  assert.equal(r.countdown, 'Standby');
  assert.equal(r.woche, 0);
});
test('M10 Stunden-Zweige bleiben unverändert', () => {
  assert.equal(laufen(START - 5.5 * STUNDE, [quest]).countdown, 'Starting in 5 hrs');
  assert.equal(laufen(START - 0.5 * STUNDE, [quest]).countdown, 'Starting in &lt; 1 hr');
});
