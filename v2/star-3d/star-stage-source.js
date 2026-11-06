import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let renderer, canvas, scene, camera, mixer, model, clips, action, currentName, idleAction;
let activeStage, loading, talking = false;
let sceneMotion = { talk: 'Talk_with_Hands_Open', facing: 0 };
let targetFacing = 0;
const BLEND_SECONDS = .55;
const resizeObserver = new ResizeObserver(resize);
const clock = new THREE.Clock();

function resize() {
  if (!renderer || !activeStage?.isConnected) return;
  const width = Math.max(1, activeStage.clientWidth * .59);
  const height = Math.max(1, activeStage.clientHeight);
  renderer.setSize(width, height, false);
  const halfHeight = 1.22;
  camera.left = -halfHeight * width / height;
  camera.right = halfHeight * width / height;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.updateProjectionMatrix();
}

function play(name, once = false) {
  if (name === 'Idle_7') { stopGesture(); return; }
  if (!mixer || !clips?.has(name) || currentName === name) return;
  const next = mixer.clipAction(clips.get(name));
  if (action) action.fadeOut(BLEND_SECONDS);
  next.reset().setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat);
  next.setEffectiveWeight(.65).fadeIn(BLEND_SECONDS).play();
  next.clampWhenFinished = once;
  action = next;
  currentName = name;
}

function stopGesture() {
  action?.fadeOut(BLEND_SECONDS);
  action = null;
  currentName = null;
}

function frame() {
  requestAnimationFrame(frame);
  const dt = clock.getDelta();
  if (!activeStage?.isConnected || !renderer || !model) return;
  mixer.update(Math.min(dt, .05));
  model.rotation.y += (targetFacing - model.rotation.y) * Math.min(1, dt * 4);
  renderer.render(scene, camera);
}

async function loadModel() {
  canvas = document.createElement('canvas');
  canvas.className = 'star-3d-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Animated Star Princess Alisha');
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 100);
  camera.position.set(0, .85, 5);
  camera.lookAt(0, .85, 0);
  const gltf = await new GLTFLoader().loadAsync('./star-3d/model.glb');
  model = gltf.scene;
  model.traverse(part => {
    if (part.name === 'Icosphere') part.visible = false;
    if (!part.isMesh || part.name === 'Icosphere') return;
    const original = part.material;
    const flat = new THREE.MeshBasicMaterial({ map: original.map, color: original.color, side: original.side, transparent: original.transparent, alphaTest: original.alphaTest });
    flat.toneMapped = false;
    part.material = flat;
  });
  scene.add(model);
  mixer = new THREE.AnimationMixer(model);
  // Keep the legs on a quiet base pose. Meshy gestures otherwise drive knees
  // through the separately skinned skirt during narration.
  const lowerBody = /mixamorig:(?:Hips|LeftUpLeg|RightUpLeg|LeftLeg|RightLeg|LeftFoot|RightFoot|LeftToeBase|RightToeBase)(?:[.\[:]|$)/i;
  clips = new Map(gltf.animations.filter(clip => clip.name !== 'Idle_7').map(clip => {
    const upper = clip.clone();
    upper.tracks = upper.tracks.filter(track => !lowerBody.test(track.name));
    return [upper.name, upper];
  }));
  idleAction = mixer.clipAction(gltf.animations.find(clip => clip.name === 'Idle_7'));
  idleAction.setLoop(THREE.LoopRepeat).play();
  mixer.addEventListener('finished', event => {
    if (event.action !== action) return;
    stopGesture();
    if (talking) play(sceneMotion.talk);
  });
  targetFacing = sceneMotion.facing;
  model.rotation.y = targetFacing;
  if (talking) play(sceneMotion.talk);
  requestAnimationFrame(frame);
}

export async function mountStar(stage) {
  activeStage = stage;
  resizeObserver.disconnect();
  resizeObserver.observe(stage);
  if (!loading) loading = loadModel();
  try {
    await loading;
    if (activeStage !== stage || !stage.isConnected) return;
    stage.append(canvas);
    stage.classList.add('star-3d-ready');
    resize();
    if (talking) play(sceneMotion.talk);
  } catch (error) {
    console.error('Star Princess 3D preview failed:', error);
  }
}

export function setTalking(value) {
  talking = Boolean(value);
  if (talking) play(sceneMotion.talk);
  else stopGesture();
}

export function setSceneMotion(motion) {
  const allowed = ['Idle_7', 'Talk_with_Hands_Open', 'Talk_with_Left_Hand_Raised', 'Talk_with_Right_Hand_Open', 'Talk_Passionately', 'Shrug', 'Confused_Scratch', 'Finger_Wag_No'];
  sceneMotion = {
    talk: allowed.includes(motion?.talk) ? motion.talk : 'Talk_with_Hands_Open',
    facing: Math.max(-0.25, Math.min(0.25, Number(motion?.facing) || 0))
  };
  targetFacing = sceneMotion.facing;
  if (talking) play(sceneMotion.talk);
}

export function celebrate() {
  if (!clips?.has('Big_Heart_Gesture')) return;
  stopGesture();
  play('Big_Heart_Gesture', true);
}
