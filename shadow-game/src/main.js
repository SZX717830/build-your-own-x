import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============================================================
// 1. SCENE SETUP
// ============================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a12);
scene.fog = new THREE.Fog(0x0a0a12, 8, 18);

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 30);
camera.position.set(3.5, 2.2, 5.5);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.prepend(renderer.domElement);
} catch (e) {
  document.getElementById('loading').innerHTML = `
    <div style="text-align:center;color:rgba(255,255,255,0.7);padding:20px;">
      <p style="font-size:18px;margin-bottom:12px;">⚠️ 无法启动 3D 渲染</p>
      <p style="font-size:13px;color:rgba(255,255,255,0.4);">您的浏览器不支持 WebGL，请使用最新版 Chrome / Firefox / Edge</p>
    </div>
  `;
  throw new Error('WebGL not supported');
}

// ============================================================
// 2. LIGHTING
// ============================================================
// Very dim ambient for minimal visibility
const ambient = new THREE.AmbientLight(0x1a1a3a, 0.06);
scene.add(ambient);

// A subtle fill from the front
const fillLight = new THREE.DirectionalLight(0x446688, 0.08);
fillLight.position.set(0, 3, 5);
scene.add(fillLight);

// ============================================================
// 3. WALL
// ============================================================
function createWallTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base plaster color
  ctx.fillStyle = '#c8c0b8';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle noise texture
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = 190 + Math.random() * 50;
    ctx.fillStyle = `rgba(${v},${v - 4},${v - 8},0.3)`;
    ctx.fillRect(x, y, 3, 3);
  }

  // Horizontal brush strokes
  ctx.globalAlpha = 0.06;
  for (let i = 0; i < 30; i++) {
    const y = Math.random() * 512;
    ctx.strokeStyle = i % 2 === 0 ? '#b0a898' : '#d8d0c8';
    ctx.lineWidth = 2 + Math.random() * 4;
    ctx.beginPath();
    for (let x = 0; x < 512; x += 5) {
      ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 3);
    }
    ctx.stroke();
  }

  // A few subtle imperfections
  ctx.globalAlpha = 0.1;
  for (let i = 0; i < 15; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 3 + Math.random() * 8;
    ctx.fillStyle = '#a09888';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.anisotropy = 4;
  return texture;
}

const wallMat = new THREE.MeshStandardMaterial({
  map: createWallTexture(),
  roughness: 0.95,
  metalness: 0.0,
  side: THREE.DoubleSide,
});
const wallGeo = new THREE.PlaneGeometry(8, 5.5);
const wall = new THREE.Mesh(wallGeo, wallMat);
wall.position.set(0, 0.4, -2.8);
wall.receiveShadow = true;
scene.add(wall);

