import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// 載入石碑掃描模型並變成「隱形遮擋物」：不畫顏色、只寫深度，
// 讓補件被石碑擋住的部分在相機畫面上正確地消失。
export async function loadOccluder(url = '/stele-scan.glb') {
  const gltf = await new GLTFLoader().loadAsync(url);
  const root = gltf.scene;
  const material = new THREE.MeshBasicMaterial({ colorWrite: false });
  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.material = material;
      obj.renderOrder = 0;
    }
  });
  return root;
}
