import * as THREE from 'three';
import { makeMissingPieces } from './missing.js';

// AR 和 debug 共用：補件的 renderOrder 和燈光。
export function createMissingPieces() {
  const pieces = makeMissingPieces();
  pieces.traverse((obj) => {
    if (obj.isMesh) obj.renderOrder = 1;
  });
  return pieces;
}

export function addLights(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(0.6, 1, 1.2);
  scene.add(sun);
}