// ============================================================
// 4. PICTURE FRAME ON WALL
// ============================================================
function createPictureFrame() {
  const group = new THREE.Group();

  // Frame
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x6b3a2a,
    roughness: 0.5,
    metalness: 0.2,
  });
  const outerW = 0.7, outerH = 0.5, depth = 0.04;
  const frameGeo = new THREE.BoxGeometry(outerW, outerH, depth);
  const frame = new THREE.Mesh(frameGeo, frameMat);
  group.add(frame);

  // Inner frame (lighter)
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0x8b6b4a,
    roughness: 0.4,
    metalness: 0.1,
  });
  const innerGeo = new THREE.BoxGeometry(outerW + 0.03, outerH + 0.03, depth * 0.5);
  const inner = new THREE.Mesh(innerGeo, innerMat);
  inner.position.z = -depth * 0.25;
  group.add(inner);

  // Picture - simple landscape
  const picCanvas = document.createElement('canvas');
  picCanvas.width = 256;
  picCanvas.height = 180;
  const pctx = picCanvas.getContext('2d');
  // Sky gradient
  const skyGrad = pctx.createLinearGradient(0, 0, 0, 180);
  skyGrad.addColorStop(0, '#87CEEB');
  skyGrad.addColorStop(0.6, '#B0E0E6');
  skyGrad.addColorStop(1, '#98FB98');
  pctx.fillStyle = skyGrad;
  pctx.fillRect(0, 0, 256, 180);
  // Sun
  pctx.fillStyle = '#FFD700';
  pctx.beginPath();
  pctx.arc(200, 40, 25, 0, Math.PI * 2);
  pctx.fill();
  // Mountains
  pctx.fillStyle = '#556B2F';
  pctx.beginPath();
  pctx.moveTo(0, 140);
  pctx.lineTo(60, 60);
  pctx.lineTo(120, 110);
  pctx.lineTo(180, 50);
  pctx.lineTo(256, 100);
  pctx.lineTo(256, 180);
  pctx.lineTo(0, 180);
  pctx.closePath();
  pctx.fill();
  // Snow caps
  pctx.fillStyle = '#FFFFFF';
  pctx.beginPath();
  pctx.moveTo(55, 65);
  pctx.lineTo(60, 60);
  pctx.lineTo(65, 68);
  pctx.closePath();
  pctx.fill();
  pctx.beginPath();
  pctx.moveTo(175, 55);
  pctx.lineTo(180, 50);
  pctx.lineTo(185, 58);
  pctx.closePath();
  pctx.fill();

  const picTex = new THREE.CanvasTexture(picCanvas);
  const picMat = new THREE.MeshStandardMaterial({ map: picTex, roughness: 0.6 });
  const picGeo = new THREE.PlaneGeometry(outerW - 0.08, outerH - 0.08);
  const picture = new THREE.Mesh(picGeo, picMat);
  picture.position.z = depth * 0.5 + 0.001;
  group.add(picture);

  group.position.set(1.8, 1.6, -2.75);
  return group;
}
scene.add(createPictureFrame());

