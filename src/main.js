// handweb — entry point.
// Scaffold stage: wires the start button and overlay. Camera, hand tracking,
// and the particle web-sphere are layered in by subsequent features.

const overlay = document.getElementById('overlay')
const startBtn = document.getElementById('start')
const errorEl = document.getElementById('error')

startBtn.addEventListener('click', () => {
  errorEl.textContent = ''
  overlay.classList.add('hidden')
  console.log('[handweb] start pressed — features wire in here')
})
