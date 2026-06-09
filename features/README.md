# Features

Each feature shipped as its own commit. Source modules live in [`../src`](../src).

| # | Feature | Module(s) | What it does |
|---|---------|-----------|--------------|
| 1 | Scaffold | `index.html`, `config.js` | Vite app shell, mirrored video + transparent canvas, central tunables |
| 2 | Camera feed | `camera.js` | getUserMedia, mirrored full-screen background, permission handling |
| 3 | Hand tracking | `hands.js` | MediaPipe HandLandmarker (2 hands) + depth-robust gesture math |
| 4 | Web-sphere | `sphere.js` | Fibonacci point shell + KNN constellation lines, additive glow |
| 5 | Hand scaling | `main.js` | Two-hand distance → radius, midpoint → position, smoothed |
| 6 | Flick burst | `hands.js`, `physics.js` | Pinch→open flick erupts the particles outward |
| 7 | Auto-reform | `physics.js` | Particles spring back into the web-sphere, web fades in |
| 8 | Polish | all | Idle breathing, gesture hints, docs, reusable gesture skill |
| 9 | Emerald recolor | `config.js`, `sphere.js`, `hands.js` | (superseded by #11) color pass |
| 10 | Web mode + dashboard | `webnet.js`, `main.js`, `index.html` | Dashboard with modes, a net strung between the hands, back button, "No hands detected" state |
| 11 | Monochrome Apple rebrand | `config.js`, `sphere.js`, `index.html` | Black-and-white minimal UI; white light over the feed |
| 12 | Draw mode | `draw.js`, `main.js`, `index.html` | Pinch-to-draw black ink with your fingertip + Clear |

## Modes

- **Orb** — the constellation web-sphere (features 4–7); needs both hands.
- **Web** — a living net strung between your two hands (`webnet.js`); grips each
  hand fingertip→wrist and stretches/tilts as you move, with a center sag + shimmer.
  Needs both hands.
- **Draw** — pinch-to-draw with one hand (`draw.js`); black ink on a frosted canvas
  over the feed, with a ring cursor and a Clear button.

If a mode's required hand(s) aren't visible, a "No hands detected" badge shows and
the visualization fades out.

## Gesture → effect

- **Orb — two hands spread / together** → orb grows / shrinks (`RADIUS_MIN..RADIUS_MAX`)
- **Orb — flick a hand open** (pinch → spread palm) → eruption, then auto-reform
- **Web — two hands spread / together** → the net stretches / gathers
- **Draw — pinch + move** → black ink stroke; release lifts the pen; **Clear** wipes

The gesture math is documented as a reusable skill: [`.claude/skills/mediapipe-hand-gestures`](../.claude/skills/mediapipe-hand-gestures/SKILL.md).

## Tuning

Everything tweakable — particle count, colors, radius range, gesture thresholds, burst/reform timing — lives in [`../src/config.js`](../src/config.js).
