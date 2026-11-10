// 開發用：拿靜態圖片模擬手機畫面，跑 MindAR 的偵測 + 比對，看每張圖能不能配到哪個 target。
// 結果顯示在頁面上，也用 console.warn 印出來（Vite 會轉發到 dev server 的終端機）。
import { Controller } from 'mind-ar/dist/mindar-image.prod.js';

// 模擬手機直拿的相機畫面
const W = 480;
const H = 640;

const IMAGES = [
  // target 本身（應該 100% 成功）
  '/stele-target.png',
  '/stele-target-front.png',
  '/stele-target-left.png',
  '/stele-target-right.png',
  '/stele-target-cool.png',
  '/stele-target-left2.png',
  '/stele-target-glass.png',
  '/stele-target-warm.png',
  // 考題：沒做成 target 的照片（test-images/ 不進 git）
  '/test-images/holdout-blue.jpg',
  '/test-images/holdout-front.jpg',
  '/test-images/holdout-right.jpg',
  '/test-images/holdout-leftsteep.jpg',
  // 沒校正過的原始照片，和其他照片
  '/test-images/commons-front-original.jpg',
  '/test-images/commons-left-original.jpg',
  '/test-images/commons-right-original.jpg',
  '/test-images/commons-other-0.jpg',
  '/test-images/commons-other-1.jpg',
  '/test-images/commons-other-2.jpg',
  '/test-images/commons-other-3.jpg',
  '/test-images/commons-other-4.jpg',
  '/test-images/commons-other-5.jpg',
  '/test-images/google-1.jpg',
  '/test-images/google-2.jpg',
  '/test-images/google-3.jpg',
  '/test-images/google-4.jpg',
];

// 圖片在畫面中的大小：圖片高度 / 畫面寬度（MindAR 只偵測中間 W×W 的正方形）
const SIZES = [0.7, 1.0, 1.4];

const status = document.querySelector('#status');
const out = document.querySelector('#out');
const log = (...a) => console.warn('[detect-test]', ...a);

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('failed to load ' + src));
    img.src = src;
  });

const canvas = document.createElement('canvas');
canvas.width = W;
canvas.height = H;
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d', { willReadFrequently: true });

function draw(img, size) {
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, W, H);
  const h = W * size;
  const w = (img.width / img.height) * h;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}

async function main() {
  const controller = new Controller({ inputWidth: W, inputHeight: H, maxTrack: 1 });
  const { dimensions } = await controller.addImageTargets('/stele.mind');
  const targetCount = dimensions.length;
  log('targets in stele.mind:', targetCount);
  controller.dummyRun(canvas);

  const header = document.createElement('tr');
  header.innerHTML = '<th>image</th>' + SIZES.map((s) => `<th>size ${s}</th>`).join('');
  out.appendChild(header);

  for (const src of IMAGES) {
    let img;
    try {
      img = await loadImage(src);
    } catch (e) {
      log(src, 'LOAD FAILED');
      continue;
    }
    const row = document.createElement('tr');
    row.innerHTML = `<td>${src.split('/').pop()}</td>`;
    const summary = [];
    for (const size of SIZES) {
      draw(img, size);
      const { featurePoints } = await controller.detect(canvas);
      const hits = [];
      for (let t = 0; t < targetCount; t++) {
        const { modelViewTransform, debugExtra } = await controller.match(featurePoints, t);
        if (modelViewTransform) hits.push(t);
      }
      const cell = document.createElement('td');
      cell.className = hits.length ? 'ok' : 'no';
      cell.textContent = `${hits.length ? 'T' + hits.join(',T') : '—'} (${featurePoints.length} pts)`;
      row.appendChild(cell);
      summary.push(`size ${size}: ${hits.length ? 'match T' + hits.join(',T') : 'none'} (${featurePoints.length} pts)`);
    }
    out.appendChild(row);
    log(src.split('/').pop(), '|', summary.join(' | '));
    status.textContent = 'Testing… ' + src;
  }
  status.textContent = 'Done.';
  log('DONE');
}

main().catch((e) => {
  status.textContent = 'Error: ' + e.message;
  log('ERROR', e.stack || e.message);
});
