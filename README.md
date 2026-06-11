# handweb

A browser experiment where glowing **white light** tracks your **hands** over the webcam feed — no controller, no mouse, just gestures in front of the camera. A minimal, black-and-white **dashboard** lets you pick between two experiences.

## What it does

Open the app and pick a mode. If the camera can't see the hands a mode needs, a **"No hands detected"** badge appears and the visualization fades out.

**Orb** — a constellation web-sphere (works with one or two hands).
- **Move your index finger** → the orb spins the way you swipe, with inertia.
- **Move two hands apart / together** → shape the orb in any direction: horizontal separation sets its **width**, vertical separation sets its **height**, so you can make it round, wide, tall, or big — smoothly and precisely.
- **Pinch and snap your fingers open** (a deliberate, deep thumb-index pinch then a fast release) → the particles **erupt** outward, drift, then **auto-reform** back into the sphere. (A partial or accidental pinch won't trigger it.)

Hand tracking is smoothed (One-Euro filter) so the orb and web stay calm instead of twitching with every jitter.

**Web** — a 3D spider web is spun between your two hands (needs both hands).
- Your ten fingertips are the anchor points; **radial spokes** run from a central hub out to each (with extra interpolated spokes between them), and **concentric rings** weave between them. The web is alive — spokes **swirl** into spirals, rings **breathe** in and out, and a wave travels outward so it **undulates in 3D** — and it stretches and reshapes as you move your hands.

In **Orb** and **Web**, the detected hands are traced with a glowing white **wireframe skeleton** so you can see exactly what's being tracked.

A **Back** button returns to the dashboard at any time. The whole interface is a clean, Apple-style black-and-white: white UI, near-black text, white light over the feed.

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
| Orb | Move your index finger | Spin the orb (swipe, with inertia) |
| Orb | Two hands — horizontal / vertical separation | Shape its width / height (any direction) |
| Orb | Deliberate deep pinch & fast snap open | Erupt the particles |
| Web | Move both hands apart / together | Stretch / reshape the web |
| Any | Required hand(s) not visible | "No hands detected" — viz fades out |

Orb works with **one hand**; Web needs **both**.

Press **`d`** in any mode to toggle a debug overlay of the tracked landmarks.

## Project layout

```
src/
  main.js     app controller — dashboard, mode routing, the render loop
  camera.js   webcam capture + mirrored background + permission handling
  hands.js    MediaPipe HandLandmarker wrapper + gesture math
  sphere.js   Orb mode — Three.js particle points + web/constellation lines
  webnet.js   Web mode — an animated 3D spider web strung between the two hands
  physics.js  Orb burst / reform state machine
  config.js   all tunables (particle count, colors, radius range, gesture / web params)
```

## Credits

Built with [Claude Code](https://claude.com/claude-code).
