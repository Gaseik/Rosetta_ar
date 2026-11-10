import * as THREE from 'three';

// stele.mind 要用這些圖、照這個順序編譯（順序 = target index）。
// 每張都是石碑正面、1078 × 1600、石碑剛好填滿畫面，座標和掃描模型一致。
// 清單比 .mind 裡的 target 多也沒關係，多的 anchor 只是永遠不會觸發。
const TARGETS = [
  'stele-target.png',       // 0：掃描模型的渲染圖（對著圖片 demo 用）
  // 1–3：大英博物館現場照片（Wikimedia Commons，授權見 README），透視校正到同一座標
  'stele-target-front.png', // 1：正面
  'stele-target-left.png',  // 2：從左前方拍
  'stele-target-right.png', // 3：從右前方拍
  // 4–7：再補不同光線 / 年代 / 玻璃反光的現場照片，提高沒見過的畫面也能認出來的機率
  'stele-target-cool.png',  // 4：2024 新展櫃，冷色光
  'stele-target-left2.png', // 5：2023，左前方，有反光
  'stele-target-glass.png', // 6：隔著玻璃、倒影多，右前方
  'stele-target-warm.png',  // 7：暖色光、高對比（特徵點少，對齊誤差約 1%，較沒把握）
];

const container = document.querySelector('#ar-container');
const button = document.querySelector('#toggle');

if (new URLSearchParams(location.search).get('debug') === '1') {
  // debug 模式不需要相機，也不要載入 mind-ar（它很大）
  const { startDebug } = await import('./debug.js');
  button.hidden = false;
  await startDebug(container, button);
} else {
  await startAR();
}

async function startAR() {
  const { createScanUI } = await import('./scan-ui.js');
  const scanUI = createScanUI();
  scanUI.loading();

  try {
    const [{ MindARThree }, { loadOccluder }, { createMissingPieces, addLights }, { createReveal }] =
      await Promise.all([
        import('mind-ar/dist/mindar-image-three.prod.js'),
        import('./occluder.js'),
        import('./scene.js'),
        import('./reveal.js'),
      ]);

    const mindar = new MindARThree({
      container,
      imageTargetSrc: '/stele.mind',
      maxTrack: 1,
      // 防抖：MindAR 預設 (0.001 / 1000) 反應很快但會抖，調低讓姿態更平滑（代價是移動時稍微跟慢一點）
      filterMinCF: 0.0001,
      filterBeta: 0.001,
      // 偵測到後要連續幾幀才算數 / 掉幾幀才算跟丟（預設都是 5），跟丟的容忍度拉高避免閃爍
      warmupTolerance: 5,
      missTolerance: 10,
      // MindAR 內建的 UI 全部關掉，改用 scan-ui.js
      uiLoading: 'no',
      uiScanning: 'no',
      uiError: 'no',
    });
    const { renderer, scene, camera } = mindar;
    addLights(scene);

    // MindAR anchor 的座標：target 寬 = 1、原點在圖片中心、+Z 朝向相機，
    // 和 stele-scan.glb / missing.js 的座標系一致，所以不用另外對位。
    const group = new THREE.Group();
    const occluder = await loadOccluder();
    const pieces = createMissingPieces();
    group.add(occluder, pieces);

    const reveal = createReveal(pieces, button);
    // 短暫跟丟時不要馬上跳回掃描畫面，不然會一直閃
    let lostTimer;

    // stele.mind 裡的每張圖各有一個 anchor，全部都是「石碑正面」同一個座標系，
    // 只是外觀不同（見 TARGETS）。maxTrack = 1，同時只會追一張，
    // 偵測到哪一張就把石碑內容搬到那個 anchor 底下。
    for (let i = 0; i < TARGETS.length; i++) {
      const anchor = mindar.addAnchor(i);
      anchor.onTargetFound = () => {
        anchor.group.add(group);
        clearTimeout(lostTimer);
        reveal.setTracking(true);
        scanUI.hide();
        button.hidden = false;
      };
      anchor.onTargetLost = () => {
        if (group.parent !== anchor.group) return;
        reveal.setTracking(false);
        lostTimer = setTimeout(() => {
          scanUI.scanning();
          button.hidden = true;
        }, 800);
      };
    }

    await mindar.start();
    scanUI.scanning();

    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      reveal.update(clock.getDelta());
      renderer.render(scene, camera);
    });
  } catch (err) {
    console.error(err);
    scanUI.error('Could not start the camera. Allow camera access and reload the page.');
  }
}
