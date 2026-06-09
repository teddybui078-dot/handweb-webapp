// handweb — entry point.
// Camera stage: clicking "Enable camera" starts the mirrored webcam feed and
// reveals the experience. Hand tracking and the particle web-sphere layer in
// on top of this in subsequent features.

import { startCamera } from './camera.js'

const overlay = document.getElementById('overlay')
const startBtn = document.getElementById('start')
const errorEl = document.getElementById('error')
const hints = document.getElementById('hints')
const video = document.getElementById('camera')

async function begin() {
  startBtn.disabled = true
  errorEl.textContent = ''
  startBtn.textContent = 'Starting…'

  try {
    await startCamera(video)
  } catch (err) {
    errorEl.textContent = err.message || String(err)
    startBtn.disabled = false
    startBtn.textContent = 'Enable camera'
    return
  }

  overlay.classList.add('hidden')
  hints.classList.add('show')
  console.log('[handweb] camera live:', video.videoWidth, 'x', video.videoHeight)
}

startBtn.addEventListener('click', begin)
