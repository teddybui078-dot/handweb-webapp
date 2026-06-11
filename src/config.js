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
  RADIUS_MIN: 0.28, // hands together
  RADIUS_MAX: 1.35, // hands fully spread
  RADIUS_DEFAULT: 0.58, // starting size / when fewer than two hands are visible
  RADIUS_SMOOTHING: 0.07, // lerp factor toward target radius each frame (lower = smoother)
  POSITION_SMOOTHING: 0.1, // lerp factor toward target screen position (lower = smoother)

  // ---- Orb rotation driven by index-finger MOVEMENT (swipe to spin) ----
  ROT_GAIN: 2.4, // fingertip screen-velocity (units/s) -> spin rate (rad/s)
  ROT_MAX: 6, // clamp on spin rate (rad/s)
  ROT_DAMP: 0.91, // inertia: spin coasts and decays when the finger stops (higher = smoother)
  ROT_IDLE: 0.0015, // gentle auto-spin on the dashboard backdrop

  // Per-axis sizing: horizontal hand separation -> width, vertical -> height.
  // Spans are screen fractions; mapped onto [RADIUS_MIN, RADIUS_MAX].
  SIZE_SPAN_MIN: 0.05, // hands close on this axis -> smallest
  SIZE_SPAN_MAX: 0.62, // hands far apart on this axis -> largest

  // ---- Gesture detection ----
  PINCH_THRESHOLD: 0.35, // thumb-index distance / hand-span ratio to count as pinched
  OPEN_FINGERS_REQUIRED: 4, // extended fingers to count as an open palm

  // Burst trigger: a deliberate, aggressive pinch + release (snap).
  PINCH_CLOSE: 0.17, // ratio below this = a tight full pinch (fingers together)
  PINCH_OPEN: 0.62, // ratio above this = clearly released
  SNAP_WINDOW_MS: 300, // pinch -> release must complete this fast to count as a snap
  SNAP_MIN_HOLD_MS: 50, // must stay pinched at least this long (rejects 1-frame jitter)
  BURST_COOLDOWN_MS: 1400, // ignore repeat snaps during this period

  // ---- Landmark smoothing (One-Euro filter) — calms jittery tracking ----
  SMOOTH_MIN_CUTOFF: 1.4, // lower = smoother when the hand is still
  SMOOTH_BETA: 0.5, // higher = less lag when the hand moves fast

  // ---- Burst / reform physics ----
  BURST_SPEED: 9, // outward velocity magnitude (splatters wider across screen)
  BURST_JITTER: 5, // random velocity added per particle
  BURST_DAMPING: 0.95, // per-frame velocity decay
  BURST_DURATION_MS: 1600, // time exploded before reforming begins
  REFORM_SPEED: 0.06, // lerp factor back to base positions
  REFORM_DONE_DIST: 0.02, // avg distance under which reform is "complete"

  // ---- Camera / world ----
  CAMERA_Z: 6, // three.js camera distance

  // ---- Web mode (a 3D spider web strung between the two hands) ----
  NET_RINGS: 11, // concentric rings from the hub out to each fingertip (denser web)
  NET_SUBSPOKES: 2, // interpolated spokes inserted between each fingertip pair (more spokes)
  NET_WAVE_AMP: 0.7, // z-depth ripple amplitude (world units) — makes it undulate
  NET_WAVE_SPEED: 2.6, // how fast the ripple travels outward
  NET_WAVES: 2.5, // number of wave crests along each spoke
  NET_SHIMMER: 0.05, // small per-node xy wiggle
  NET_SWIRL_AMP: 0.6, // mid-spoke twist (radians) — spokes wind/unwind over time
  NET_SWIRL_SPEED: 1.1, // swirl oscillation speed
  NET_PULSE_AMP: 0.07, // radial breathing of the rings
  NET_PULSE_SPEED: 1.7, // breathing speed
  NET_POINT_SIZE: 13, // node sprite size
  NET_LINE_OPACITY: 0.5, // strand brightness
  NET_SMOOTHING: 0.3, // lerp toward the live hand-driven web each frame

  // ---- Hand skeleton overlay (Orb / Web modes) ----
  HAND_LINE_OPACITY: 0.85,
  HAND_LINE_WIDTH: 2,
  HAND_JOINT_SIZE: 3,
}
