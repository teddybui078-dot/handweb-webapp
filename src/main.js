// handweb — entry point.
// Camera + hand-tracking stage: starts the mirrored webcam, loads the
// MediaPipe HandLandmarker, and runs a per-frame detection loop. Press "d" to
// toggle a debug overlay of the tracked landmarks. The particle web-sphere
// layers onto this loop in the next feature.

import { startCamera } from './camera.js'
import { HandTracker, drawDebug, handDistance, handsMidpoint } from './hands.js'
import { WebSphere } from './sphere.js'
import { CONFIG } from './config.js'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const lerp = (a, b, t) => a + (b - a) * t
const mapRange = (v, inLo, inHi, outLo, outHi) =>
  outLo + ((clamp(v, inLo, inHi) - inLo) / (inHi - inLo)) * (outHi - outLo)

const overlay = document.getElementById('overlay')
const startBtn = document.getElementById('start')
const errorEl = document.getElementById('error')
const hints = document.getElementById('hints')
const video = document.getElementById('camera')
const sceneCanvas = document.getElementById('scene')

const tracker = new HandTracker()
const sphere = new WebSphere(sceneCanvas)
let debug = false

// 2D canvas overlay used only for the debug landmark view.
const debugCanvas = document.createElement('canvas')
debugCanvas.style.cssText =
  'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:4;display:none'
document.body.appendChild(debugCanvas)
const debugCtx = debugCanvas.getContext('2d')

function resize() {
  debugCanvas.width = window.innerWidth
  debugCanvas.height = window.innerHeight
}
window.addEventListener('resize', resize)
resize()

window.addEventListener('keydown', (e) => {
  if (e.key === 'd') {
    debug = !debug
    debugCanvas.style.display = debug ? 'block' : 'none'
  }
})

// Smoothed orb state, eased toward hand-driven targets each frame.
let curRadius = CONFIG.RADIUS_DEFAULT
let curX = 0
let curY = 0

/**
 * Turn the tracked hands into a target radius + screen position.
 * Two hands → distance sets size, midpoint sets position.
 * One hand → follow it, hold size. No hands → drift back to center/default.
 */
function targetsFromHands(hands) {
  if (hands.length >= 2) {
    const d = handDistance(hands[0], hands[1])
    const radius = mapRange(d, CONFIG.DIST_MIN, CONFIG.DIST_MAX, CONFIG.RADIUS_MIN, CONFIG.RADIUS_MAX)
    const mid = handsMidpoint(hands[0], hands[1])
    return { radius, nx: mid.x, ny: mid.y }
  }
  if (hands.length === 1) {
    return { radius: curRadius, nx: hands[0].centroid.x, ny: hands[0].centroid.y }
  }
  return { radius: CONFIG.RADIUS_DEFAULT, nx: 0.5, ny: 0.5 }
}

function loop() {
  requestAnimationFrame(loop)
  const hands = tracker.detect(video, performance.now())

  const t = targetsFromHands(hands)
  curRadius = lerp(curRadius, t.radius, CONFIG.RADIUS_SMOOTHING)

  // The display video is mirrored, so flip x. Convert normalized screen coords
  // to NDC, then to world space on the z=0 plane.
  const ndcX = (1 - t.nx) * 2 - 1
  const ndcY = -(t.ny * 2 - 1)
  const world = sphere.ndcToWorld(ndcX, ndcY)
  curX = lerp(curX, world.x, CONFIG.POSITION_SMOOTHING)
  curY = lerp(curY, world.y, CONFIG.POSITION_SMOOTHING)

  sphere.applyRadius(curRadius)
  sphere.setWorldPosition(curX, curY, 0)
  sphere.flushPoints()
  sphere.syncLines()
  sphere.render(0.0015)

  if (debug) drawDebug(debugCtx, hands, debugCanvas.width, debugCanvas.height)
}

async function begin() {
  startBtn.disabled = true
  errorEl.textContent = ''
  startBtn.textContent = 'Starting…'

  try {
    await startCamera(video)
    startBtn.textContent = 'Loading hand tracking…'
    await tracker.init()
  } catch (err) {
    errorEl.textContent = err.message || String(err)
    startBtn.disabled = false
    startBtn.textContent = 'Enable camera'
    return
  }

  overlay.classList.add('hidden')
  hints.classList.add('show')
  console.log('[handweb] camera + hand tracking live')
}

startBtn.addEventListener('click', begin)

// Render the idle web-sphere immediately (behind the overlay). tracker.detect()
// safely no-ops until the camera + landmarker are started by begin().
loop()
