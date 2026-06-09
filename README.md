# handweb

A browser experiment where glowing **emerald particles** track your **hands** over the webcam feed — no controller, no mouse, just gestures in front of the camera. A landing **dashboard** lets you pick between two experiences.

## What it does

Open the app, pick a mode, and hold up **both hands** to the camera. If fewer than two hands are visible, a **"No hands detected"** badge appears and the visualization fades out.

**🌐 Orb** — a constellation web-sphere floats between your hands.
- **Spread your hands apart** → the orb grows. **Bring them together** → it shrinks.
- **Flick a hand open** (snap from a thumb-and-index pinch into a full spread palm) → the particles **erupt** outward, drift, then **auto-reform** back into the sphere.

**🕸️ Web** — a living net is strung between your two hands.
- The web grips each hand (fingertip → wrist) and **stretches, tilts, and shrinks** as you move your hands apart and together, with a slack center sag and a living shimmer.

A **Back** button returns to the dashboard at any time.

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
| Either | Fewer than two hands | "No hands detected" — viz fades out |

Press **`d`** in either mode to toggle a debug overlay of the tracked landmarks.

## Project layout

```
src/
  main.js     app controller — dashboard, mode routing, the render loop
  camera.js   webcam capture + mirrored background + permission handling
  hands.js    MediaPipe HandLandmarker wrapper + gesture math
  sphere.js   Orb mode — Three.js particle points + web/constellation lines
  webnet.js   Web mode — a living net strung between the two hands
  physics.js  Orb burst / reform state machine
  config.js   all tunables (particle count, colors, radius range, gesture + net params)
```

## Credits

Built with [Claude Code](https://claude.com/claude-code).
