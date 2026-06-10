---
name: mediapipe-hand-gestures
description: Use when deriving high-level gestures (pinch, open palm, flick, two-hand distance/size) from MediaPipe HandLandmarker output in a browser app. Covers the landmark map, depth-robust normalization, and the temporal flick state machine.
---

# MediaPipe hand-gesture math

Turn raw `HandLandmarker` landmarks into stable, depth-independent gesture signals. Reference implementation: [`src/hands.js`](../../../src/hands.js).

## Landmark map (21 points per hand)

```
0 wrist
thumb  1 CMC  2 MCP  3 IP   4 TIP
index  5 MCP  6 PIP  7 DIP  8 TIP
middle 9 MCP 10 PIP 11 DIP 12 TIP
ring  13 MCP 14 PIP 15 DIP 16 TIP
pinky 17 MCP 18 PIP 19 DIP 20 TIP
```

Coordinates are normalized `[0,1]` in the **unmirrored** camera frame (x → right, y → down). If the display video is CSS-mirrored (`scaleX(-1)`), flip x when mapping to screen: `screenX = (1 - x) * width`.

## Core principle: normalize by hand span

Raw pixel/normalized distances change with how close the hand is to the camera. Divide every distance by a **hand span** so signals are depth-robust:

```
handSpan  = dist(wrist[0], middleMCP[9])      // palm size proxy, ≥ epsilon
pinchRatio = dist(thumbTip[4], indexTip[8]) / handSpan
```

- **Palm centroid** (stable under finger motion): `mean(wrist[0], middleMCP[9])`.
- **Finger extended** when its tip is farther from the wrist than its PIP joint:
  `dist(tip, wrist) > dist(pip, wrist)`. Count index/middle/ring/pinky (thumb is unreliable this way).
- **Open palm**: `extendedCount >= 4`. **Pinched/closed**: `pinchRatio < ~0.35`.

## Two-hand size + position

With two hands present:
- **Size** = distance between the two palm centroids, mapped through a clamp:
  `radius = mapRange(handDistance, DIST_MIN, DIST_MAX, RADIUS_MIN, RADIUS_MAX)`.
- **Position** = midpoint of the two centroids.

Always smooth with a per-frame lerp (`cur = lerp(cur, target, k)`) — raw landmarks jitter.

## Pinch-snap = temporal state machine (not a single frame)

A "snap" is an *aggressive full pinch → release within a short window*. It needs memory across frames, keyed by **handedness** (`result.handedness[i][0].categoryName`, `"Left"`/`"Right"`) so each hand fires independently. The short window is what makes it read as aggressive — a slow pinch/release won't fire:

```
per frame, per hand:
  if pinchRatio < PINCH_CLOSE:           // a full pinch
      if pinchedAt unset: pinchedAt[handedness] = now
  else if pinchRatio > PINCH_OPEN:       // released
      if pinchedAt set AND now - pinchedAt <= SNAP_WINDOW_MS
                       AND now - lastBurst >= COOLDOWN_MS:
          SNAP!  lastBurst = now
      clear pinchedAt[handedness]
  expire pinchedAt older than SNAP_WINDOW_MS
  drop handedness keys not present this frame
```

Tunables that matter: `PINCH_CLOSE` (~0.26 ratio = full pinch), `PINCH_OPEN` (~0.55 = released), `SNAP_WINDOW_MS` (~320 — fast = aggressive), `COOLDOWN_MS` (~1000 — debounce repeats).

## Swipe-to-spin (fingertip velocity, not pointing)

To rotate an object by "moving your finger around", drive rotation from the index
fingertip's *screen velocity*, not its pointing vector (a raised hand's pointing
vector barely changes as you move it). Low-pass the velocity into a spin rate and
let it coast: `rate = rate*damp + (Δtip/Δt)*gain*(1-damp)`, apply `rate*dt` per
frame. Δx → yaw, Δy → pitch. `damp = base**(dt*60)` keeps it frame-rate independent.

## Setup gotchas

- Load with `runningMode: 'VIDEO'`, `numHands: 2`, `delegate: 'GPU'`; call `detectForVideo(video, timestampMs)` with a **monotonically increasing** timestamp (`performance.now()`).
- Skip detection when `video.currentTime` hasn't advanced — saves work and avoids duplicate timestamps.
- WASM + model load async; gate the experience behind "ready" and no-op detection until then.
