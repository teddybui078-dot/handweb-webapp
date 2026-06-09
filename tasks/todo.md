# handweb — build tasks

Each feature ships as its own git commit.

- [x] 1. Scaffold — Vite, package.json, index.html, .gitignore, README, config, folders
- [x] 2. Camera feed — getUserMedia, mirrored background, permission UI
- [x] 3. Hand tracking — MediaPipe HandLandmarker (2 hands)
- [x] 4. Particle web-sphere — Three.js points + KNN web lines
- [x] 5. Hand-distance scaling — distance → radius + position
- [x] 6. Flick explosion — gesture detection + burst physics
- [x] 7. Auto-reform — spring back into the sphere
- [x] 8. Polish — colors, hints, README, gesture skill

## Review

All eight features shipped as separate commits, each pushed and Claude-co-authored.

- **Stack:** Vite + vanilla JS, Three.js for the web-sphere, MediaPipe Tasks-Vision
  HandLandmarker for two-hand tracking. No backend; the camera stream never leaves
  the browser.
- **Verified in-browser** (Chrome DevTools): the violet constellation web-sphere
  renders cleanly; a triggered burst erupts the particles; the state machine cycles
  burst → reform → idle (~3.1s) back into a crisp orb.
- **Camera/gesture interaction** requires a physical webcam and is verified manually
  (headless browsers have no hands to track).
- **Tunables** centralized in `src/config.js`; gesture math captured as a reusable
  skill in `.claude/skills/mediapipe-hand-gestures/`.

### Possible follow-ups
- Color/intensity controls in a small UI panel (the "Customizable" option).
- Per-hand independent orbs; trail/afterimage on burst; sound on eruption.
