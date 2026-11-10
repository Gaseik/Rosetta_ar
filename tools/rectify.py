"""第一張實物照片的對齊：人工四點初估 → ECC 在梯度圖上微調 → 校正成 target 座標。

實物照片和 stele-target.png（掃描模型渲染圖）外觀差太多，特徵比對配不起來，
所以第一張要靠人工標四個角點。之後的照片改用 align_to_reference.py
和已經對齊好的實物照片自動比對，比這個準很多。

用法：
  python3 tools/rectify.py <照片> public/stele-target.png <輸出資料夾> \
    '{"photo": [[x,y] x4], "target": [[x,y] x4]}'
  四個點依序：左緣頂端（斷口起點）、左下角、右下角、右上角。
"""
import sys, json, cv2, numpy as np
photo_path, target_path, out_dir, pts_json = sys.argv[1:5]
pts = json.loads(pts_json)
photo = cv2.imread(photo_path); target = cv2.imread(target_path)
h, w = target.shape[:2]
src = np.float32(pts["photo"]); dst = np.float32(pts["target"])
H0 = cv2.getPerspectiveTransform(src, dst)

# target 的石碑輪廓：非白色區域，先做 closing 把白色雜點補起來，取最大的外輪廓
_g = cv2.cvtColor(target, cv2.COLOR_BGR2GRAY)
_sil = cv2.morphologyEx((_g < 240).astype(np.uint8), cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
_cnts, _ = cv2.findContours(_sil, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
OUTLINE = max(_cnts, key=cv2.contourArea)
SIL = np.zeros_like(_g); cv2.drawContours(SIL, [OUTLINE], -1, 255, -1)
cv2.imwrite(f"{out_dir}/silhouette.png", SIL)

def grad(img, s):
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
    g = cv2.resize(g, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
    g = cv2.GaussianBlur(g, (0, 0), 2.0)
    gx = cv2.Sobel(g, cv2.CV_32F, 1, 0); gy = cv2.Sobel(g, cv2.CV_32F, 0, 1)
    m = cv2.magnitude(gx, gy)
    return cv2.normalize(m, None, 0, 1, cv2.NORM_MINMAX)

def blend(H, name):
    warped = cv2.warpPerspective(photo, H, (w, h))
    edges_t = cv2.Canny(cv2.cvtColor(target, cv2.COLOR_BGR2GRAY), 60, 160)
    vis = cv2.addWeighted(warped, 0.6, target, 0.4, 0)
    cv2.drawContours(vis, [OUTLINE], -1, (0, 0, 255), 3)
    cv2.imwrite(f"{out_dir}/{name}.jpg", cv2.resize(vis, None, fx=0.5, fy=0.5))
    return warped

blend(H0, "blend0")
res = {"H0": H0.tolist()}
try:
    st = 0.35
    # 照片的縮放：讓照片裡的石碑和縮小後的 target 差不多大
    stone_w_photo = np.linalg.norm(src[2] - src[1])
    stone_w_target = np.linalg.norm(dst[2] - dst[1])
    si = st * stone_w_target / stone_w_photo
    St = np.diag([st, st, 1.0]); Si = np.diag([si, si, 1.0])
    Hs = St @ H0 @ np.linalg.inv(Si)
    tmpl = grad(target, st)
    inp = grad(photo, si)
    # ECC 的 warp 是 template→input，所以用 H 的反矩陣
    warp = np.linalg.inv(Hs).astype(np.float32)
    cc, warp = cv2.findTransformECC(tmpl, inp, warp, cv2.MOTION_HOMOGRAPHY,
                                     (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 300, 1e-6), None, 5)
    H1 = np.linalg.inv(St) @ np.linalg.inv(warp.astype(np.float64)) @ Si
    H1 /= H1[2, 2]
    print("ECC cc", cc)
    res["H1"] = H1.tolist(); res["cc"] = cc
    warped = blend(H1, "blend1")
    cv2.imwrite(f"{out_dir}/warped1.png", warped)
except cv2.error as e:
    print("ECC failed", e)
json.dump(res, open(f"{out_dir}/H.json", "w"), indent=1)
