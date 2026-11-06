// The star's head is at the right end of the SVG. Rotating that end toward the
// travel vector keeps the whole smoky tail behind it in every direction.
export function shootingStarPath(width, height, random = Math.random, margin = 210) {
  if (!(width > 0 && height > 0)) throw new Error('A viewport is required');
  const angle = random() * Math.PI * 2;
  const direction = { x: Math.cos(angle), y: Math.sin(angle) };
  const center = { x: width * (.15 + random() * .7), y: height * (.12 + random() * .76) };

  // Distance from the center to the first edge beyond the viewport on each ray.
  const distanceToEdge = (dx, dy) => Math.min(
    dx > 0 ? (width + margin - center.x) / dx : dx < 0 ? (-margin - center.x) / dx : Infinity,
    dy > 0 ? (height + margin - center.y) / dy : dy < 0 ? (-margin - center.y) / dy : Infinity,
  );
  const forward = distanceToEdge(direction.x, direction.y);
  const backward = distanceToEdge(-direction.x, -direction.y);
  return {
    start: { x: center.x - backward * direction.x, y: center.y - backward * direction.y },
    end: { x: center.x + forward * direction.x, y: center.y + forward * direction.y },
    direction,
    degrees: angle * 180 / Math.PI,
    length: forward + backward,
  };
}

export function startShootingStars(star, environment = window) {
  if (!star?.animate) return () => {};
  const reduced = environment.matchMedia('(prefers-reduced-motion: reduce)');
  let timer = null;
  let animation = null;
  function stop() {
    environment.clearTimeout(timer);
    timer = null;
    animation?.cancel();
    animation = null;
    star.style.opacity = '0';
  }
  function schedule(first = false) {
    if (reduced.matches || environment.document.hidden) return;
    const delay = first ? 5000 + Math.random() * 8000 : 22000 + Math.random() * 24000;
    timer = environment.setTimeout(launch, delay);
  }
  function launch() {
    timer = null;
    if (reduced.matches || environment.document.hidden) return;
    const path = shootingStarPath(environment.innerWidth, environment.innerHeight);
    const pose = at => {
      const x = path.start.x + (path.end.x - path.start.x) * at;
      const y = path.start.y + (path.end.y - path.start.y) * at;
      return `translate3d(${x}px, ${y}px, 0) rotate(${path.degrees}deg)`;
    };
    animation = star.animate([
      { offset: 0, transform: pose(0), opacity: 0 },
      { offset: .12, transform: pose(.12), opacity: 1 },
      { offset: .83, transform: pose(.83), opacity: 1 },
      { offset: 1, transform: pose(1), opacity: 0 },
    ], { duration: Math.max(1100, path.length / (650 + Math.random() * 230) * 1000), easing: 'linear' });
    animation.onfinish = () => {
      animation = null;
      schedule();
    };
  }
  const restart = () => {
    stop();
    schedule(true);
  };
  environment.document.addEventListener('visibilitychange', restart);
  reduced.addEventListener('change', restart);
  schedule(true);
  return () => {
    stop();
    environment.document.removeEventListener('visibilitychange', restart);
    reduced.removeEventListener('change', restart);
  };
}

if (typeof document !== 'undefined') startShootingStars(document.querySelector('.shooting-star'));
