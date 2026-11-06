import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// One canvas, renderer, scene and animation loop for every actor in the story stage.
// Asset URLs and per-scene placement belong to the caller; this module has no CYOA imports.
const GESTURES = new Set(['Idle_7', 'Talk_with_Hands_Open', 'Talk_with_Left_Hand_Raised',
  'Talk_with_Right_Hand_Open', 'Talk_Passionately', 'Shrug', 'Confused_Scratch',
  'Finger_Wag_No', 'Wave_for_Help_3', 'Wave_for_Help_2', 'Big_Heart_Gesture', 'Formal_Bow',
  'Walking', 'Walking_Woman', 'Walk_Turn_Right_Female']);
const ONE_SHOT_TALKS = new Set(['Talk_with_Left_Hand_Raised', 'Confused_Scratch',
  'Shrug', 'Finger_Wag_No', 'Wave_for_Help_3', 'Wave_for_Help_2',
  'Big_Heart_Gesture', 'Formal_Bow', 'Walk_Turn_Right_Female']);
const WALKING_CLIPS = new Set(['Walking', 'Walking_Woman', 'Walk_Turn_Right_Female']);
const FOLLOWUP_TALK = 'Talk_with_Right_Hand_Open';
const DRAGON_ACTIONS = new Set(['quiet', 'curious', 'help', 'protect', 'celebrate', 'hover',
  'hop', 'search', 'soothe', 'fly', 'wave', 'rest']);
const STORY_ACTIONS = new Set(['carryStar', 'carryShimmer', 'hug', 'curl']);
const DRAGON_BEHAVIOR_CLIP = { curious: 'Story_Listen', help: 'Story_Offer',
  protect: 'Story_Protect', celebrate: 'Story_Celebrate', search: 'Story_Search',
  soothe: 'Story_Rest', rest: 'Story_Rest' };
