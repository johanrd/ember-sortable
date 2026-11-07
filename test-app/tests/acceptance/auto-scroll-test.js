import { module, test } from 'qunit';
import { visit, find } from '@ember/test-helpers';

function instrument() {
  const log = { frames: [], start: performance.now(), marks: {} };
  const raf = window.requestAnimationFrame;
  window.requestAnimationFrame = (cb) =>
    raf((t) => {
      const c = document.getElementById('ember-testing-container');
      log.frames.push([
        Math.round(performance.now() - log.start),
        c.scrollTop,
        c.scrollLeft,
      ]);
      cb(t);
    });
  log.mark = (k) => (log.marks[k] = Math.round(performance.now() - log.start));
  log.restore = () => (window.requestAnimationFrame = raf);
  log.summary = () => {
    const f = log.frames;
    const gaps = f
      .slice(1)
      .map((x, i) => x[0] - f[i][0])
      .sort((a, b) => a - b);
    const c = document.getElementById('ember-testing-container');
    return JSON.stringify({
      marks: log.marks,
      frames: f.length,
      gapMedian: gaps[Math.floor(gaps.length / 2)],
      gapP90: gaps[Math.floor(gaps.length * 0.9)],
      gapMax: gaps[gaps.length - 1],
      lastScrollChangeFrame: f.findLastIndex(
        (x, i) => i > 0 && (x[1] !== f[i - 1][1] || x[2] !== f[i - 1][2]),
      ),
      first: f[0],
      last: f[f.length - 1],
      scrollHeight: c.scrollHeight,
      clientHeight: c.clientHeight,
      scrollWidth: c.scrollWidth,
      clientWidth: c.clientWidth,
      zoom: getComputedStyle(document.getElementById('ember-testing')).zoom,
      transform: getComputedStyle(document.getElementById('ember-testing'))
        .transform,
      hidden: document.hidden,
      dpr: window.devicePixelRatio,
    });
  };
  return log;
}
import { setupApplicationTest } from 'ember-qunit';
import { drag } from 'ember-sortable/test-support';

module('Acceptance | container auto scroll', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function () {
    document.getElementById('ember-testing-container').scrollTop = 0;
    document.documentElement.scrollTop = 0;
  });

  test('verticaly reordering can scroll his parent container', async function (assert) {
    const log = instrument();
    await visit('/docautoscroll');

    let itemHeight = () => {
      let item = find('[data-test-doc-auto-scroll-demo-item]');
      const itemStyle = item.currentStyle || window.getComputedStyle(item);
      return item.offsetHeight + parseInt(itemStyle.marginTop);
    };

    log.mark('visited');
    await drag(
      'mouse',
      '[data-test-doc-auto-scroll-demo-item]',
      () => {
        return { dy: itemHeight() * 30 + 1, dx: undefined };
      },
      {
        dragstart: async () => log.mark('mousedown'),
        dragmove: async () => log.mark('firstMove'),
        beforedragend: async () => log.mark('movesSettled'),
        dragend: async () => log.mark('mouseup'),
      },
    );
    log.mark('dragged');
    log.restore();
    assert.ok(false, 'DEBUG verticaly ' + log.summary());
    assert.ok(
      document.getElementById('ember-testing-container').scrollTop,
      'The container has scroll (top)',
    );
  });

  test('horizontaly reordering can scroll his parent container', async function (assert) {
    const log = instrument();
    await visit('/docautoscroll?direction=x');

    let itemWidth = () => {
      let item = find('[data-test-doc-auto-scroll-demo-item]');
      const itemStyle = item.currentStyle || window.getComputedStyle(item);
      return item.offsetWidth + parseInt(itemStyle.marginLeft);
    };

    log.mark('visited');
    await drag(
      'mouse',
      '[data-test-doc-auto-scroll-demo-item]',
      () => {
        return { dy: undefined, dx: itemWidth() * 30 + 1 };
      },
      {
        dragstart: async () => log.mark('mousedown'),
        dragmove: async () => log.mark('firstMove'),
        beforedragend: async () => log.mark('movesSettled'),
        dragend: async () => log.mark('mouseup'),
      },
    );
    log.mark('dragged');
    log.restore();
    assert.ok(false, 'DEBUG horizontaly ' + log.summary());
    assert.ok(
      document.getElementById('ember-testing-container').scrollLeft,
      'The container has scroll (left)',
    );
  });
});