// ============================================================
// 5. FLOOR
// ============================================================
function createFloorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base wood color
  ctx.fillStyle = '#4a3528';
  ctx.fillRect(0, 0, 512, 512);

  // Wood plank lines
  for (let p = 0; p < 6; p++) {
    const py = p * 85 + 10;
    // Plank base
    const plankColor = 60 + Math.random() * 30;
    ctx.fillStyle = `rgb(${plankColor + 10}, ${plankColor}, ${plankColor - 5})`;
    ctx.fillRect(0, py, 512, 80);

    // Wood grain
    for (let i = 0; i < 40; i++) {
      const gy = py + Math.random() * 80;
      const gbright = 50 + Math.random() * 40;
      ctx.strokeStyle = `rgba(${gbright}, ${gbright - 5}, ${gbright - 8}, 0.15)`;
      ctx.lineWidth = 0.5 + Math.random() * 1.5;
      ctx.beginPath();
      for (let x = 0; x < 512; x += 4) {
        ctx.lineTo(x, gy + Math.sin(x * 0.008 + p * 2 + i) * 2 + Math.sin(x * 0.02) * 1.5);
      }
      ctx.stroke();
    }

    // Plank gap
    ctx.strokeStyle = 'rgba(30,20,15,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, py + 80);
    ctx.lineTo(512, py + 80);
    ctx.stroke();

    // Nail holes
    for (let n = 0; n < 4; n++) {
      const nx = 60 + n * 130 + Math.random() * 20;
      ctx.fillStyle = 'rgba(20,15,10,0.4)';
      ctx.beginPath();
      ctx.arc(nx, py + 78, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.anisotropy = 4;
  return texture;
}

const floorMat = new THREE.MeshStandardMaterial({
  map: createFloorTexture(),
  roughness: 0.85,
  metalness: 0.0,
  side: THREE.DoubleSide,
});
const floorGeo = new THREE.PlaneGeometry(10, 8);
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.set(0, -0.85, 0);
floor.receiveShadow = true;
scene.add(floor);

// ============================================================
// 6. BEAR - Detailed Teddy Bear Model
// ============================================================
function createBear() {
  const group = new THREE.Group();

  const furColor = 0xC4956A;
  const furLight = 0xE8C9A0;
  const furDark = 0x8B6914;
  const eyeColor = 0x1a1a1a;
  const noseColor = 0x2a1a0a;

  const furMat = new THREE.MeshStandardMaterial({
    color: furColor, roughness: 0.85, metalness: 0.0,
  });
  const lightMat = new THREE.MeshStandardMaterial({
    color: furLight, roughness: 0.9, metalness: 0.0,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: furDark, roughness: 0.9, metalness: 0.0,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: eyeColor, roughness: 0.2, metalness: 0.1,
  });
  const noseMat = new THREE.MeshStandardMaterial({
    color: noseColor, roughness: 0.5, metalness: 0.0,
  });
  const highlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0, metalness: 0,
  });

  // --- Body ---
  const bodyGeo = new THREE.SphereGeometry(0.5, 28, 28);
  const body = new THREE.Mesh(bodyGeo, furMat);
  body.scale.set(1, 1.1, 0.85);
  body.position.y = 0.15;
  body.castShadow = true;
  group.add(body);

  // Belly patch
  const bellyGeo = new THREE.SphereGeometry(0.32, 20, 20);
  const belly = new THREE.Mesh(bellyGeo, lightMat);
  belly.scale.set(1, 0.9, 0.5);
  belly.position.set(0, 0.1, 0.4);
  group.add(belly);

  // --- Head ---
  const headGeo = new THREE.SphereGeometry(0.34, 28, 28);
  const head = new THREE.Mesh(headGeo, furMat);
  head.position.y = 0.78;
  head.castShadow = true;
  group.add(head);

  // Snout
  const snoutGeo = new THREE.SphereGeometry(0.1, 16, 16);
  const snout = new THREE.Mesh(snoutGeo, lightMat);
  snout.scale.set(1.2, 0.8, 0.6);
  snout.position.set(0, 0.76, 0.32);
  group.add(snout);

  // Nose
  const noseGeo = new THREE.SphereGeometry(0.035, 10, 10);
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.scale.set(1, 0.7, 0.8);
  nose.position.set(0, 0.75, 0.38);
  group.add(nose);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.042, 12, 12);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.13, 0.84, 0.32);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.13, 0.84, 0.32);
  group.add(rightEye);

  // Eye highlights (shiny)
  const hlGeo = new THREE.SphereGeometry(0.014, 8, 8);
  const leftHL = new THREE.Mesh(hlGeo, highlightMat);
  leftHL.position.set(-0.11, 0.86, 0.36);
  group.add(leftHL);
  const rightHL = new THREE.Mesh(hlGeo, highlightMat);
  rightHL.position.set(0.15, 0.86, 0.36);
  group.add(rightHL);

  // --- Ears ---
  const earGeo = new THREE.SphereGeometry(0.12, 16, 16);
  const leftEar = new THREE.Mesh(earGeo, furMat);
  leftEar.scale.set(1, 0.8, 0.8);
  leftEar.position.set(-0.26, 1.04, 0);
  group.add(leftEar);
  const rightEar = new THREE.Mesh(earGeo, furMat);
  rightEar.scale.set(1, 0.8, 0.8);
  rightEar.position.set(0.26, 1.04, 0);
  group.add(rightEar);

  // Inner ears
  const innerEarGeo = new THREE.SphereGeometry(0.06, 10, 10);
  const leftIE = new THREE.Mesh(innerEarGeo, lightMat);
  leftIE.scale.set(1, 0.7, 0.7);
  leftIE.position.set(-0.26, 1.02, 0.06);
  group.add(leftIE);
  const rightIE = new THREE.Mesh(innerEarGeo, lightMat);
  rightIE.scale.set(1, 0.7, 0.7);
  rightIE.position.set(0.26, 1.02, 0.06);
  group.add(rightIE);

  // --- Arms ---
  function createArm(x, zRot, xRot) {
    const armGroup = new THREE.Group();
    const armGeo = new THREE.CylinderGeometry(0.055, 0.075, 0.32, 10);
    const arm = new THREE.Mesh(armGeo, furMat);
    arm.position.y = 0.16;
    arm.castShadow = true;
    armGroup.add(arm);

    // Paw pad
    const pawGeo = new THREE.SphereGeometry(0.065, 8, 8);
    const paw = new THREE.Mesh(pawGeo, darkMat);
    paw.scale.set(1, 0.5, 0.8);
    paw.position.set(0, 0, 0.06);
    armGroup.add(paw);

    armGroup.position.set(x, 0.32, 0);
    armGroup.rotation.z = zRot;
    armGroup.rotation.x = xRot;
    return armGroup;
  }
  group.add(createArm(-0.52, 0.15, -0.4));
  group.add(createArm(0.52, -0.15, 0.4));

  // --- Legs ---
  function createLeg(x) {
    const legGroup = new THREE.Group();
    const legGeo = new THREE.CylinderGeometry(0.075, 0.095, 0.32, 10);
    const leg = new THREE.Mesh(legGeo, furMat);
    leg.position.y = 0.16;
    leg.castShadow = true;
    legGroup.add(leg);

    // Foot pad
    const footGeo = new THREE.SphereGeometry(0.07, 8, 8);
    const foot = new THREE.Mesh(footGeo, darkMat);
    foot.scale.set(1.2, 0.4, 0.8);
    foot.position.set(0, 0, 0.05);
    legGroup.add(foot);

    legGroup.position.set(x, -0.35, 0);
    return legGroup;
  }
  group.add(createLeg(-0.18));
  group.add(createLeg(0.18));

  // --- Tail (small puff) ---
  const tailGeo = new THREE.SphereGeometry(0.06, 10, 10);
  const tail = new THREE.Mesh(tailGeo, furMat);
  tail.position.set(0, 0.05, -0.45);
  tail.scale.set(1, 0.8, 0.6);
  group.add(tail);

  // --- Cheek blush ---
  const blushMat = new THREE.MeshStandardMaterial({
    color: 0xE8A0A0, roughness: 0.9, metalness: 0.0, transparent: true, opacity: 0.25,
  });
  const blushGeo = new THREE.SphereGeometry(0.06, 10, 10);
  const leftBlush = new THREE.Mesh(blushGeo, blushMat);
  leftBlush.scale.set(1.3, 0.8, 0.5);
  leftBlush.position.set(-0.18, 0.7, 0.28);
  group.add(leftBlush);
  const rightBlush = new THREE.Mesh(blushGeo, blushMat);
  rightBlush.scale.set(1.3, 0.8, 0.5);
  rightBlush.position.set(0.18, 0.7, 0.28);
  group.add(rightBlush);

  // --- Mouth (subtle smile) ---
  const mouthMat = new THREE.MeshStandardMaterial({
    color: 0x5a3a2a, roughness: 0.8, metalness: 0.0,
  });
  const mouthGeo = new THREE.TorusGeometry(0.025, 0.008, 6, 8, Math.PI);
  const mouth = new THREE.Mesh(mouthGeo, mouthMat);
  mouth.rotation.x = -0.2;
  mouth.rotation.z = 0.1;
  mouth.position.set(0, 0.72, 0.38);
  group.add(mouth);

  return group;
}

