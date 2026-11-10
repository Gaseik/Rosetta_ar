import * as THREE from 'three';

// 用 canvas 畫出補件正面的「推測銘文」貼圖。
// 版面參考 Parkinson (1999) 的完整石碑推測：圓頂有翼日輪 → 裝飾帶 → 象形文字 → 世俗體 → 希臘文。
// 字形是隨機產生的示意，不是真正的文字。
//
// 回傳三張貼圖，全部對應同一個座標：x ∈ [-0.5, 0.5]、y ∈ [bottom, top]
// - map：米色石膏底色 + 刻痕
// - bumpMap：刻痕凹下去
// - emissiveMap：刻痕本身，給金色發光用

const W = 1024;

// 固定種子，讓每次載入的字都一樣
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeInscriptionTextures({ bottom, top, archBase, fragmentTop }) {
  const height = top - bottom;
  const H = Math.round(W * height);
  const rand = rng(1799); // 石碑出土年

  const px = (x) => (x + 0.5) * W;
  const py = (y) => ((top - y) / height) * H;
  const u = W; // 1 單位 = W px

  // ---- 刻痕遮罩（白色 = 刻痕）----
  const mask = document.createElement('canvas');
  mask.width = W;
  mask.height = H;
  const g = mask.getContext('2d');
  g.strokeStyle = '#fff';
  g.fillStyle = '#fff';
  g.lineCap = 'round';
  g.lineJoin = 'round';

  const MARGIN = 0.045;
  const left = -0.5 + MARGIN;
  const right = 0.5 - MARGIN;

  // 希臘文：隨機大寫字母，一行一行
  const GREEK = 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ';
  const greekTop = -0.12;
  g.font = `600 ${Math.round(0.0125 * u)}px Georgia, serif`;
  g.textBaseline = 'middle';
  for (let y = greekTop - 0.012; y > bottom + 0.03; y -= 0.0165) {
    let line = '';
    while (g.measureText(line).width < (right - left) * u) {
      line += GREEK[Math.floor(rand() * GREEK.length)];
    }
    g.fillText(line, px(left), py(y), (right - left) * u);
  }

  // 世俗體：草寫曲線
  const demoticTop = 0.28;
  g.lineWidth = 0.0024 * u;
  for (let y = demoticTop - 0.014; y > greekTop + 0.008; y -= 0.0205) {
    let x = left;
    while (x < right - 0.02) {
      const w = 0.008 + rand() * 0.02;
      const h = 0.006 + rand() * 0.006;
      g.beginPath();
      g.moveTo(px(x), py(y + (rand() - 0.5) * h));
      g.bezierCurveTo(
        px(x + w * 0.3), py(y + h),
        px(x + w * 0.7), py(y - h),
        px(x + w), py(y + (rand() - 0.5) * h)
      );
      if (rand() < 0.35) {
        g.moveTo(px(x + w * 0.5), py(y + h * 1.1));
        g.lineTo(px(x + w * 0.55), py(y - h * 1.1));
      }
      g.stroke();
      x += w + 0.004 + rand() * 0.006;
    }
  }

  // 象形文字：從一組簡化的符號隨機排列
  const hieroTop = 0.885;
  const rowH = 0.036;
  for (let y = hieroTop - rowH / 2 - 0.004; y > demoticTop + rowH / 2 - 0.004; y -= rowH) {
    let x = left;
    while (x < right - 0.02) {
      const s = rowH * 0.78;
      const wide = rand() < 0.4;
      if (wide) {
        // 兩個扁的上下疊
        drawGlyph(g, Math.floor(rand() * GLYPHS.length), px(x + s / 2), py(y + s / 4), s * u, s * u * 0.45, rand);
        drawGlyph(g, Math.floor(rand() * GLYPHS.length), px(x + s / 2), py(y - s / 4), s * u, s * u * 0.45, rand);
        x += s + 0.006;
      } else {
        const sw = s * (0.45 + rand() * 0.4);
        drawGlyph(g, Math.floor(rand() * GLYPHS.length), px(x + sw / 2), py(y), sw * u, s * u, rand);
        x += sw + 0.006;
      }
    }
  }

  // 分隔線 + 裝飾帶（ankh / was 權杖 / djed 柱交替）
  g.lineWidth = 0.004 * u;
  for (const y of [hieroTop + 0.004, archBase - 0.006]) {
    g.beginPath();
    g.moveTo(px(left), py(y));
    g.lineTo(px(right), py(y));
    g.stroke();
  }
  {
    const y = (hieroTop + archBase) / 2;
    const s = (archBase - hieroTop) * 0.72;
    const n = 15;
    for (let i = 0; i < n; i++) {
      const x = left + ((i + 0.5) / n) * (right - left);
      drawGlyph(g, [IDX.ankh, IDX.was, IDX.djed][i % 3], px(x), py(y), s * u * 0.55, s * u, rand);
    }
  }

  // 圓頂：內框 + 有翼日輪 + 兩條聖蛇
  {
    const archH = top - archBase;
    g.lineWidth = 0.004 * u;
    g.beginPath();
    g.ellipse(px(0), py(archBase), (0.5 - MARGIN) * u, (archH - MARGIN * 0.8) / height * H, 0, Math.PI, 2 * Math.PI);
    g.stroke();

    const cx = px(0);
    const cy = py(archBase + archH * 0.42);
    drawWingedDisc(g, cx, cy, 0.4 * u, 0.06 * u);
  }

  // ---- 合成三張貼圖 ----
  const map = document.createElement('canvas');
  map.width = W;
  map.height = H;
  const m = map.getContext('2d');
  m.fillStyle = '#cdb88f';
  m.fillRect(0, 0, W, H);
  // 石膏的細小斑點
  for (let i = 0; i < 26000; i++) {
    const v = rand();
    m.fillStyle = v < 0.5 ? 'rgba(90,70,40,0.10)' : 'rgba(255,250,235,0.12)';
    m.fillRect(rand() * W, rand() * H, 1 + rand() * 2, 1 + rand() * 2);
  }
  m.globalAlpha = 0.85;
  m.drawImage(tint(mask, '#5b4a33'), 0, 0);
  m.globalAlpha = 1;

  const emissive = document.createElement('canvas');
  emissive.width = W;
  emissive.height = H;
  const e = emissive.getContext('2d');
  e.fillStyle = '#000';
  e.fillRect(0, 0, W, H);
  e.drawImage(mask, 0, 0);

  const bump = document.createElement('canvas');
  bump.width = W;
  bump.height = H;
  const b = bump.getContext('2d');
  b.fillStyle = '#fff';
  b.fillRect(0, 0, W, H);
  b.filter = 'blur(1px)';
  b.drawImage(tint(mask, '#000'), 0, 0);

  const toTexture = (canvas, srgb) => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 8;
    return t;
  };
  return {
    map: toTexture(map, true),
    emissiveMap: toTexture(emissive, true),
    bumpMap: toTexture(bump, false),
  };
}

