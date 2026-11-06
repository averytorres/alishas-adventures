import test from 'node:test';
import assert from 'node:assert/strict';
import { SharedStage } from './shared-stage.mjs';

test('placed princess keeps her vertical offset while stage motion settles', () => {
  const stage = Object.create(SharedStage.prototype);
  stage.motion = { stageAction: null, effect: null };
  stage.actionAge = 0;
  const actor = {
    baseX: 0.4, baseY: 0.7, targetFacing: 0,
    model: { position: { x: 0.4, y: 0.7 }, rotation: { x: 0, y: 0, z: 0 } },
  };
  stage.posePrincess(actor, 0.05);
  assert.equal(actor.model.position.y, 0.7);
});

test('dragon hug retains its placed depth', () => {
  const stage = Object.create(SharedStage.prototype);
  stage.motion = { stageAction: null, effect: 'hug', dragon: 'quiet' };
  stage.actionAge = 0;
  const actor = {
    baseX: 0.5, baseY: 0.2, baseZ: 0.6, targetFacing: 0, dragonPhase: 0,
    model: { position: { x: 0.5, y: 0.2, z: 0.6 }, rotation: { x: 0, y: 0, z: 0 }, updateMatrixWorld() {} },
  };
  stage.poseDragon(actor, 0.05);
  assert.ok(actor.model.position.z > 0.5);
});
