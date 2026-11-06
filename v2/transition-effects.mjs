// A short, self-contained canvas effect. The opaque middle of the animation
// hides the stage replacement; no model or story artwork is captured here.
const THEMES = {
  sparkle: { top: '#181634', bottom: '#554075', light: '#ffe2a0', glow: '#bca4f5', direction: 1 },
  star: { top: '#111a3d', bottom: '#394176', light: '#fff0b9', glow: '#9ebaf5', direction: -1 },
  cloud: { top: '#292a59', bottom: '#816792', light: '#ffe6ce', glow: '#e2bde7', direction: 1 }
};

const COVER_MS = 380;
const REVEAL_MS = 540;
const TAU = Math.PI * 2;
const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => { const x = clamp(value); return x * x * (3 - 2 * x); };

function seedStars(kind, count = 42) {
  let seed = [...kind].reduce((value, character) => (value * 33 + character.charCodeAt(0)) >>> 0, 101);
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  return Array.from({ length: count }, () => ({
    x: random(), y: random(), size: 1.1 + random() * 2.4,
    speed: .025 + random() * .065, phase: random() * TAU,
    warm: random() > .28
  }));
}

function drawStar(ctx, x, y, radius, color, glow = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = color;
  ctx.shadowBlur = radius > 5 ? radius * 5 * glow : 0;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let point = 0; point < 8; point++) {
    const angle = point * Math.PI / 4 - Math.PI / 2;
    const length = point % 2 ? radius * .2 : radius;
    const px = Math.cos(angle) * length, py = Math.sin(angle) * length;
    if (point === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawRibbon(ctx, width, height, time, index, theme, kind) {
  const shift = theme.direction * time * (34 + index * 18);
  const centerY = height * (.24 + index * .19);
  const wave = Math.sin(time * 1.3 + index * 1.7) * height * .035;
  const fromX = -width * .22 + shift;
  const toX = width * 1.25 + shift;
  const gradient = ctx.createLinearGradient(fromX, centerY, toX, centerY + wave);
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(.26, theme.glow + '08');
  gradient.addColorStop(.52, (index % 2 ? theme.light : theme.glow) + (kind === 'cloud' ? '56' : '45'));
  gradient.addColorStop(.76, theme.glow + '16');
  gradient.addColorStop(1, 'transparent');
  ctx.save();
  ctx.strokeStyle = gradient;
  ctx.lineCap = 'round';
  ctx.lineWidth = height * (kind === 'cloud' ? .15 : .095);
  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = height * .055;
  ctx.beginPath();
  ctx.moveTo(fromX, centerY + wave);
  ctx.bezierCurveTo(width * .21 + shift, centerY - height * .14,
    width * .56 + shift, centerY + height * .16,
    toX, centerY - wave);
  ctx.stroke();
  ctx.lineWidth = Math.max(2, height * .003);
  ctx.strokeStyle = theme.light + '54';
  ctx.shadowBlur = height * .018;
  ctx.stroke();
  ctx.restore();
}

function drawClouds(ctx, width, height, time, theme) {
  ctx.save();
  for (let row = 0; row < 2; row++) {
    for (let puff = 0; puff < 4; puff++) {
      const x = width * ((puff + .1) / 3.5) + Math.sin(time * .45 + puff + row) * width * .045;
      const y = height * (.64 + row * .2) + Math.cos(time * .6 + puff) * height * .025;
      const radius = Math.max(width * .18, height * .12) * (1 + puff % 2 * .25);
      const cloud = ctx.createRadialGradient(x, y, 0, x, y, radius);
      cloud.addColorStop(0, theme.glow + (row ? '46' : '36'));
      cloud.addColorStop(.55, theme.light + '18');
      cloud.addColorStop(1, 'transparent');
      ctx.fillStyle = cloud;
      ctx.beginPath();
      ctx.ellipse(x, y, radius, radius * .51, 0, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawOrbit(ctx, width, height, time, theme) {
  const x = width * (.5 + Math.sin(time * .75) * .09);
  const y = height * (.39 + Math.cos(time * .6) * .055);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-.23 + Math.sin(time * .3) * .08);
  ctx.beginPath();
  ctx.ellipse(0, 0, Math.min(width * .31, height * .35), Math.min(width * .10, height * .11), 0, 0, TAU);
  ctx.strokeStyle = theme.light + '70';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = theme.light;
  ctx.shadowBlur = 15;
  ctx.stroke();
  ctx.restore();
}

function paint(ctx, width, height, kind, stars, time, opacity) {
  ctx.clearRect(0, 0, width, height);
  if (opacity <= 0) return;
  const theme = THEMES[kind] || THEMES.sparkle;
  ctx.save();
  ctx.globalAlpha = opacity;
  const background = ctx.createLinearGradient(0, 0, width * .3, height);
  background.addColorStop(0, theme.top);
  background.addColorStop(.68, theme.bottom);
  background.addColorStop(1, theme.top);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  // Soft moving light behind the stars makes this a continuous scene, not a card wipe.
  const glowX = width * (.5 + Math.sin(time * .55) * .12);
  const glowY = height * (.41 + Math.cos(time * .7) * .08);
  const haze = ctx.createRadialGradient(glowX, glowY, height * .03, glowX, glowY, height * .75);
  haze.addColorStop(0, theme.glow + (kind === 'star' ? '85' : '65'));
  haze.addColorStop(.54, theme.glow + '16');
  haze.addColorStop(1, 'transparent');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = 'screen';
  for (let index = 0; index < 3; index++) drawRibbon(ctx, width, height, time, index, theme, kind);
  if (kind === 'cloud') drawClouds(ctx, width, height, time, theme);
  if (kind === 'star') drawOrbit(ctx, width, height, time, theme);
  for (const star of stars) {
    const x = ((star.x + theme.direction * time * star.speed) % 1 + 1) % 1 * width;
    const y = (star.y + Math.sin(time * 1.1 + star.phase) * .009) * height;
    const twinkle = .45 + .55 * Math.pow(Math.sin(time * 2.1 + star.phase), 2);
    ctx.globalAlpha = opacity * twinkle;
    drawStar(ctx, x, y, star.size * (1 + twinkle * .36), star.warm ? theme.light : theme.glow, twinkle);
  }
  const mainX = width * (.5 + Math.sin(time * .75) * .09);
  const mainY = height * (.39 + Math.cos(time * .6) * .055);
  ctx.globalAlpha = opacity * (.7 + .3 * Math.sin(time * 2.2) ** 2);
  drawStar(ctx, mainX, mainY, Math.min(width, height) * (kind === 'star' ? .065 : .045), theme.light, 1.7);
  ctx.restore();
}

export function createSceneTransition(kind, loadingText, options = {}) {
  const doc = options.document || document;
  const win = options.window || window;
  const element = doc.createElement('div');
  element.className = `scene-transition scene-transition--${kind}`;
  element.dataset.phase = 'cover';
  element.setAttribute('aria-hidden', 'true');
  const canvas = doc.createElement('canvas');
  canvas.className = 'scene-transition-canvas';
  element.append(canvas);
  const waiting = doc.createElement('span');
  waiting.className = 'scene-transition-waiting';
  waiting.textContent = loadingText;
  waiting.setAttribute('role', 'status');
  waiting.hidden = true;
  element.append(waiting);

  const ctx = canvas.getContext('2d', { alpha: true });
  const reduced = Boolean(win.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const stars = seedStars(kind);
  let width = 0, height = 0, phase = 'cover', started = 0, frame = 0, alive = true, lastFrame = -Infinity;
  const now = () => win.performance?.now?.() ?? Date.now();
  const resize = () => {
    width = Math.max(1, win.innerWidth || 1); height = Math.max(1, win.innerHeight || 1);
    const ratio = Math.min(win.devicePixelRatio || 1, 1.25);
    canvas.width = Math.ceil(width * ratio); canvas.height = Math.ceil(height * ratio);
    ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  function tick(timestamp) {
    if (!alive || !ctx) return;
    if (timestamp - lastFrame >= 30 || reduced) {
      lastFrame = timestamp;
      const elapsed = timestamp - started;
      const opacity = reduced ? (phase === 'reveal' ? 0 : 1)
        : phase === 'cover' ? ease(elapsed / COVER_MS)
          : phase === 'hold' ? 1 : 1 - ease(elapsed / REVEAL_MS);
      paint(ctx, width, height, kind, stars, timestamp / 1000, opacity);
    }
    if (!reduced && (phase !== 'reveal' || timestamp - started < REVEAL_MS)) {
      frame = win.requestAnimationFrame(tick);
    }
  }
  if (ctx) {
    resize();
    started = now();
    paint(ctx, width, height, kind, stars, started / 1000, reduced ? 1 : 0);
    if (!reduced) frame = win.requestAnimationFrame(tick);
  }
  win.addEventListener?.('resize', resize);
  return {
    element, waiting,
    fullyCover() {
      phase = 'hold'; element.dataset.phase = phase;
      if (ctx) paint(ctx, width, height, kind, stars, now() / 1000, 1);
    },
    reveal() {
      phase = 'reveal'; element.dataset.phase = phase; started = now(); lastFrame = -Infinity;
      if (ctx && reduced) paint(ctx, width, height, kind, stars, started / 1000, 0);
    },
    remove() {
      alive = false;
      if (frame) win.cancelAnimationFrame(frame);
      win.removeEventListener?.('resize', resize);
      element.remove();
    }
  };
}
