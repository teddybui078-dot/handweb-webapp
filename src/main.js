// handweb — entry point.
// Camera + hand-tracking stage: starts the mirrored webcam, loads the
// MediaPipe HandLandmarker, and runs a per-frame detection loop. Press "d" to
// toggle a debug overlay of the tracked landmarks. The particle web-sphere
// layers onto this loop in the next feature.

import { startCamera } from './camera.js'
import { HandTracker, drawDebug } from './hands.js'
import { WebSphere } from './sphere.js'
import { CONFIG } from './config.js'

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

function loop() {
  requestAnimationFrame(loop)
  const hands = tracker.detect(video, performance.now())

  // Feature 4: render a gently rotating web-sphere at the default radius,
  // centered on screen. Hand-driven radius/position arrives in the next feature.
  sphere.applyRadius(CONFIG.RADIUS_DEFAULT)
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