const bear = createBear();
// Floor at y=-0.85, bear feet at y=-0.35 relative to group, so offset by -0.5
bear.position.set(0, -0.5, 0);
scene.add(bear);

// ============================================================
// 7. FLASHLIGHT & SPOTLIGHT
// ============================================================
function createFlashlightModel() {
  const group = new THREE.Group();

  // Body (main cylinder)
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x4a4a4a, roughness: 0.3, metalness: 0.7,
  });
  const bodyGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.28, 14);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.rotation.x = Math.PI / 2;
  body.position.z = 0.14;
  group.add(body);

  // Head (wider cone)
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x3a3a3a, roughness: 0.25, metalness: 0.8,
  });
  const headGeo = new THREE.CylinderGeometry(0.11, 0.07, 0.07, 14);
  const head = new THREE.Mesh(headGeo, headMat);
  head.rotation.x = Math.PI / 2;
  head.position.z = 0.32;
  group.add(head);

  // Lens
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0xffeecc, roughness: 0.05, metalness: 0.0,
    emissive: 0xffeecc, emissiveIntensity: 0.4,
  });
  const lensGeo = new THREE.CircleGeometry(0.11, 14);
  const lens = new THREE.Mesh(lensGeo, lensMat);
  lens.position.z = 0.36;
  group.add(lens);

  // Handle grip rings
  const gripMat = new THREE.MeshStandardMaterial({
    color: 0x333333, roughness: 0.95, metalness: 0.0,
  });
  for (let i = 0; i < 3; i++) {
    const gripGeo = new THREE.TorusGeometry(0.08, 0.015, 6, 14);
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.rotation.y = Math.PI / 2;
    grip.position.z = 0.05 + i * 0.06;
    group.add(grip);
  }

  // Switch button
  const switchMat = new THREE.MeshStandardMaterial({
    color: 0xcc3333, roughness: 0.4, metalness: 0.3,
  });
  const switchGeo = new THREE.BoxGeometry(0.02, 0.03, 0.015);
  const switchBtn = new THREE.Mesh(switchGeo, switchMat);
  switchBtn.position.set(0.05, 0.08, 0.15);
  group.add(switchBtn);

  group.scale.set(1.2, 1.2, 1.2);
  return group;
}

