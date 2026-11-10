import * as THREE from 'three';
import { makeInscriptionTextures } from './inscription.js';

// 單位：石碑正面寬 = 1（= MindAR target 寬），原點在正面中心，z = 0 是正面
const TOP = 0.743;      // 原本石碑頂邊（矩形部分）
const DEPTH = 0.31;     // 石碑厚度

// 原碑推估高約 149 cm、寬 75.7 cm → 高 / 寬 ≈ 1.97。
// 現存碎片底部在 y = -0.743，所以完整石碑頂端約在 y = 1.225。
// 上方缺的部分（推測，請考古朋友確認）：更多行象形文字 → 一條裝飾帶 → 圓頂（有翼日輪）。
export const ARCH_BASE = 0.98;            // 圓頂起點
export const STELE_TOP = 1.225;           // 圓頂頂點
export const STELE_BOTTOM = -0.743;
const ARCH_HEIGHT = STELE_TOP - ARCH_BASE;

// 斷裂邊界 → 補回矩形頂邊（由掃描模型輪廓自動算出）
const CORNER_OUTLINE = [
  [-0.5, 0.743],
  [-0.5, -0.621],
  [-0.46, 0.119],
  [-0.448, 0.269],
  [-0.43, 0.317],
  [-0.311, 0.398],
  [-0.239, 0.431],
  [-0.049, 0.549],
  [0.012, 0.578],
  [0.095, 0.596],
  [0.168, 0.645],
  [0.277, 0.682],
  [0.317, 0.716],
  [0.364, 0.735],
  [0.429, 0.743],
  [0.459, 0.732],
  [0.473, 0.718],
  [0.479, 0.686],
  [0.5, -0.332],
  [0.5, 0.743]
];

// 補件的最低點（斷裂線的最低處），復原動畫從這裡往上長
export const FRACTURE_BOTTOM = Math.min(...CORNER_OUTLINE.map(([, y]) => y));

function makeOutline() {
  const points = CORNER_OUTLINE.slice(0, -1).map(([x, y]) => new THREE.Vector2(x, y));
  // 右緣往上延伸到圓頂起點，畫半橢圓到左緣，再回到起點
  points.push(new THREE.Vector2(0.5, ARCH_BASE));
  const steps = 64;
  for (let i = 1; i < steps; i++) {
    const t = (i / steps) * Math.PI;
    points.push(new THREE.Vector2(0.5 * Math.cos(t), ARCH_BASE + ARCH_HEIGHT * Math.sin(t)));
  }
  points.push(new THREE.Vector2(-0.5, ARCH_BASE));
  return new THREE.Shape(points);
}

export function makeMissingPieces() {
  const { map, emissiveMap, bumpMap } = makeInscriptionTextures({
    bottom: STELE_BOTTOM,
    top: STELE_TOP,
    archBase: ARCH_BASE,
    fragmentTop: TOP,
  });

  // ExtrudeGeometry 正面的 UV 就是形狀座標 (x, y)，換算成貼圖的 0..1
  const height = STELE_TOP - STELE_BOTTOM;
  for (const tex of [map, emissiveMap, bumpMap]) {
    tex.repeat.set(1, 1 / height);
    tex.offset.set(0.5, -STELE_BOTTOM / height);
  }

  const front = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map,
    bumpMap,
    bumpScale: 1.5,
    emissive: 0xffc35a,
    emissiveMap,
    emissiveIntensity: 0,
    roughness: 0.92,
    transparent: true,
    opacity: 0,
  });
  const side = new THREE.MeshStandardMaterial({
    color: 0xb9a37c, roughness: 0.95, transparent: true, opacity: 0,
  });

  const mesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(makeOutline(), { depth: DEPTH, bevelEnabled: false, curveSegments: 1 }),
    [front, side] // group 0 = 正面 / 背面，group 1 = 側面
  );
  mesh.position.z = -DEPTH;

  const group = new THREE.Group();
  group.add(mesh);
  group.userData.materials = { front, side };
  return group;
}
