# Rosetta AR

手機對準羅塞塔石碑（照片或大英博物館的實物），用 AR 把石碑缺掉的部分補回來：補件會從斷口往上長出來，一路補到推測的完整高度（約 149 cm），上面刻著推測的銘文和圓頂的有翼日輪。

- Vite + 純 JavaScript
- [three.js](https://threejs.org/) 0.161.0 + [MindAR](https://github.com/hiukim/mind-ar-js) 1.2.5（image tracking）

## 怎麼跑

需要 Node.js 18 以上。

```bash
npm install
npm run dev
```

開 `https://localhost:5173/`。dev server 用的是自簽憑證（手機瀏覽器只有在 https 下才允許開相機），瀏覽器跳出警告時選「繼續前往」。

```bash
npm run build     # 輸出到 dist/
npm run preview   # 預覽 build 結果
```

### Debug 模式（不開相機）

開 `https://localhost:5173/?debug=1`：一般的 three.js 場景，灰色的是掃描模型，米色的是補件。滑鼠可以拖曳旋轉、滾輪縮放，用來檢查補件和斷口有沒有對齊。底部按鈕一樣可以切換 **Show damage / Restore**。

## 怎麼用手機測

1. 電腦和手機連同一個 Wi-Fi。
2. 用 `--host` 啟動，讓區網連得到：

   ```bash
   npm run dev -- --host
   ```

3. 手機開終端機印出來的 `Network:` 網址，例如 `https://192.168.x.x:5173/`。
4. 憑證警告選「繼續」，允許相機權限。
5. 對準下面任何一種：
   - 電腦螢幕上全螢幕打開的 `public/stele-target.png`（螢幕亮度調高）
   - 羅塞塔石碑的現場照片
   - 大英博物館裡的實物

偵測到之後，補件會從斷裂線往上長出來。按 **Show damage** 收回去，按 **Restore** 再長一次。

**提高辨識率的小技巧：** 先從接近正面的角度偵測，抓到之後再慢慢移到側邊；盡量避開玻璃櫃的反光；讓石碑佔滿大半個畫面。

## 專案結構

```
index.html            全螢幕 AR 容器、掃描提示、切換按鈕、來源標註
src/
  main.js             啟動 MindAR，每個 target 一個 anchor，掛上遮擋物和補件
  occluder.js         掃描模型 → 只寫深度的隱形遮擋物（renderOrder 0）
  missing.js          補件幾何：斷口輪廓 + 往上補到圓頂（renderOrder 1）
  inscription.js      用 canvas 畫補件正面的推測銘文貼圖
  reveal.js           復原動畫（由下往上長、金色前緣、刻字金光）
  scan-ui.js          自製的掃描提示（取代 MindAR 內建 UI）
  scene.js            AR 和 debug 共用的燈光與補件設定
  debug.js            ?debug=1 的檢查場景
public/
  stele.mind          MindAR target（4 張圖編譯而成，見下方）
  stele-scan.glb      石碑掃描模型（正面寬 = 1、原點在正面中心、正面朝 +Z）
  stele-target*.png   target 原圖
tools/                產生 target 用的 Python 腳本
stubs/canvas/         空的 node-canvas（見「備註」）
```

## Target 與 stele.mind

`stele.mind` 是用 [MindAR 線上 compiler](https://hiukim.github.io/mind-ar-js-doc/tools/compile) 依序編譯這 4 張圖（順序 = target index，和 `src/main.js` 的 `TARGETS` 一致）：

| # | 檔案 | 內容 |
|---|---|---|
| 0 | `stele-target.png` | 掃描模型的渲染圖（對著圖片 demo 用） |
| 1 | `stele-target-front.png` | 博物館現場照片：正面 |
| 2 | `stele-target-left.png` | 博物館現場照片：左前方 |
| 3 | `stele-target-right.png` | 博物館現場照片：右前方 |

4 張圖都是 1078 × 1600，石碑剛好填滿畫面，座標和掃描模型一致，所以每個 anchor 都直接套用同一組模型，不用另外對位。現場照片是透視校正過的正面圖，石碑以外的地方塗白。

### 新增一張現場照片

```bash
python3 -m venv .venv && .venv/bin/pip install opencv-python-headless numpy
.venv/bin/python tools/align_to_reference.py 照片.jpg public/stele-target-新.png \
  public/stele-target-front.png public/stele-target-left.png public/stele-target-right.png
```

腳本會和已經對齊好的現場照片做特徵比對，自動拉正。印出來的 `inliers` 要有幾百個以上才可靠。然後把新圖加進 `src/main.js` 的 `TARGETS`，再用 compiler 照順序重新編譯 `stele.mind`。

`tools/rectify.py` 是第一次對齊用的（人工標四個角點）。實物照片和渲染圖外觀差太多、自動比對配不起來時才需要它。

## 素材來源與授權

| 素材 | 來源 | 授權 |
|---|---|---|
| `stele-scan.glb`、`stele-target.png`（掃描模型與其渲染圖） | "The Rosetta Stone" by The British Museum（[Sketchfab](https://sketchfab.com/3d-models/1e03509704a3490e99a173e53b93e282)） | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) |
| `stele-target-front.png` | [Rosetta Stone.JPG](https://commons.wikimedia.org/wiki/File:Rosetta_Stone.JPG) by Hans Hillewaert，Wikimedia Commons；經透視校正、裁切 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `stele-target-left.png` | [June 2008 Rosetta stone.jpg](https://commons.wikimedia.org/wiki/File:June_2008_Rosetta_stone.jpg) by Syced，Wikimedia Commons；經透視校正、裁切 | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `stele-target-right.png` | [Pierre de Rosette - British Museum 02.jpg](https://commons.wikimedia.org/wiki/File:Pierre_de_Rosette_-_British_Museum_02.jpg) by Giogo，Wikimedia Commons；經透視校正、裁切 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `stele.mind` | 由上面 4 張圖編譯，內含縮小的灰階圖 | 沿用各來源圖的授權 |

- 校正後的 CC BY-SA 照片依原授權以 CC BY-SA 4.0 釋出。
- 掃描模型是 **非商業（NC）** 授權，這個專案不能用於商業用途。
- 補件的形狀和銘文是推測：版面參考 Parkinson (1999) 的完整石碑復原研究（上方圓頂、有翼日輪、象形文字 → 世俗體 → 希臘文），字形是程式隨機產生的示意，不是真正的文字。

## 備註

- **three 固定在 0.161.0：** mind-ar 1.2.5 會從 three 匯入 `sRGBEncoding`，three r162 之後拿掉了這個 export。
- **`stubs/canvas`：** mind-ar 的 dependency 裡有 node-canvas，但只有 Node 端的 target compiler 會用到它。它在新版 Node 上常常編譯失敗，所以用 `package.json` 的 `overrides` 換成空的 stub，瀏覽器端不受影響。