const flashlight = createFlashlightModel();
scene.add(flashlight);

// Spotlight from the flashlight
const spotlight = new THREE.SpotLight(0xffeedd, 35, 14, Math.PI / 5.5, 0.45, 1.5);
spotlight.castShadow = true;
spotlight.shadow.mapSize.width = 2048;
spotlight.shadow.mapSize.height = 2048;
spotlight.shadow.camera.near = 0.5;
spotlight.shadow.camera.far = 14;
spotlight.shadow.camera.fov = 35;
spotlight.shadow.bias = -0.002;
spotlight.shadow.normalBias = 0.02;
spotlight.shadow.radius = 4;
scene.add(spotlight);

// Spotlight target (fixed on the wall behind the bear)
const spotTarget = new THREE.Object3D();
spotTarget.position.set(0, 0.3, -2.8);
scene.add(spotTarget);
spotlight.target = spotTarget;

// A secondary point light near the flashlight for ambient glow
const pointLight = new THREE.PointLight(0xffeedd, 0.8, 4, 2);
scene.add(pointLight);

// ============================================================
// 8. VISIBLE LIGHT BEAM
// ============================================================
function createLightBeam() {
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffffcc,
    transparent: true,
    opacity: 0.06,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const beamGeo = new THREE.ConeGeometry(0.6, 3.5, 20, 1, true);
  const beam = new THREE.Mesh(beamGeo, beamMat);
  return beam;
}

const lightBeam = createLightBeam();
scene.add(lightBeam);

// ============================================================
// 9. FLASHLIGHT SPHERICAL CONTROL
// ============================================================
let theta = 0.3;       // horizontal angle
let phi = 0.9;         // vertical angle (0 = top, PI = bottom)
const FL_RADIUS = 3.2;
const BEAM_TARGET = new THREE.Vector3(0, 0.3, -2.8);
const UP_VECTOR = new THREE.Vector3(0, 1, 0);

function updateFlashlightPosition() {
  const x = FL_RADIUS * Math.sin(phi) * Math.cos(theta);
  const y = FL_RADIUS * Math.cos(phi);
  const z = FL_RADIUS * Math.sin(phi) * Math.sin(theta) + 0.3;

  flashlight.position.set(x, y, z);
  spotlight.position.set(x, y, z);
  pointLight.position.set(x, y, z);

  // Point flashlight toward the bear/wall
  flashlight.lookAt(BEAM_TARGET);

  // Orient light beam cone using quaternion
  // Cone tip is at +Y by default, rotate to point toward BEAM_TARGET
  const dir = new THREE.Vector3().copy(BEAM_TARGET).sub(flashlight.position);
  const dist = dir.length();
  const dirNorm = dir.clone().normalize();

  lightBeam.quaternion.setFromUnitVectors(UP_VECTOR, dirNorm);
  lightBeam.position.copy(flashlight.position).add(dir.clone().multiplyScalar(0.5));
  lightBeam.scale.set(1, dist / 3.5, 1);

  // Update beam opacity based on distance
  const beamOpacity = Math.max(0.02, 0.08 - dist * 0.005);
  lightBeam.material.opacity = beamOpacity;
}

// Initialize
updateFlashlightPosition();

// ============================================================
// 10. ORBIT CONTROLS (right-click orbit)
// ============================================================
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.3, -1.0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 2.0;
controls.maxDistance = 9.0;
controls.maxPolarAngle = Math.PI / 2.05;
controls.minPolarAngle = 0.1;
controls.mouseButtons = {
  LEFT: null,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.ROTATE,
};
controls.touches = {
  ONE: THREE.TOUCH.PAN,
  TWO: THREE.TOUCH.DOLLY_PAN,
};
controls.update();