function tint(mask, color) {
  const c = document.createElement('canvas');
  c.width = mask.width;
  c.height = mask.height;
  const x = c.getContext('2d');
  x.drawImage(mask, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

// ---- 簡化象形符號，畫在以 (cx, cy) 為中心、w × h 的格子裡 ----
const GLYPHS = [
  // 直線
  (g, w, h) => { line(g, 0, -h / 2, 0, h / 2); },
  // 橫條
  (g, w, h) => { g.fillRect(-w / 2, -h * 0.12, w, h * 0.24); },
  // 太陽（圓 + 點）
  (g, w, h) => { const r = Math.min(w, h) * 0.4; circle(g, 0, 0, r); dot(g, 0, 0, r * 0.25); },
  // 麵包（半圓）
  (g, w, h) => { g.beginPath(); g.arc(0, h * 0.3, Math.min(w / 2, h * 0.6), Math.PI, 0); g.closePath(); g.stroke(); },
  // 水（鋸齒）
  (g, w, h) => {
    g.beginPath();
    const n = 6;
    for (let i = 0; i <= n; i++) {
      const x = -w / 2 + (i / n) * w;
      const y = (i % 2 ? -1 : 1) * h * 0.18;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
  },
  // ankh
  (g, w, h) => {
    g.beginPath(); g.ellipse(0, -h * 0.28, w * 0.22, h * 0.2, 0, 0, Math.PI * 2); g.stroke();
    line(g, 0, -h * 0.08, 0, h / 2);
    line(g, -w * 0.4, -h * 0.02, w * 0.4, -h * 0.02);
  },
  // 房屋（ㄇ字）
  (g, w, h) => { g.beginPath(); g.moveTo(-w * 0.4, h * 0.35); g.lineTo(-w * 0.4, -h * 0.3); g.lineTo(w * 0.4, -h * 0.3); g.lineTo(w * 0.4, h * 0.35); g.stroke(); },
  // 眼睛
  (g, w, h) => { g.beginPath(); g.ellipse(0, 0, w * 0.45, h * 0.2, 0, 0, Math.PI * 2); g.stroke(); dot(g, 0, 0, h * 0.1); line(g, -w * 0.1, h * 0.2, -w * 0.25, h * 0.42); },
  // 鳥
  (g, w, h) => {
    g.beginPath(); g.ellipse(0, 0, w * 0.32, h * 0.2, -0.3, 0, Math.PI * 2); g.stroke();
    circle(g, w * 0.28, -h * 0.28, Math.min(w, h) * 0.1);
    line(g, 0, h * 0.18, -w * 0.05, h / 2); line(g, w * 0.1, h * 0.16, w * 0.12, h / 2);
    line(g, -w * 0.3, h * 0.05, -w / 2, h * 0.2);
  },
  // 蘆葦葉
  (g, w, h) => { g.beginPath(); g.moveTo(0, h / 2); g.quadraticCurveTo(w * 0.4, 0, 0, -h / 2); g.quadraticCurveTo(-w * 0.15, 0, 0, h / 2); g.stroke(); },
  // 蛇
  (g, w, h) => { g.beginPath(); g.moveTo(-w / 2, h * 0.25); g.bezierCurveTo(-w * 0.1, -h * 0.4, w * 0.1, h * 0.4, w / 2, -h * 0.25); g.stroke(); },
  // 兩條短直線
  (g, w, h) => { line(g, -w * 0.18, -h * 0.3, -w * 0.18, h * 0.3); line(g, w * 0.18, -h * 0.3, w * 0.18, h * 0.3); },
  // was 權杖
  (g, w, h) => {
    line(g, 0, -h * 0.38, 0, h / 2);
    g.beginPath(); g.moveTo(0, -h * 0.38); g.lineTo(w * 0.35, -h / 2); g.lineTo(w * 0.3, -h * 0.32); g.stroke();
    line(g, 0, h / 2, -w * 0.2, h * 0.4);
  },
  // djed 柱
  (g, w, h) => {
    line(g, 0, -h * 0.15, 0, h / 2);
    for (let i = 0; i < 4; i++) line(g, -w * 0.4, -h * 0.42 + i * h * 0.08, w * 0.4, -h * 0.42 + i * h * 0.08);
    line(g, -w * 0.25, h / 2, w * 0.25, h / 2);
  },
];
const IDX = { ankh: 5, was: 12, djed: 13 };

function drawGlyph(g, index, cx, cy, w, h) {
  g.save();
  g.translate(cx, cy);
  g.lineWidth = Math.max(1.4, Math.min(w, h) * 0.11);
  GLYPHS[index](g, w, h);
  g.restore();
}

function drawWingedDisc(g, cx, cy, span, r) {
  g.save();
  g.translate(cx, cy);
  g.lineWidth = r * 0.14;
  // 日輪
  circle(g, 0, 0, r);
  circle(g, 0, 0, r * 0.7);
  // 兩側翅膀：幾層由內往外、末端微微上翹的羽毛帶
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const y0 = -r * 0.5 + k * r * 0.42;
      const tipX = side * (span - k * span * 0.12);
      const tipY = -r * 0.9 + k * r * 0.25;
      g.beginPath();
      g.moveTo(side * r * 1.05, y0);
      g.quadraticCurveTo(side * span * 0.55, y0 + r * 0.35, tipX, tipY);
      g.stroke();
      // 羽毛紋
      if (k < 3) {
        const n = 10 - k * 2;
        for (let i = 1; i < n; i++) {
          const t = i / n;
          const x = side * (r * 1.05 + (span * (0.9 - k * 0.12) - r) * t);
          const y = y0 + r * 0.25 * Math.sin(t * Math.PI) - r * 0.4 * t;
          line(g, x, y, x, y + r * 0.35);
        }
      }
    }
    // 聖蛇（uraeus）垂在日輪兩側
    g.beginPath();
    g.moveTo(side * r * 0.75, r * 0.7);
    g.bezierCurveTo(side * r * 1.1, r * 1.3, side * r * 0.6, r * 1.6, side * r * 0.95, r * 2.1);
    g.stroke();
    g.beginPath();
    g.ellipse(side * r * 0.95, r * 0.85, r * 0.16, r * 0.3, 0, 0, Math.PI * 2);
    g.stroke();
  }
  g.restore();
}

function line(g, x1, y1, x2, y2) {
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.stroke();
}
function circle(g, x, y, r) {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.stroke();
}
function dot(g, x, y, r) {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}
