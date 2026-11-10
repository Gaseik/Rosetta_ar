import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createMissingPieces, addLights } from './scene.js';
import { createReveal } from './reveal.js';

// ?debug=1：不開相機，用一般 three.js 場景檢查掃描模型和補件有沒有對齊。
export async function startDebug(container, button) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x20232a);
  addLights(scene);

  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.01, 50);
  camera.position.set(0.9, 0.5, 2.6);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.1, -0.1);
  controls.enableDamping = true;
  controls.update();

  // 掃描模型用灰色實體材質顯示（AR 模式下它是看不見的遮擋物）
  const gltf = await new GLTFLoader().loadAsync('/stele-scan.glb');
  const grey = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 0.85 });
  gltf.scene.traverse((obj) => {
    if (obj.isMesh) obj.material = grey;
  });
  scene.add(gltf.scene);

  const pieces = createMissingPieces();
  scene.add(pieces);
  // debug 下一直當作有偵測到 target，所以補件會淡入到 0.85，按鈕一樣能切換
  const reveal = createReveal(pieces, button, { tracking: true });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    reveal.update(clock.getDelta());
    controls.update();
    renderer.render(scene, camera);
  });

  // 方便從 console 檢查
  window.__debug = { scene, camera, controls, pieces };
}
