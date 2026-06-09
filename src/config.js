// Central tunables for the handweb experience. Tweak here, no logic elsewhere.

export const CONFIG = {
  // ---- Particles ----
  PARTICLE_COUNT: 4000, // points on the sphere shell
  PARTICLE_SIZE: 9, // base sprite size (px-ish, scaled by renderer)
  // emerald -> white ramp
  COLOR_INNER: '#ffffff',
  COLOR_OUTER: '#2ee6a6',
  COLOR_MIX: 0.55, // 0 = all outer, 1 = all inner

  // ---- Web (constellation) lines ----
  WEB_NEIGHBORS: 3, // edges per particle (k-nearest on the base sphere)
  WEB_OPACITY: 0.18,
  WEB_COLOR: '#34e89e',

  // ---- Sphere sizing (world units) ----
  RADIUS_MIN: 0.7, // hands together
  RADIUS_MAX: 2.6, // hands fully spread
  RADIUS_DEFAULT: 1.4, // when fewer than two hands are visible
  RADIUS_SMOOTHING: 0.12, // lerp factor toward target radius each frame
  POSITION_SMOOTHING: 0.18, // lerp factor toward target screen position

  // Map normalized hand-distance [DIST_MIN, DIST_MAX] -> [RADIUS_MIN, RADIUS_MAX]
  DIST_MIN: 0.12, // hands basically touching (fraction of frame width)
  DIST_MAX: 0.75, // hands spread wide

  // ---- Gesture detection ----
  PINCH_THRESHOLD: 0.35, // thumb-index distance / hand-span ratio to count as pinched
  OPEN_FINGERS_REQUIRED: 4, // extended fingers to count as an open palm
  FLICK_WINDOW_MS: 450, // pinch -> open must happen within this window
  BURST_COOLDOWN_MS: 1200, // ignore repeat flicks during this period

  // ---- Burst / reform physics ----
  BURST_SPEED: 5.5, // outward velocity magnitude
  BURST_JITTER: 2.2, // random velocity added per particle
  BURST_DAMPING: 0.94, // per-frame velocity decay
  BURST_DURATION_MS: 1600, // time exploded before reforming begins
  REFORM_SPEED: 0.06, // lerp factor back to base positions
  REFORM_DONE_DIST: 0.02, // avg distance under which reform is "complete"

  // ---- Camera / world ----
  CAMERA_Z: 6, // three.js camera distance
}
