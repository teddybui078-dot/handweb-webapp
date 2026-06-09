# handweb

A browser experiment where a glowing **particle web-sphere** floats over your webcam feed and you control it with your **hands**.

![constellation web-sphere over a camera feed](#)

## What it does

- Hold up **both hands** in front of the camera — a violet constellation/web sphere appears between them.
- **Spread your hands apart** → the orb grows. **Bring them together** → it shrinks to its smallest.
- **Flick a hand open** (snap from a thumb-and-index pinch into a full spread palm) → the particles **erupt** outward, drift, then **auto-reform** back into the sphere so you can play again.

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

| Gesture | Effect |
| --- | --- |
| Two hands, spread apart | Grow the sphere |
| Two hands, close together | Shrink the sphere |
| Flick one hand open (pinch → spread palm) | Erupt the particles |

## Project layout

```
src/
  main.js     entry — wires camera → hands → sphere and runs the render loop
  camera.js   webcam capture + mirrored background + permission handling
  hands.js    MediaPipe HandLandmarker wrapper + gesture math
  sphere.js   Three.js scene: particle points + web/constellation lines
  physics.js  burst / reform state machine
  config.js   all tunables (particle count, colors, radius range, gesture thresholds)
```

## Credits

Built with [Claude Code](https://claude.com/claude-code).