// ============================================================
// 11. FLASHLIGHT DRAGGING (left-click)
// ============================================================
let isDragging = false;
let prevMouseX = 0;
let prevMouseY = 0;

function onPointerDown(event) {
  if (event.button === 0) {
    isDragging = true;
    prevMouseX = event.clientX;
    prevMouseY = event.clientY;
    renderer.domElement.style.cursor = 'grabbing';
  }
}

function onPointerMove(event) {
  if (isDragging) {
    const dx = event.clientX - prevMouseX;
    const dy = event.clientY - prevMouseY;

    theta -= dx * 0.008;
    phi += dy * 0.008;
    phi = Math.max(0.15, Math.min(Math.PI - 0.15, phi));

    updateFlashlightPosition();
    controls.update();

    prevMouseX = event.clientX;
    prevMouseY = event.clientY;
  }
  // Update cursor position
  const cursor = document.getElementById('flashlight-cursor');
  cursor.style.left = (event.clientX - 16) + 'px';
  cursor.style.top = (event.clientY - 16) + 'px';
}

function onPointerUp() {
  isDragging = false;
  renderer.domElement.style.cursor = 'default';
}

renderer.domElement.addEventListener('mousedown', onPointerDown);
window.addEventListener('mousemove', onPointerMove);
window.addEventListener('mouseup', onPointerUp);

// Touch support
let touchId = null;
renderer.domElement.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    const touch = e.touches[0];
    touchId = touch.identifier;
    isDragging = true;
    prevMouseX = touch.clientX;
    prevMouseY = touch.clientY;
  }
}, { passive: true });

renderer.domElement.addEventListener('touchmove', (e) => {
  if (isDragging && touchId !== null) {
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === touchId) {
        const touch = e.touches[i];
        const dx = touch.clientX - prevMouseX;
        const dy = touch.clientY - prevMouseY;

        theta -= dx * 0.008;
        phi += dy * 0.008;
        phi = Math.max(0.15, Math.min(Math.PI - 0.15, phi));

        updateFlashlightPosition();

        prevMouseX = touch.clientX;
        prevMouseY = touch.clientY;
        break;
      }
    }
  }
}, { passive: true });

renderer.domElement.addEventListener('touchend', (e) => {
  isDragging = false;
  touchId = null;
}, { passive: true });

// ============================================================
// 12. BREATHING ANIMATION FOR BEAR
// ============================================================
let breatheTime = 0;

// ============================================================
// 13. WINDOW RESIZE
// ============================================================
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  controls.update();
});

// ============================================================
// 14. LOADING COMPLETE
// ============================================================
setTimeout(() => {
  document.getElementById('loading').classList.add('hidden');
}, 600);

// ============================================================
// 15. ANIMATION LOOP
// ============================================================
function animate() {
  requestAnimationFrame(animate);

  breatheTime += 0.02;
  // Subtle breathing
  const breathe = Math.sin(breatheTime) * 0.004;
  bear.position.y = breathe;
  bear.scale.y = 1 + Math.sin(breatheTime) * 0.002;

  // Subtle light flicker
  const flicker = 1 + (Math.random() - 0.5) * 0.015;
  spotlight.intensity = 35 * flicker;

  controls.update();
  renderer.render(scene, camera);
}

animate();

// ============================================================
// 16. KEYBOARD SHORTCUTS
// ============================================================
window.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    // Reset flashlight position
    theta = 0.3;
    phi = 0.9;
    updateFlashlightPosition();
  }
  if (e.key === 'c' || e.key === 'C') {
    // Reset camera
    camera.position.set(3.5, 2.2, 5.5);
    controls.target.set(0, 0.3, -1.0);
    controls.update();
  }
});

console.log('🔦 影子探险已启动！');
console.log('左键拖动: 移动手电筒 | 右键拖动: 旋转视角 | 滚轮: 缩放');
console.log('按 R 键: 重置手电筒位置 | 按 C 键: 重置相机位置');