// Small stage movements complement the authored clips. Values are [horizontal, vertical,
// turn, forward lean, side lean, horizontal sway]. They stay inside the story artwork.
const STAGE_ACTIONS = {
  lookUp:       { p: [0, .018, -.13, -.09, 0, 0], d: [0, 0, -.08, -.04, 0, 0] },
  inspectGround:{ p: [.015, -.018, .13, .13, 0, 0], d: [-.025, -.025, .13, .08, 0, 0] },
  approachDragon:{ p: [.07, 0, .16, .015, 0, 0], d: [-.04, 0, -.14, 0, 0, 0] },
  stepForward:  { p: [.055, .012, -.03, -.035, 0, .012], d: [.02, .008, 0, 0, 0, .01] },
  stepBack:     { p: [-.06, 0, .07, .02, 0, 0], d: [.005, 0, .04, 0, 0, 0] },
  turnLeft:     { p: [-.025, 0, -.24, 0, -.015, 0], d: [-.02, 0, -.18, 0, 0, 0] },
  turnRight:    { p: [.025, 0, .24, 0, .015, 0], d: [.02, 0, .18, 0, 0, 0] },
  gather:       { p: [.025, -.025, .14, .10, .02, 0], d: [-.015, -.02, -.08, .06, 0, 0] },
  pointSky:     { p: [.01, .02, -.16, -.075, 0, 0], d: [0, .03, -.10, -.06, 0, 0] },
  pointPath:    { p: [.025, .005, .17, .025, 0, 0], d: [.015, 0, .12, 0, 0, 0] },
  listen:       { p: [0, 0, -.09, .015, -.025, 0], d: [-.01, 0, -.06, -.02, .025, 0] },
  shield:       { p: [-.025, -.012, .10, .07, -.03, 0], d: [-.06, .015, -.17, -.06, 0, 0] },
  celebrate:    { p: [0, .04, .05, -.035, .025, .015], d: [.02, .04, -.04, -.04, .025, .015] },
  rest:         { p: [0, -.025, -.04, .045, 0, 0], d: [0, -.025, 0, .035, 0, 0] },
  followTrail:  { p: [.055, .005, .14, .035, 0, .015], d: [-.015, -.015, .08, .05, 0, .01] },
  crossBridge:  { p: [.055, .015, .14, -.025, .018, .017], d: [.025, .025, .08, -.02, .01, .012] },
  watchCreature:{ p: [.005, -.025, -.17, .085, -.02, 0], d: [-.025, -.012, -.12, .025, 0, 0] }
};
// Locomotion clips animate the feet in place. Travel the whole actor across the
// stage over the beat so a walk reads as a step without inheriting GLB root motion.
const STAGE_TRAVEL = {
  stepForward: { p: .12, d: .025 }, stepBack: { p: -.12, d: .015 },
  followTrail: { p: .15, d: .04 }, crossBridge: { p: .15, d: .04 },
  approachDragon: { p: .10, d: -.045 }
};
// Head directions are local bone adjustments [pitch, yaw, roll]. Keep them small
// because these models' hair and jewellery are skinned to the same head rig.
const HEAD_ACTIONS = {
  lookUp: [-.20, 0, 0], inspectGround: [.19, .05, 0],
  approachDragon: [0, -.09, .025], stepForward: [-.025, 0, 0],
  stepBack: [.015, .065, 0], turnLeft: [0, -.11, 0], turnRight: [0, .11, 0],
  gather: [.15, .02, 0], pointSky: [-.20, .025, 0], pointPath: [.075, .12, 0],
  listen: [0, -.045, .07], shield: [.07, -.07, 0], celebrate: [-.065, 0, -.045],
  rest: [.075, 0, 0], followTrail: [.07, .08, 0], crossBridge: [.035, .055, 0],
  watchCreature: [.11, -.13, .055]
};
const stageOffset = (name, actor, age) => {
  const a = STAGE_ACTIONS[name]?.[actor];
  if (!a) return { x: 0, y: 0, turn: 0, pitch: 0, roll: 0 };
  const sway = a[5] * Math.sin(age * 2.6);
  const travel = STAGE_TRAVEL[name]?.[actor] || 0;
  const progress = Math.min(1, Math.max(0, age) / 1.35);
  return { x: a[0] + travel * (progress * progress * (3 - 2 * progress)) + sway,
    y: a[1] + Math.abs(sway) * .35,
    turn: a[2], pitch: a[3], roll: a[4] };
};
const LOWER_BODY = /mixamorig:(?:Hips|LeftUpLeg|RightUpLeg|LeftLeg|RightLeg|LeftFoot|LeftToeBase|RightToeBase)(?:[.\[:]|$)/i;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const finite = (n, fallback) => Number.isFinite(Number(n)) ? Number(n) : fallback;

export class SharedStage {
  constructor({ princessUrls, dragonUrl, onError = console.error } = {}) {
    if (!princessUrls?.star || !princessUrls?.adventure) throw new Error('Both princess URLs are required');
    this.urls = { ...princessUrls, dragon: dragonUrl };
    this.onError = onError;
    this.loader = new GLTFLoader();
    this.assets = new Map();
    this.actors = new Map();
    this.host = null;
    this.renderer = null;
    this.scene = new THREE.Scene();
    this.star = this.makeStar();
    this.scene.add(this.star);
    this.starFade = 0;
    this.starRelease = null;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 100);
    this.camera.position.set(0, .85, 5);
    this.camera.lookAt(0, .85, 0);
    this.clock = new THREE.Clock();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.motion = { talk: 'Talk_with_Hands_Open', facing: 0, dragon: 'quiet', beats: [] };
    this.actionAge = 0;
    this.activeBeat = -1;
    this.accentPlayed = false;
    this.talking = false;
    this.token = 0;
    this.lastDragonOffset = 0;
    this.lastDragonWasVisible = false;
    this.disposed = false;
    this.tick = this.tick.bind(this);
  }

  // Decode early while the library is visible. No WebGL context is created here.
  preload(key) {
    if (this.disposed) return Promise.reject(new Error('Stage disposed'));
    const url = this.urls[key];
    if (!url) return Promise.reject(new Error(`Unknown actor: ${key}`));
    if (!this.assets.has(key)) {
      const task = this.loader.loadAsync(url).catch(error => {
        this.assets.delete(key); // A later scene may retry a transient failure.
        throw error;
      });
      this.assets.set(key, task);
    }
    return this.assets.get(key);
  }

  ensureRenderer() {
    if (this.renderer) return;
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0, 0);
    this.renderer.domElement.className = 'shared-3d-canvas';
    this.renderer.domElement.setAttribute('role', 'img');
    this.renderer.domElement.setAttribute('aria-label', 'Animated Alisha and dragon');
    this.renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); this.stopLoop(); });
    this.renderer.domElement.addEventListener('webglcontextrestored', () => this.startLoop());
  }

  makeStar() {
    const group = new THREE.Group();
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + i * Math.PI / 5;
      const radius = i % 2 ? .42 : 1;
      const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
      if (i) shape.lineTo(x, y); else shape.moveTo(x, y);
    }
    shape.closePath();
    const geometry = new THREE.ShapeGeometry(shape);
    const halo = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      color: 0xffb629, transparent: true, opacity: .42, depthTest: false, depthWrite: false }));
    halo.scale.setScalar(1.5);
    const core = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      color: 0xffd34a, transparent: true, opacity: 1, depthTest: false, depthWrite: false }));
    core.position.z = .005;
    group.add(halo, core);
    group.renderOrder = 10;
    group.visible = false;
    return group;
  }

  makeActor(key, gltf) {
    const model = gltf.scene;
    model.traverse(part => {
      if (part.name === 'Icosphere') { part.visible = false; return; }
      if (!part.isMesh) return;
      const unlit = source => new THREE.MeshBasicMaterial({ map: source.map, color: source.color,
        side: source.side, transparent: source.transparent, opacity: source.opacity,
        alphaTest: source.alphaTest, toneMapped: false });
      part.material = Array.isArray(part.material) ? part.material.map(unlit) : unlit(part.material);
    });
    const mixer = new THREE.AnimationMixer(model);
    const idleName = key === 'dragon' ? 'Animation' : 'Idle_7';
    const idle = gltf.animations.find(c => c.name === idleName) || gltf.animations[0];
    const idleAction = idle ? mixer.clipAction(idle).setLoop(THREE.LoopRepeat).play() : null;
    const clips = new Map();
    for (const clip of gltf.animations) {
      if (clip === idle) continue;
      const upper = clip.clone();
      if (key !== 'dragon') upper.tracks = upper.tracks.filter(track =>
        !LOWER_BODY.test(track.name) ||
        (WALKING_CLIPS.has(clip.name) && /mixamorig:(?:Left|Right)(?:UpLeg|Leg|Foot)\.quaternion$/i.test(track.name)));
      clips.set(upper.name, upper);
    }
    const actor = { model, mixer, clips, action: null, name: null, targetFacing: 0, idleAction };
    if (key !== 'dragon') {
      actor.headBone = model.getObjectByName('mixamorig:Head');
      actor.headBase = null;
    }
    if (key === 'dragon') {
      const head = model.getObjectByName('Bone_021');
      const wingA = model.getObjectByName('Bone_038');
      const wingB = model.getObjectByName('Bone_042');
      const tail = model.getObjectByName('Bone_020');
      if ([head, wingA, wingB].every(b => b?.isBone)) {
        actor.dragonJoints = { head, wingA, wingB, tail: tail?.isBone ? tail : null };
        actor.dragonBase = new Map();
        actor.dragonPhase = 0;
        actor.dragonValue = { head: 0, wing: 0, tail: 0, roll: 0, pitch: 0,
          slide: 0, turn: 0, wave: 0 };
      }
      actor.storyClip = null;
      actor.storyClipName = null;
    }
    mixer.addEventListener('finished', event => {
      if (event.action !== actor.action) return;
      this.stopGesture(actor);
      if (this.talking && key !== 'dragon') this.startTalk(actor);
    });
    this.actors.set(key, actor);
    this.scene.add(model);
    return actor;
  }

  place(actor, { x = 0, y = 0, z = 0, scale = 1, facing = 0 } = {}, preserveFacing = false) {
    actor.model.position.set(finite(x, 0), finite(y, 0), finite(z, 0));
    actor.model.scale.setScalar(clamp(finite(scale, 1), .1, 3));
    actor.targetFacing = clamp(finite(facing, 0), -Math.PI, Math.PI);
    if (!preserveFacing) actor.model.rotation.y = actor.targetFacing;
  }

  async mount(host, { princess = 'star', dragon = false, placement = {} } = {}) {
    if (this.disposed) throw new Error('Stage disposed');
    const token = ++this.token;
    this.stopLoop();
    this.resizeObserver.disconnect();
    this.host = host;
    host.classList.remove('dragon-3d-ready');
    this.ensureRenderer();
    host.append(this.renderer.domElement);
    this.resizeObserver.observe(host);
    this.resize();
    for (const [key, actor] of this.actors) actor.model.visible = false;
    const gltf = await this.preload(princess);
    if (this.disposed || token !== this.token || this.host !== host) return { stale: true };
    const existingPrincess = this.actors.get(princess);
    const princessActor = existingPrincess || this.makeActor(princess, gltf);
    princessActor.model.visible = true;
    this.place(princessActor, { x: dragon ? -.52 : -.18, scale: 1, facing: this.motion.facing, ...placement.princess },
      Boolean(existingPrincess) && this.currentPrincess === princess);
    princessActor.baseX = princessActor.model.position.x;
    princessActor.baseY = princessActor.model.position.y;
    this.currentPrincess = princess;
    if (this.talking) this.startTalk(princessActor);
    // Paint princess first. A late dragon must never hold the reader behind a curtain.
    this.renderer.render(this.scene, this.camera);
    this.startLoop();
    if (!dragon || !this.urls.dragon) return { princessReady: true, dragonReady: false };
    this.preload('dragon').then(dragonGltf => {
      if (this.disposed || token !== this.token || this.host !== host) return;
      const dragonActor = this.actors.get('dragon') || this.makeActor('dragon', dragonGltf);
      this.place(dragonActor, { x: .58, scale: .6, facing: -.2, ...placement.dragon });
      dragonActor.baseX = dragonActor.model.position.x;
      dragonActor.baseY = dragonActor.model.position.y;
      dragonActor.baseZ = dragonActor.model.position.z;
      if (this.lastDragonWasVisible) dragonActor.model.position.y += this.lastDragonOffset;
      else dragonActor.dragonPhase = 0;
      dragonActor.model.visible = true;
      this.updateDragonStoryClip();
      host.classList.add('dragon-3d-ready'); // Caller may hide its illustration now.
    }).catch(error => this.onError('Dragon 3D load failed; keeping illustration', error));
    return { princessReady: true, dragonReady: this.actors.get('dragon')?.model.visible || false };
  }

  resize() {
    if (!this.renderer || !this.host?.isConnected) return;
    const width = Math.max(1, this.host.clientWidth), height = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(width, height, false);
    const halfHeight = 1.22, aspect = width / height;
    this.camera.left = -halfHeight * aspect;
    this.camera.right = halfHeight * aspect;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
  }

  play(actor, name, once = false) {
    if (!actor || name === 'Idle_7') { this.stopGesture(actor); return; }
    if (!actor.clips.has(name) || actor.name === name) return;
    const next = actor.mixer.clipAction(actor.clips.get(name));
    actor.action?.fadeOut(.55);
    next.reset().setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat).setEffectiveWeight(1).fadeIn(.55).play();
    next.clampWhenFinished = once;
    actor.action = next; actor.name = name;
  }

  stopGesture(actor) {
    if (!actor) return;
    actor.action?.fadeOut(.55); actor.action = null; actor.name = null;
  }

  startTalk(actor) {
    if (!actor) return;
    const accent = ONE_SHOT_TALKS.has(this.motion.talk);
    if (accent && this.accentPlayed && actor.name === this.motion.talk) return;
    const name = accent && this.accentPlayed ? FOLLOWUP_TALK : this.motion.talk;
    if (accent && !this.accentPlayed) this.accentPlayed = true;
    this.play(actor, name, accent && name === this.motion.talk);
  }

  setSceneMotion(motion = {}) {
    this.starRelease = null;
    this.starFade = 0;
    this.star.visible = false;
    this.motion = { talk: GESTURES.has(motion.talk) ? motion.talk : 'Talk_with_Hands_Open',
      facing: clamp(finite(motion.facing, 0), -.25, .25),
      dragon: DRAGON_ACTIONS.has(motion.dragon) ? motion.dragon : 'quiet', effect: null,
      stageAction: null, dragonClip: null,
      beats: Array.isArray(motion.beats) ? motion.beats.filter(beat =>
        Number.isFinite(beat.at) && beat.at >= 0 && beat.at <= 1 &&
        GESTURES.has(beat.princess) && DRAGON_ACTIONS.has(beat.dragon)) : [] };
    this.activeBeat = -1;
    this.accentPlayed = false;
    this.setNarrationProgress(0);
    const actor = this.actors.get(this.currentPrincess);
    if (actor) { actor.targetFacing = this.motion.facing; if (this.talking) this.startTalk(actor); }
  }

  // Word timing drives scene action, rather than replaying one gesture for the whole paragraph.
  setNarrationProgress(progress) {
    const beats = this.motion.beats;
    if (!beats?.length) return;
    let index = 0;
    for (let i = 1; i < beats.length; i++) if (progress >= beats[i].at) index = i;
    if (index === this.activeBeat) return;
    this.activeBeat = index;
    this.actionAge = 0;
    const beat = beats[index];
    this.motion.talk = beat.princess;
    this.motion.dragon = beat.dragon;
    if (this.motion.effect === 'carryStar' && beat.effect !== 'carryStar') {
      this.starRelease = { from: this.star.position.clone(), age: 0 };
    }
    this.motion.effect = STORY_ACTIONS.has(beat.effect) ? beat.effect : null;
    this.motion.stageAction = STAGE_ACTIONS[beat.stageAction] ? beat.stageAction : null;
    this.motion.dragonClip = typeof beat.dragonClip === 'string' ? beat.dragonClip : null;
    if (this.motion.effect === 'carryStar') this.starRelease = null;
    this.accentPlayed = false;
    const actor = this.actors.get(this.currentPrincess);
    if (this.talking && actor?.model.visible) this.startTalk(actor);
    this.updateDragonStoryClip();
  }

  updateDragonStoryClip() {
    const actor = this.actors.get('dragon');
    if (!actor) return;
    const name = this.motion.dragonClip ||
      ({ carryStar: 'Story_Carry', carryShimmer: 'Story_Carry',
        hug: 'Story_Hug', curl: 'Story_Curl' }[this.motion.effect] ||
        DRAGON_BEHAVIOR_CLIP[this.motion.dragon] || null);
    if (name === actor.storyClipName) return;
    actor.storyClip?.fadeOut(.55);
    actor.storyClip = null;
    actor.storyClipName = name;
    actor.idleAction?.fadeIn(.55);
    if (!name || !actor.clips.has(name)) return;
    actor.idleAction?.fadeOut(.55);
    const action = actor.mixer.clipAction(actor.clips.get(name));
    action.reset().setLoop(THREE.LoopRepeat).setEffectiveWeight(1).fadeIn(.55).play();
    actor.storyClip = action;
  }

  setTalking(value) {
    this.talking = Boolean(value);
    const actor = this.actors.get(this.currentPrincess);
    if (this.talking) this.startTalk(actor); else this.stopGesture(actor);
  }

  celebrate() {
    const actor = this.actors.get(this.currentPrincess);
    this.stopGesture(actor);
    this.play(actor, 'Big_Heart_Gesture', true);
  }

  startLoop() {
    if (this.raf || !this.host?.isConnected || this.disposed) return;
    this.clock.getDelta();
    this.raf = requestAnimationFrame(this.tick);
  }

  stopLoop() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }

  tick() {
    this.raf = 0;
    if (!this.host?.isConnected || this.disposed || !this.renderer) return;
    const dt = Math.min(this.clock.getDelta(), .05);
    this.actionAge += dt;
    for (const actor of this.actors.values()) {
      if (!actor.model.visible) continue;
      if (actor.dragonJoints) this.restoreDragonJoints(actor);
      else this.restorePrincessHead(actor);
      actor.mixer.update(dt);
      if (!actor.dragonJoints) this.posePrincess(actor, dt);
      if (actor.dragonJoints) this.poseDragon(actor, dt);
    }
    this.updateStar(dt);
    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this.tick);
  }

  posePrincess(actor, dt) {
    const offset = stageOffset(this.motion.stageAction, 'p', this.actionAge);
    const hug = this.motion.effect === 'hug';
    const blend = Math.min(1, dt * 4);
    actor.model.rotation.y +=
      (actor.targetFacing + offset.turn + (hug ? .12 : 0) - actor.model.rotation.y) * blend;
    actor.model.rotation.x += (offset.pitch - actor.model.rotation.x) * blend;
    actor.model.rotation.z += (offset.roll - actor.model.rotation.z) * blend;
    const x = (actor.baseX ?? actor.model.position.x) + (hug ? .08 : 0) + offset.x;
    actor.model.position.x += (x - actor.model.position.x) * blend;
    actor.model.position.y += ((actor.baseY ?? 0) + offset.y - actor.model.position.y) * blend;
    const head = actor.headBone;
    if (head?.isBone) {
      actor.headBase = head.quaternion.clone();
      const [pitch, yaw, roll] = HEAD_ACTIONS[this.motion.stageAction] || [0, 0, 0];
      head.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll)));
    }
  }

  restorePrincessHead(actor) {
    if (actor.headBone?.isBone && actor.headBase) {
      actor.headBone.quaternion.copy(actor.headBase);
      actor.headBase = null;
    }
  }

  restoreDragonJoints(actor) {
    for (const [bone, original] of actor.dragonBase) bone.quaternion.copy(original);
    actor.dragonBase.clear();
    actor.model.updateMatrixWorld(true);
  }

  poseDragon(actor, dt) {
    const behavior = this.motion.dragon || 'quiet';
    const offset = stageOffset(this.motion.stageAction, 'd', this.actionAge);
    actor.dragonPhase += dt;
    const t = actor.dragonPhase;
    if (this.motion.effect === 'hug' || this.motion.effect === 'curl') {
      const blend = Math.min(1, dt * 3.4);
      const x = actor.baseX + (this.motion.effect === 'hug' ? -.30 : -.08) + offset.x;
      const y = actor.baseY + (this.motion.effect === 'curl' ? -.08 : 0) + offset.y;
      actor.model.position.x += (x - actor.model.position.x) * blend;
      actor.model.position.y += (y - actor.model.position.y) * blend;
       actor.model.position.z += (actor.baseZ + (this.motion.effect === 'hug' ? -.06 : 0) - actor.model.position.z) * blend;
      actor.model.rotation.y += ((actor.targetFacing + (this.motion.effect === 'hug' ? -.4 : -.1) + offset.turn) - actor.model.rotation.y) * blend;
      actor.model.rotation.z += (offset.roll - actor.model.rotation.z) * blend;
      actor.model.rotation.x += (offset.pitch - actor.model.rotation.x) * blend;
      actor.model.updateMatrixWorld(true);
      return;
    }
    const flap = Math.sin(t * 6.2);
    const hop = Math.max(0, Math.sin(t * 3.4));
    // Distinct story beats use the existing rig. The small joint limits keep the mesh intact.
    const poses = {
      quiet: { head: 0, wing: 0, tail: 0, lift: 0, roll: 0, pitch: 0 },
      curious: { head: .13 * Math.sin(t * 1.1), wing: .035, tail: .08 * Math.sin(t * 1.3),
        lift: 0, roll: .035 * Math.sin(t), pitch: 0 },
      help: { head: .11, wing: .13, tail: .05 * Math.sin(t * 1.6), lift: .025, roll: 0, pitch: 0 },
      protect: { head: -.12, wing: .17, tail: -.08, lift: 0, roll: 0, pitch: -.055 },
      celebrate: { head: .07 * Math.sin(t * 2.6), wing: .10 + .15 * Math.max(0, flap),
        tail: .12 * Math.sin(t * 3.4), lift: .17 * hop, roll: .045 * Math.sin(t * 3.4), pitch: 0 },
      hover: { head: .04, wing: .14 + .16 * flap, tail: .08 * Math.sin(t * 2),
        lift: .32 + .035 * Math.sin(t * 2.5), roll: .025 * Math.sin(t * 2.5), pitch: 0 },
      hop: { head: .04 * Math.sin(t * 3.4), wing: .08 + .12 * hop, tail: .10 * Math.sin(t * 3.4),
        lift: .22 * hop, roll: 0, pitch: -.06 * hop },
      search: { head: .20 * Math.sin(t * 1.7), wing: .045, tail: .15 * Math.sin(t * 1.7), lift: 0,
        roll: .06 * Math.sin(t * 1.7), pitch: .035 * Math.sin(t * 1.7) },
      soothe: { head: .045 * Math.sin(t * 1.3), wing: -.05, tail: .04 * Math.sin(t),
        lift: 0, roll: 0, pitch: .025 * Math.sin(t * 1.3) },
      fly: { head: .065, wing: .20 + .24 * flap, tail: .13 * Math.sin(t * 2.7),
        lift: .38 + .06 * Math.sin(t * 2.7), roll: .04 * Math.sin(t * 2.7), pitch: -.055 },
      wave: { head: .055, wing: .045 + .15 * Math.sin(t * 4), tail: .08 * Math.sin(t * 4),
        lift: 0, roll: .025, pitch: 0 },
      rest: { head: -.11, wing: -.09, tail: -.12, lift: 0, roll: 0, pitch: .06 }
    };
    const { head, wing, tail, lift, roll, pitch } = poses[behavior] || poses.quiet;
    const authoredMotion = Boolean(actor.storyClip);
    const travel = {
      quiet: { slide: 0, turn: 0 },
      curious: { slide: .025 * Math.sin(t * 1.3), turn: .12 * Math.sin(t * 1.3) },
      help: { slide: -.045, turn: -.12 },
      protect: { slide: -.085, turn: -.16 },
      celebrate: { slide: .055 * Math.sin(t * 2.2), turn: .12 * Math.sin(t * 2.2) },
      hover: { slide: .04 * Math.sin(t * 1.5), turn: .04 * Math.sin(t * 1.5) },
      hop: { slide: .035 * Math.sin(t * 3.4), turn: .07 * Math.sin(t * 3.4) },
      search: { slide: .07 * Math.sin(t * 1.7), turn: .18 * Math.sin(t * 1.7) },
      soothe: { slide: -.025, turn: -.08 },
      fly: { slide: .07 * Math.sin(t * .9), turn: .08 * Math.sin(t * .9) },
      wave: { slide: 0, turn: -.08 },
      rest: { slide: 0, turn: -.05 }
    }[behavior] || { slide: 0, turn: 0 };
    const blend = Math.min(1, dt * 3.4);
    actor.dragonValue.head += (head - actor.dragonValue.head) * blend;
    actor.dragonValue.wing += (wing - actor.dragonValue.wing) * blend;
    actor.dragonValue.tail += (tail - actor.dragonValue.tail) * blend;
    actor.dragonValue.roll += (roll - actor.dragonValue.roll) * blend;
    actor.dragonValue.pitch += (pitch - actor.dragonValue.pitch) * blend;
    actor.dragonValue.slide += (travel.slide - actor.dragonValue.slide) * blend;
    actor.dragonValue.turn += (travel.turn - actor.dragonValue.turn) * blend;
    actor.dragonValue.wave += ((behavior === 'wave' ? 1 : 0) - actor.dragonValue.wave) * blend;
    const { head: headBone, wingA, wingB, tail: tailBone } = actor.dragonJoints;
    actor.model.updateMatrixWorld(true);
    const modelWorld = actor.model.getWorldQuaternion(new THREE.Quaternion());
    const wingLeft = authoredMotion ? 0 : -actor.dragonValue.wing * (1 - actor.dragonValue.wave) - .04 * actor.dragonValue.wave;
    const wingRight = authoredMotion ? 0 : actor.dragonValue.wing * (1 - actor.dragonValue.wave) +
      (.1 + .23 * Math.sin(t * 4)) * actor.dragonValue.wave;
    for (const [bone, angle] of [[headBone, authoredMotion ? 0 : actor.dragonValue.head],
      [wingA, wingLeft], [wingB, wingRight],
      [tailBone, authoredMotion ? 0 : actor.dragonValue.tail]]) {
      if (!bone) continue;
      actor.dragonBase.set(bone, bone.quaternion.clone());
      if (Math.abs(angle) < 1e-5) continue;
      const parentWorld = bone.parent.getWorldQuaternion(new THREE.Quaternion());
      const axis = new THREE.Vector3(0, 0, 1).applyQuaternion(modelWorld)
        .applyQuaternion(parentWorld.invert()).normalize();
      bone.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, angle));
    }
    const targetY = actor.baseY + (authoredMotion ? 0 : lift) + offset.y;
    actor.model.position.y += (targetY - actor.model.position.y) * blend;
    actor.model.position.x += (actor.baseX + actor.dragonValue.slide + offset.x - actor.model.position.x) * blend;
    actor.model.position.z += (actor.baseZ - actor.model.position.z) * blend;
    actor.model.rotation.y += ((actor.targetFacing + actor.dragonValue.turn + offset.turn) - actor.model.rotation.y) * blend;
    actor.model.rotation.z = actor.dragonValue.roll + offset.roll;
    actor.model.rotation.x = actor.dragonValue.pitch + offset.pitch;
    actor.model.updateMatrixWorld(true);
  }

  updateStar(dt) {
    const dragon = this.actors.get('dragon');
    const carried = dragon?.model.visible && ['carryStar', 'carryShimmer'].includes(this.motion.effect);
    const released = !carried && this.starRelease?.age < 2.2;
    this.starFade += ((carried || released ? 1 : 0) - this.starFade) * Math.min(1, dt * 6);
    this.star.visible = this.starFade > .02;
    if (!this.star.visible || !dragon?.dragonJoints) return;
    if (released) {
      this.starRelease.age += dt;
      const p = Math.min(1, this.starRelease.age / 2.2);
      const rise = 1 - Math.pow(1 - p, 2);
      this.star.position.copy(this.starRelease.from).add(new THREE.Vector3(
        -.15 * p + .055 * Math.sin(p * Math.PI * 2), .8 * rise, .02));
      this.star.scale.setScalar(.18 * this.starFade * (1 - .58 * p));
      return;
    }
    if (!carried) return;
    dragon.model.updateMatrixWorld(true);
    const a = dragon.dragonJoints.wingA.getWorldPosition(new THREE.Vector3());
    const b = dragon.dragonJoints.wingB.getWorldPosition(new THREE.Vector3());
    const target = a.add(b).multiplyScalar(.5);
    target.y -= .06;
    target.z += .65;
    this.star.position.lerp(target, Math.min(1, dt * 12));
    const shimmer = this.motion.effect === 'carryShimmer';
    this.star.scale.setScalar((shimmer ? .085 : .18) * this.starFade *
      (1 + .09 * Math.sin(dragon.dragonPhase * 4)));
  }

  unmount() {
    const dragon = this.actors.get('dragon');
    this.lastDragonWasVisible = Boolean(dragon?.model.visible);
    this.lastDragonOffset = this.lastDragonWasVisible ? dragon.model.position.y - dragon.baseY : 0;
    ++this.token; this.stopLoop(); this.resizeObserver.disconnect();
    this.renderer?.domElement.remove(); this.host = null;
    this.star.visible = false;
    for (const actor of this.actors.values()) actor.model.visible = false;
  }

  dispose() {
    this.unmount(); this.disposed = true;
    this.renderer?.dispose(); this.renderer?.forceContextLoss();
    this.renderer = null;
    for (const actor of this.actors.values()) {
      actor.mixer.stopAllAction();
      actor.model.traverse(part => {
        if (!part.isMesh) return;
        part.geometry.dispose();
        const materials = Array.isArray(part.material) ? part.material : [part.material];
        for (const material of materials) { material.map?.dispose(); material.dispose(); }
      });
    }
    this.star.children[0]?.geometry.dispose();
    for (const part of this.star.children) part.material.dispose();
    this.actors.clear(); this.assets.clear();
  }
}
