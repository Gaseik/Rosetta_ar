# Rosetta AR

Point your phone at the Rosetta Stone (a photo of it, or the real stone in the British Museum) and AR grows the missing parts back. The restored pieces rise from the fracture line up to the stele's estimated original height (about 149 cm), with a reconstructed inscription and a winged sun disc in the rounded top.

## Try it

1. On your phone, open **https://gaseik.github.io/Rosetta_ar/** and allow camera access.
2. On a computer screen, open this image full screen (turn the brightness up):
   **https://gaseik.github.io/Rosetta_ar/stele-target.png**
3. Point your phone at the stone on the screen. The missing parts grow back from the fracture.

Without a camera: **https://gaseik.github.io/Rosetta_ar/?debug=1** (drag to rotate).

You can also try it on the real stone at the British Museum. Seven of the targets are museum photos, but lighting and glass reflections vary from day to day, so detection isn't guaranteed.

## Tech

- Vite + plain JavaScript
- [three.js](https://threejs.org/) 0.161.0 + [MindAR](https://github.com/hiukim/mind-ar-js) 1.2.5 (image tracking)

## Running locally

Requires Node.js 18 or later.

```bash
npm install
npm run dev
```

Open `https://localhost:5173/`. The dev server uses a self-signed certificate, because mobile browsers only allow camera access over https. Click through the browser warning.

```bash
npm run build     # outputs to dist/
npm run preview   # serves the build
```

### Debug mode (no camera)

Open `https://localhost:5173/?debug=1`. This is a plain three.js scene: the scan model is grey and the restored pieces are beige. Drag to rotate and scroll to zoom to check that the pieces line up with the fracture. The **Show damage / Restore** button works here too.

## Testing on a phone

1. Put the computer and phone on the same Wi-Fi.
2. Start the dev server with `--host` so it is reachable on the local network:

   ```bash
   npm run dev -- --host
   ```

3. On the phone, open the `Network:` URL the terminal prints, e.g. `https://192.168.x.x:5173/`.
4. Accept the certificate warning and allow camera access.
5. Point the phone at any of these:
   - `public/stele-target.png` shown full screen on a computer (brightness up)
   - a photo of the Rosetta Stone in the museum
   - the real stone in the British Museum

Once the target is detected, the pieces grow up from the fracture line. **Show damage** retracts them and **Restore** grows them again.

**Tips for better detection:** start from a roughly frontal angle and move to the side once it locks on; avoid glare from the display case; let the stone fill most of the frame.

## Project structure

```
index.html            full-screen AR container, scan overlay, toggle button, credit line
src/
  main.js             starts MindAR; one anchor per target, each gets the occluder and pieces
  occluder.js         scan model as an invisible depth-only occluder (renderOrder 0)
  missing.js          restored geometry: fracture outline extended up to the arch (renderOrder 1)
  inscription.js      canvas-drawn texture with the reconstructed inscription
  reveal.js           restore animation (bottom-up sweep, gold edge, glowing glyphs)
  scan-ui.js          custom scanning overlay (replaces MindAR's built-in UI)
  scene.js            lights and piece setup shared by AR and debug
  debug.js            the ?debug=1 inspection scene
  test-detect.js      dev-only detection test (see below)
public/
  stele.mind          MindAR targets (compiled from 8 images, see below)
  stele-scan.glb      scan model (front width = 1, origin at front centre, front faces +Z)
  stele-target*.png   target source images
tools/                Python scripts for producing targets
stubs/canvas/         empty node-canvas stub (see Notes)
.github/workflows/    GitHub Pages deployment
```

## Targets and stele.mind

`stele.mind` is compiled with the [MindAR online compiler](https://hiukim.github.io/mind-ar-js-doc/tools/compile) from these 8 images, in this order. The order is the target index and must match `TARGETS` in `src/main.js`.

| # | File | Content |
|---|---|---|
| 0 | `stele-target.png` | Render of the scan model (for demos with an image) |
| 1 | `stele-target-front.png` | Museum photo: front |
| 2 | `stele-target-left.png` | Museum photo: front left |
| 3 | `stele-target-right.png` | Museum photo: front right |
| 4 | `stele-target-cool.png` | Museum photo: 2024 display case, cool light |
| 5 | `stele-target-left2.png` | Museum photo: front left, with glare |
| 6 | `stele-target-glass.png` | Museum photo: through the glass, many reflections |
| 7 | `stele-target-warm.png` | Museum photo: warm light, high contrast (alignment error ~1%, less certain) |

Every image is 1078 × 1600, with the stone filling the frame in the same coordinates as the scan model. Each anchor therefore uses the same model with no per-target offset. The museum photos are perspective-corrected to a frontal view, with everything outside the stone painted white.

The photos cover a range of lighting, angles and reflections so that unseen conditions, such as the lighting on the day you visit, have a better chance of being recognised. More targets make detection slower, so keep it to about 8.

### Adding a museum photo

```bash
python3 -m venv .venv && .venv/bin/pip install opencv-python-headless numpy
.venv/bin/python tools/align_to_reference.py photo.jpg public/stele-target-new.png \
  public/stele-target-front.png public/stele-target-left.png public/stele-target-right.png \
  public/stele-target-cool.png public/stele-target-glass.png
```

The script matches features against the already-aligned museum photos and rectifies the new photo automatically. The `inliers` it prints should be in the hundreds or more to be reliable. Then add the new image to `TARGETS` in `src/main.js` and recompile `stele.mind` with all images in order.

`tools/rectify.py` is for bootstrapping the first alignment from four hand-picked corner points. You only need it when a real photo and the render look too different for automatic matching.

### Detection test page (dev only)

With `npm run dev` running, open `https://localhost:5173/test.html` on a computer. It places each image into a simulated phone frame at three sizes, runs MindAR detection and matching, and lists which targets it hits. Put test photos in `test-images/` (not committed; bring your own).

## Credits and licences

| Asset | Source | Licence |
|---|---|---|
| `stele-scan.glb`, `stele-target.png` (scan model and its render) | "The Rosetta Stone" by The British Museum ([Sketchfab](https://sketchfab.com/3d-models/1e03509704a3490e99a173e53b93e282)) | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) |
| `stele-target-front.png` | [Rosetta Stone.JPG](https://commons.wikimedia.org/wiki/File:Rosetta_Stone.JPG) by Hans Hillewaert, Wikimedia Commons; perspective-corrected and cropped | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `stele-target-left.png` | [June 2008 Rosetta stone.jpg](https://commons.wikimedia.org/wiki/File:June_2008_Rosetta_stone.jpg) by Syced, Wikimedia Commons; perspective-corrected and cropped | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `stele-target-right.png` | [Pierre de Rosette - British Museum 02.jpg](https://commons.wikimedia.org/wiki/File:Pierre_de_Rosette_-_British_Museum_02.jpg) by Giogo, Wikimedia Commons; perspective-corrected and cropped | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `stele-target-cool.png` | [British Museum 2024-10-03l.jpg](https://commons.wikimedia.org/wiki/File:British_Museum_2024-10-03l.jpg) by Djehouty, Wikimedia Commons; perspective-corrected and cropped | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `stele-target-left2.png` | [PXL 20231219 110740689 British Museum Egyptian Artefacts 20 Rosetta Stone.jpg](https://commons.wikimedia.org/wiki/File:PXL_20231219_110740689_British_Museum_Egyptian_Artefacts_20_Rosetta_Stone.jpg) by Sourabh.biswas003, Wikimedia Commons; perspective-corrected and cropped | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `stele-target-glass.png` | [Collections of the British Museum 10.jpg](https://commons.wikimedia.org/wiki/File:Collections_of_the_British_Museum_10.jpg) by Interfase, Wikimedia Commons; perspective-corrected and cropped | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `stele-target-warm.png` | [Rosetta Stone hanging.jpg](https://commons.wikimedia.org/wiki/File:Rosetta_Stone_hanging.jpg) by DestinationFearFan, Wikimedia Commons; perspective-corrected and cropped | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `stele.mind` | Compiled from the 8 images above; contains downscaled greyscale copies | Inherits the licences of its source images |

- The perspective-corrected CC BY-SA photos are released under CC BY-SA 4.0, as their licence requires.
- The scan model is licensed **non-commercial (NC)**, so this project cannot be used commercially.
- The shape and inscription of the restored pieces are conjectural. The layout follows Parkinson's (1999) reconstruction of the complete stele (rounded top with a winged sun disc, then hieroglyphic, Demotic and Greek sections). The glyphs are randomly generated placeholders, not real text.

## Notes

- **three is pinned to 0.161.0.** mind-ar 1.2.5 imports `sRGBEncoding` from three, and that export was removed in r162.
- **`stubs/canvas`:** mind-ar depends on node-canvas, but only its Node-side target compiler uses it, and it often fails to build on recent Node versions. `overrides` in `package.json` replaces it with an empty stub. The browser build is unaffected.
