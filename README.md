# handweb

A browser experiment where glowing **white light** tracks your **hands** over the webcam feed — no controller, no mouse, just gestures in front of the camera. A minimal, black-and-white **dashboard** lets you pick between three experiences.

## What it does

Open the app and pick a mode. If the camera can't see the hands a mode needs, a **"No hands detected"** badge appears and the visualization fades out.

**Orb** — a constellation web-sphere floats between your hands (needs both hands).
- **Spread your hands apart** → the orb grows. **Bring them together** → it shrinks.
- **Flick a hand open** (snap from a thumb-and-index pinch into a full spread palm) → the particles **erupt** outward, drift, then **auto-reform** back into the sphere.

**Web** — a living net is strung between your two hands (needs both hands).
- The web grips each hand (fingertip → wrist) and **stretches, tilts, and shrinks** as you move your hands apart and together, with a slack center sag and a living shimmer.

**Draw** — sketch in the air with one hand.
- **Pinch** your thumb and index together to put the "pen" down and draw; **release** to lift it. A ring cursor shows where the pen is. Tap **Clear** to wipe the canvas.

A **Back** button returns to the dashboard at any time. The whole interface is a clean, Apple-style black-and-white: white UI, near-black text, white light over the feed, black ink in Draw.

Built with **Three.js** (rendering) and **MediaPipe Tasks Vision** (`HandLandmarker`) for real-time two-hand tracking, bundled with **Vite**. No backend, no data leaves your machine — the camera stream is processed entirely in the browser.

## Run it locally

```bash
npm install
npm run dev
```

Open the printed `http://localhost:5173`, click **Enable camera**, and allow camera access. A webcam is required. Use a Chromium-based browser for best MediaPipe performance.

```bash
npm run build    # production build into dist/
npm run preview  # preview the production build
```

## Gesture guide

| Mode | Gesture | Effect |
| --- | --- | --- |
| Orb | Two hands, spread apart / together | Grow / shrink the sphere |
| Orb | Flick one hand open (pinch → spread palm) | Erupt the particles |
| Web | Move both hands apart / together | Stretch / gather the net |
| Draw | Pinch (thumb + index) and move | Draw black ink; release to lift the pen |
| Draw | Tap **Clear** | Wipe the canvas |
| Any | Required hand(s) not visible | "No hands detected" — viz fades out |

Press **`d`** in any mode to toggle a debug overlay of the tracked landmarks.

## Project layout

```
src/
  main.js     app controller — dashboard, mode routing, the render loop
  camera.js   webcam capture + mirrored background + permission handling
  hands.js    MediaPipe HandLandmarker wrapper + gesture math
  sphere.js   Orb mode — Three.js particle points + web/constellation lines
  webnet.js   Web mode — a living net strung between the two hands
  draw.js     Draw mode — pinch-to-draw finger drawing on a 2D canvas
  physics.js  Orb burst / reform state machine
  config.js   all tunables (particle count, colors, radius range, gesture / net / draw params)
```

## Credits

Built with [Claude Code](https://claude.com/claude-code).
