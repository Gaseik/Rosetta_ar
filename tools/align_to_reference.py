"""把一張石碑正面照片自動透視校正成 MindAR target。

和已經對齊好的參考圖（同樣是實物照片、同樣 1078 x 1600 座標）做 SIFT 特徵比對，
算出 homography，把照片拉正，石碑以外的地方塗白。

用法：
  python3 tools/align_to_reference.py <照片> <輸出.png> <參考圖1> [參考圖2 ...]
  （需要 opencv-python-headless、numpy）

輸出的檢查數值：
  inliers：配對成功的特徵點數，幾百個以上才算可靠
  divider：世俗體 / 希臘文分界線的 y 座標（左 / 中 / 右），粗略檢查用，目前約 937

註：試過在 SIFT 之後再用 ECC 細修，實測反而變差（中位誤差 2 px → 4～10 px），所以沒用。
"""
import sys

import cv2
import numpy as np

W, H = 1078, 1600


def gray(img):
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8)).apply(g)


def silhouette(ref):
    """參考圖中非白色的區域 = 石碑輪廓。"""
    g = cv2.cvtColor(ref, cv2.COLOR_BGR2GRAY)
    sil = cv2.morphologyEx((g < 240).astype(np.uint8), cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
    cnts, _ = cv2.findContours(sil, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    mask = np.zeros_like(g)
    cv2.drawContours(mask, [max(cnts, key=cv2.contourArea)], -1, 255, -1)
    return cv2.erode(mask, np.ones((5, 5), np.uint8))


def divider_rows(img):
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
    rows = []
    for x0, x1 in [(150, 400), (450, 700), (700, 950)]:
        prof = cv2.GaussianBlur(g[:, x0:x1].mean(axis=1).reshape(-1, 1), (1, 0), 4).ravel()
        rows.append(max(range(800, 1100),
                        key=lambda y: (prof[y - 40:y - 10].mean() + prof[y + 10:y + 40].mean()) / 2 - prof[y]))
    return rows


def main():
    photo_path, out_path, *ref_paths = sys.argv[1:]
    photo = cv2.imread(photo_path)
    # 照片太大時先縮小，SIFT 會快很多
    scale = min(1.0, 2000 / max(photo.shape[:2]))
    small = cv2.resize(photo, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)

    sift = cv2.SIFT_create(nfeatures=30000)
    kp1, d1 = sift.detectAndCompute(gray(small), None)

    best = None
    for ref_path in ref_paths:
        ref = cv2.imread(ref_path)
        kp2, d2 = sift.detectAndCompute(gray(ref), None)
        matches = cv2.BFMatcher().knnMatch(d1, d2, k=2)
        good = [a for a, b in matches if a.distance < 0.75 * b.distance]
        if len(good) < 8:
            print(ref_path, "matches", len(good))
            continue
        src = np.float32([kp1[m.queryIdx].pt for m in good]).reshape(-1, 1, 2) / scale
        dst = np.float32([kp2[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
        Hm, mask = cv2.findHomography(src, dst, cv2.USAC_MAGSAC, 6.0, maxIters=20000, confidence=0.9999)
        inliers = int(mask.sum()) if mask is not None else 0
        print(ref_path, "matches", len(good), "inliers", inliers)
        if Hm is not None and (best is None or inliers > best[1]):
            best = (Hm, inliers, ref)

    if best is None:
        sys.exit("沒有任何參考圖配對成功")
    Hm, inliers, ref = best

    warped = cv2.warpPerspective(photo, Hm, (W, H), flags=cv2.INTER_AREA)
    inside = cv2.warpPerspective(np.full(photo.shape[:2], 255, np.uint8), Hm, (W, H))
    keep = (silhouette(ref) > 0) & (inside > 0)
    out = np.full_like(warped, 255)
    out[keep] = warped[keep]
    cv2.imwrite(out_path, out)
    print("best inliers", inliers, "divider", divider_rows(out), "->", out_path)


if __name__ == "__main__":
    main()
