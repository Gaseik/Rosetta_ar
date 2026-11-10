import * as THREE from 'three';
import { FRACTURE_BOTTOM, STELE_TOP } from './missing.js';

const OPACITY = 0.85;
const GROW_SECONDS = 2.4;  // 從斷裂線長到圓頂
const HIDE_SECONDS = 1.0;  // 收回去
const EDGE = 0.07;         // 生長前緣發光帶的寬度

// 動畫用的 uniform：補件只畫 y < uRevealY 的部分，前緣發金光，
// 剛長出來的刻字會留一段金色餘暉。
function patchMaterial(material, uniforms) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader =
      'varying float vRevealY;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  vRevealY = position.y;'
      );
    shader.fragmentShader =
      'uniform float uRevealY;\nuniform float uGlyphBase;\nuniform float uTrail;\nuniform vec3 uEdgeColor;\nvarying float vRevealY;\n' +
      shader.fragmentShader
        .replace('void main() {', 'void main() {\n  if (vRevealY > uRevealY) discard;')
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
  float behind = uRevealY - vRevealY;
  totalEmissiveRadiance *= uGlyphBase + uTrail * exp(-behind * 7.0);
  float edge = 1.0 - smoothstep(0.0, ${EDGE.toFixed(3)}, behind);
  totalEmissiveRadiance += uEdgeColor * edge * edge * 2.5;`
        );
  };
  material.needsUpdate = true;
}

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// 控制補件的復原動畫。
// - restored：使用者想看「復原」還是「毀損」（按鈕切換）
// - tracking：目前有沒有偵測到 target
// progress 0 → 1 = 從斷裂線一路長到圓頂；restored && tracking 時往 1 走，否則往 0 收。
export function createReveal(pieces, button, { tracking = false } = {}) {
  const { front, side } = pieces.userData.materials;
  const uniforms = {
    uRevealY: { value: FRACTURE_BOTTOM },
    uGlyphBase: { value: 0.2 },
    uTrail: { value: 1.6 },
    uEdgeColor: { value: new THREE.Color(0xffc35a) },
  };
  front.emissiveIntensity = 1;
  for (const m of [front, side]) {
    m.opacity = OPACITY;
    patchMaterial(m, uniforms);
  }

  let restored = true;
  let progress = 0;
  let sinceComplete = 0;

  const apply = () => {
    const t = easeInOut(progress);
    uniforms.uRevealY.value = THREE.MathUtils.lerp(FRACTURE_BOTTOM - 0.01, STELE_TOP + EDGE, t);
    pieces.visible = progress > 0;

    // 長完之後整片刻字閃一下金光，再慢慢退成淡淡的金色
    const flash = progress < 1 ? 0 : sinceComplete < 0.35 ? sinceComplete / 0.35 : Math.exp(-(sinceComplete - 0.35) * 2.2);
    uniforms.uGlyphBase.value = 0.2 + 0.9 * flash;
    uniforms.uTrail.value = progress < 1 ? 1.6 : 1.6 * Math.max(0, 1 - sinceComplete / 0.5);
  };
  apply();

  const updateButton = () => {
    // 按鈕顯示「按下去會變成什麼」
    button.textContent = restored ? 'Show damage' : 'Restore';
  };
  updateButton();

  button.addEventListener('click', () => {
    restored = !restored;
    updateButton();
  });

  // 跟丟期間補件本來就看不到（MindAR 會隱藏 anchor）。
  // 短暫跟丟後再找回來就維持原狀，跟丟超過這個秒數才重設，下次偵測到重新長一次。
  const RESET_AFTER_LOST = 3;
  let lostFor = 0;

  return {
    setTracking(value) {
      tracking = value;
      lostFor = 0;
    },
    update(dt) {
      if (!tracking) {
        lostFor += dt;
        if (lostFor > RESET_AFTER_LOST && progress > 0) {
          progress = 0;
          sinceComplete = 0;
          apply();
        }
        return;
      }
      const goal = restored ? 1 : 0;
      if (goal > progress) progress = Math.min(1, progress + dt / GROW_SECONDS);
      else if (goal < progress) progress = Math.max(0, progress - dt / HIDE_SECONDS);
      sinceComplete = progress >= 1 ? sinceComplete + dt : 0;
      apply();
    },
  };
}
