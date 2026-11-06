import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const app = readFileSync(new URL('./app.mjs', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
const effects = readFileSync(new URL('./transition-effects.mjs', import.meta.url), 'utf8');
const routeCode = app.match(/const transitionKinds = \[[^\n]+\];[\s\S]*?(?=function motionDelay)/)?.[0];
const chooseCode = app.match(/async function choose\(index\) \{[\s\S]*?\n\}(?=\n(?:function|async function) )/)?.[0];
assert.ok(routeCode && chooseCode, 'transition functions remain available in app.mjs');

test('the same route keeps its style and different routes use all three styles', () => {
  const kind = vm.runInNewContext(`${routeCode}; transitionForRoute`);
  const first = kind('lost-star', 'start', 0, 'bridge');
  assert.equal(kind('lost-star', 'start', 0, 'bridge'), first);
  const kinds = new Set(Array.from({ length: 40 }, (_, i) => kind('lost-star', `scene-${i}`, i % 2, `next-${i}`)));
  assert.deepEqual([...kinds].sort(), ['cloud', 'sparkle', 'star']);
  for (const name of kinds) {
    assert.match(effects, new RegExp(`\\b${name}: \\{`));
  }
  assert.match(styles, /\.scene-transition-canvas/);
  assert.match(effects, /requestAnimationFrame\(tick\)/);
  assert.match(effects, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(styles, /scene-(?:sparkle|star|cloud)-(?:cover|reveal)/);
});

test('a choice waits for the new stage before revealing and narrating', async () => {
  let ready;
  const stageReady = new Promise(resolve => { ready = resolve; });
  const events = [];
  let transition;
  const context = {
    changingScene: false,
    sceneReady: stageReady,
    session: { id: 'start', scene: { choices: [{ next: 'bridge' }] } },
    story: { id: 'lost-star' },
    state: { language: 'en', progress: {} },
    princessLoadText: { en: { loading: 'Loading' } },
    narrator: { stop: () => events.push('stop'), play: () => { events.push('narrate'); return Promise.resolve(false); }, isPlaying: () => false },
    createSceneTransition: () => {
      const element = { dataset: { phase: 'cover' }, setAttribute() {}, removeAttribute() {} };
      transition = { element, waiting: { hidden: true }, fullyCover() { element.dataset.phase = 'hold'; events.push('fully covered'); }, reveal() { element.dataset.phase = 'reveal'; }, remove() { events.push('remove'); } };
      return transition;
    },
    transitionForRoute: () => 'cloud',
    motionDelay: milliseconds => { events.push(`delay ${milliseconds}`); return Promise.resolve(); },
    document: { body: { append: () => events.push('cover') }, querySelector: () => null },
    window: { setTimeout: () => 1, clearTimeout() {}, scrollTo() {} },
    advance: session => { events.push('advance'); session.id = 'bridge'; session.scene = { ending: false }; return { action: 'scene' }; },
    save: () => events.push('save'),
    render: () => events.push('render'),
    linesForScene: () => [],
    screen: 'reader',
    ui: {},
    sharedStage: { celebrate() {} }
  };
  vm.createContext(context);
  vm.runInContext(`${chooseCode}; this.choose = choose`, context);
  const choice = context.choose(0);
  await context.choose(0);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(transition.element.dataset.phase, 'hold');
  assert.deepEqual(events.slice(0, 7), ['stop', 'cover', 'delay 380', 'fully covered', 'advance', 'save', 'render']);
  assert.ok(!events.includes('narrate'));
  ready();
  await choice;
  assert.equal(transition.element.dataset.phase, 'reveal');
  assert.ok(events.indexOf('delay 120') > events.indexOf('render'));
  assert.ok(events.indexOf('delay 540') > events.indexOf('delay 120'));
  assert.ok(events.indexOf('narrate') > events.indexOf('remove'));
  assert.equal(context.changingScene, false);
});
