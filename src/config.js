// Central tunables for the handweb experience. Tweak here, no logic elsewhere.

export const CONFIG = {
  // ---- Particles ----
  PARTICLE_COUNT: 8000, // points on the sphere shell (denser eruption)
  PARTICLE_SIZE: 9, // base sprite size (px-ish, scaled by renderer)
  // monochrome: soft gray -> white ramp (twinkle without color)
  COLOR_INNER: '#ffffff',
  COLOR_OUTER: '#cfcfcf',
  COLOR_MIX: 0.6, // 0 = all outer, 1 = all inner

  // ---- Web (constellation) lines ----
  WEB_NEIGHBORS: 3, // edges per particle (k-nearest on the base sphere)
  WEB_OPACITY: 0.16,
  WEB_COLOR: '#ffffff',

  // ---- Sphere sizing (world units) ----
  RADIUS_MIN: 0.45, // hands together
  RADIUS_MAX: 1.9, // hands fully spread
  RADIUS_DEFAULT: 0.85, // starting size / when fewer than two hands are visible
  RADIUS_SMOOTHING: 0.12, // lerp factor toward target radius each frame
  POSITION_SMOOTHING: 0.18, // lerp factor toward target screen position

  // ---- Orb rotation driven by index-finger MOVEMENT (swipe to spin) ----
  ROT_GAIN: 2.6, // fingertip screen-velocity (units/s) -> spin rate (rad/s)
  ROT_MAX: 7, // clamp on spin rate (rad/s)
  ROT_DAMP: 0.86, // inertia: spin coasts and decays when the finger stops
  ROT_IDLE: 0.0015, // gentle auto-spin on the dashboard backdrop

  // Map normalized hand-distance [DIST_MIN, DIST_MAX] -> [RADIUS_MIN, RADIUS_MAX]
  DIST_MIN: 0.12, // hands basically touching (fraction of frame width)
  DIST_MAX: 0.75, // hands spread wide

  // ---- Gesture detection ----
  PINCH_THRESHOLD: 0.35, // thumb-index distance / hand-span ratio to count as pinched
  OPEN_FINGERS_REQUIRED: 4, // extended fingers to count as an open palm

  // Burst trigger: an aggressive pinch + release (snap).
  PINCH_CLOSE: 0.26, // ratio below this = a full pinch (fingers together)
  PINCH_OPEN: 0.55, // ratio above this = released
  SNAP_WINDOW_MS: 320, // pinch -> release must complete this fast to count as a snap
  BURST_COOLDOWN_MS: 1000, // ignore repeat snaps during this period

  // ---- Burst / reform physics ----
  BURST_SPEED: 5.5, // outward velocity magnitude
  BURST_JITTER: 2.2, // random velocity added per particle
  BURST_DAMPING: 0.94, // per-frame velocity decay
  BURST_DURATION_MS: 1600, // time exploded before reforming begins
  REFORM_SPEED: 0.06, // lerp factor back to base positions
  REFORM_DONE_DIST: 0.02, // avg distance under which reform is "complete"

  // ---- Camera / world ----
  CAMERA_Z: 6, // three.js camera distance

  // ---- Web mode (net strung between the two hands) ----
  NET_COLS: 14, // grid resolution across the gap (hand A -> hand B)
  NET_ROWS: 8, // grid resolution along each hand (top -> bottom)
  NET_SAG: 0.55, // how much the net bows downward at its center (world units)
  NET_SHIMMER: 0.05, // per-node time-based wobble amplitude
  NET_POINT_SIZE: 11, // node sprite size
  NET_LINE_OPACITY: 0.32,
  NET_SMOOTHING: 0.35, // lerp toward the live hand-driven net each frame

  // ---- Draw mode (pinch to draw with your fingertip) ----
  DRAW_INK: '#1d1d1f', // Apple near-black ink
  DRAW_WIDTH: 4, // stroke width (CSS px)
  DRAW_SMOOTHING: 0.5, // fingertip position smoothing (0..1, higher = snappier)
  DRAW_MIN_DIST: 1.5, // min px between recorded points (de-jitter)
  DRAW_PINCH: 0.22, // require a FULL pinch (ratio below this) to put the pen down
}
