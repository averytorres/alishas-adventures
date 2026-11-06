import assert from 'node:assert/strict';
import test from 'node:test';
import { shootingStarPath } from './shooting-stars.mjs';

test('the head moves forward and the trail points behind it in every quadrant', () => {
  for (const turn of [0, .125, .25, .375, .5, .625, .75, .875]) {
    const values = [turn, .5, .5];
    const path = shootingStarPath(390, 780, () => values.shift());
    const travel = { x: path.end.x - path.start.x, y: path.end.y - path.start.y };
    assert.ok(travel.x * path.direction.x + travel.y * path.direction.y > 390);
    const tail = { x: -180 * Math.cos(path.degrees * Math.PI / 180), y: -180 * Math.sin(path.degrees * Math.PI / 180) };
    assert.ok(tail.x * travel.x + tail.y * travel.y < 0);
    assert.ok(path.start.x < 0 || path.start.x > 390 || path.start.y < 0 || path.start.y > 780);
    assert.ok(path.end.x < 0 || path.end.x > 390 || path.end.y < 0 || path.end.y > 780);
  }
});

test('different random values produce different start and end paths', () => {
  const first = [0, .2, .7], second = [.64, .8, .3];
  const a = shootingStarPath(390, 780, () => first.shift());
  const b = shootingStarPath(390, 780, () => second.shift());
  assert.notDeepEqual(a.start, b.start);
  assert.notDeepEqual(a.end, b.end);
});
